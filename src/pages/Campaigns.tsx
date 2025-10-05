import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Eye, Check, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToCSV } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  created_at: string;
  sent_at: string | null;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  is_company: boolean;
}

const Campaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactsDialogOpen, setContactsDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: "", message: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("campaigns").insert({
        user_id: user.id,
        name: formData.name,
        message: formData.message,
        status: "draft",
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Campanha criada com sucesso.",
      });

      setFormData({ name: "", message: "" });
      setDialogOpen(false);
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, is_company")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openContactsDialog = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setSelectedContactIds([]);
    setContactsDialogOpen(true);
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleAddContacts = async () => {
    if (!selectedCampaignId || selectedContactIds.length === 0) return;
    setSaving(true);

    try {
      const inserts = selectedContactIds.map((contactId) => ({
        campaign_id: selectedCampaignId,
        contact_id: contactId,
      }));

      const { error } = await supabase
        .from("campaign_contacts")
        .insert(inserts);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `${selectedContactIds.length} contato(s) adicionado(s) à campanha.`,
      });

      setContactsDialogOpen(false);
      setSelectedContactIds([]);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const csvData = campaigns.map((campaign) => ({
      "Nome": campaign.name,
      "Mensagem": campaign.message,
      "Status": campaign.status === "sent" ? "Enviada" : "Rascunho",
      "Data de Criação": new Date(campaign.created_at).toLocaleDateString("pt-BR"),
      "Data de Envio": campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString("pt-BR") : "",
    }));
    exportToCSV(csvData, "campanhas");
    toast({
      title: "CSV exportado!",
      description: "Arquivo baixado com sucesso.",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Campanhas</h1>
            <p className="text-muted-foreground">Crie e gerencie suas pesquisas de NPS</p>
          </div>

          <div className="flex gap-2">
            {campaigns.length > 0 && (
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Campanha
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Campanha</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome da Campanha</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Pesquisa Q1 2024"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Mensagem</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Como você avaliaria nosso serviço?"
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvando..." : "Criar Campanha"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Dialog open={contactsDialogOpen} onOpenChange={setContactsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Contatos à Campanha</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {contacts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Você ainda não tem contatos cadastrados.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleContactToggle(contact.id)}
                        >
                          <Checkbox
                            checked={selectedContactIds.includes(contact.id)}
                            onCheckedChange={() => handleContactToggle(contact.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {contact.is_company ? "Empresa" : "Pessoa"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleAddContacts}
                      className="w-full"
                      disabled={saving || selectedContactIds.length === 0}
                    >
                      {saving
                        ? "Adicionando..."
                        : `Adicionar ${selectedContactIds.length} Contato(s)`}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhuma campanha criada ainda.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{campaign.name}</h3>
                    <p className="text-muted-foreground">{campaign.message}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      campaign.status === "sent"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {campaign.status === "sent" ? "Enviada" : "Rascunho"}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => openContactsDialog(campaign.id)}>
                    <Users className="mr-2 h-4 w-4" />
                    Adicionar Contatos
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  Criada em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Campaigns;
