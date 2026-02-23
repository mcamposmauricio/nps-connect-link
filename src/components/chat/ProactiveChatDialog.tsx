import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  company_id: string;
  chat_visitor_id: string | null;
}

interface ProactiveChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  attendantId: string;
  attendantName: string;
}

const ProactiveChatDialog = ({ open, onOpenChange, userId, attendantId, attendantName }: ProactiveChatDialogProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("contacts")
      .select("id, name")
      .eq("is_company", true)
      .order("name")
      .then(({ data }) => setCompanies(data ?? []));
  }, [open]);

  useEffect(() => {
    if (!selectedCompanyId) { setContacts([]); return; }
    supabase
      .from("company_contacts")
      .select("id, name, email, company_id, chat_visitor_id")
      .eq("company_id", selectedCompanyId)
      .order("name")
      .then(({ data }) => setContacts(data ?? []));
  }, [selectedCompanyId]);

  const handleCreate = async () => {
    if (!selectedContactId || !message.trim()) return;
    setCreating(true);

    const contact = contacts.find((c) => c.id === selectedContactId);
    if (!contact) { setCreating(false); return; }

    try {
      // Get or create visitor
      let visitorId: string | null = null;

      if (contact.chat_visitor_id) {
        const { data: existing } = await supabase
          .from("chat_visitors")
          .select("id")
          .eq("id", contact.chat_visitor_id)
          .maybeSingle();
        if (existing) visitorId = existing.id;
      }

      // Fallback: search by company_contact_id in chat_visitors
      if (!visitorId) {
        const { data: byContact } = await supabase
          .from("chat_visitors")
          .select("id")
          .eq("company_contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (byContact) {
          visitorId = byContact.id;
          await supabase
            .from("company_contacts")
            .update({ chat_visitor_id: visitorId })
            .eq("id", contact.id);
        }
      }

      // Create new visitor if none found
      if (!visitorId) {
        const { data: visitor } = await supabase
          .from("chat_visitors")
          .insert({
            name: contact.name,
            email: contact.email,
            owner_user_id: userId,
            company_contact_id: contact.id,
            contact_id: contact.company_id,
          })
          .select("id")
          .single();

        if (!visitor) throw new Error("Failed to create visitor");
        visitorId = visitor.id;

        await supabase
          .from("company_contacts")
          .update({ chat_visitor_id: visitorId })
          .eq("id", contact.id);
      }

      // Create room
      const { data: room } = await supabase
        .from("chat_rooms")
        .insert({
          visitor_id: visitorId,
          owner_user_id: userId,
          attendant_id: attendantId,
          company_contact_id: contact.id,
          contact_id: contact.company_id,
          status: "active",
          assigned_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!room) throw new Error("Failed to create room");

      // Increment attendant active_conversations
      const { data: attProfile } = await supabase
        .from("attendant_profiles")
        .select("active_conversations")
        .eq("id", attendantId)
        .maybeSingle();

      if (attProfile) {
        await supabase
          .from("attendant_profiles")
          .update({ active_conversations: (attProfile.active_conversations ?? 0) + 1 })
          .eq("id", attendantId);
      }

      // Insert initial message
      await supabase.from("chat_messages").insert({
        room_id: room.id,
        sender_type: "attendant",
        sender_id: userId,
        sender_name: attendantName,
        content: message.trim(),
      });

      toast.success("Chat proativo criado com sucesso!");
      onOpenChange(false);
      setSelectedCompanyId("");
      setSelectedContactId("");
      setMessage("");
    } catch {
      toast.error("Erro ao criar chat proativo");
    }

    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Novo Chat Proativo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={selectedCompanyId} onValueChange={(v) => { setSelectedCompanyId(v); setSelectedContactId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCompanyId && (
            <div className="space-y-2">
              <Label>Contato</Label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contato" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem inicial</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá! Gostaria de verificar como está..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={creating || !selectedContactId || !message.trim()}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Iniciar Conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProactiveChatDialog;
