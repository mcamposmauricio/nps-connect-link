import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, User, Building2, Code2, Download, Mail, Trash2, Send } from "lucide-react";
import { exportToCSV } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_company: boolean;
  company_document: string | null;
  company_sector: string | null;
}

interface CampaignContact {
  id: string;
  link_token: string;
  contact_id: string;
  email_sent: boolean;
  email_sent_at: string | null;
  contacts: Contact;
}

interface CampaignStats {
  total: number;
  sent: number;
  responded: number;
  pending: number;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  created_at: string;
}

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedEmbedToken, setCopiedEmbedToken] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStats>({ total: 0, sent: 0, responded: 0, pending: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaignDetails();
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch campaign contacts with contact details
      const { data: contactsData, error: contactsError } = await supabase
        .from("campaign_contacts")
        .select(`
          id,
          link_token,
          contact_id,
          email_sent,
          email_sent_at,
          contacts (
            id,
            name,
            email,
            phone,
            is_company,
            company_document,
            company_sector
          )
        `)
        .eq("campaign_id", id);

      if (contactsError) throw contactsError;
      const contacts = contactsData || [];
      setCampaignContacts(contacts);

      // Fetch response stats
      const { data: responsesData } = await supabase
        .from("responses")
        .select("contact_id")
        .eq("campaign_id", id);

      const respondedContactIds = new Set(responsesData?.map(r => r.contact_id) || []);
      
      // Calculate stats
      const total = contacts.length;
      const sent = contacts.filter(c => c.email_sent).length;
      const responded = contacts.filter(c => respondedContactIds.has(c.contact_id)).length;
      const pending = total - sent;
      
      setStats({ total, sent, responded, pending });
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

  const generateLink = (token: string) => {
    return `${window.location.origin}/nps/${token}`;
  };

  const generateEmbedCode = (token: string) => {
    const link = generateLink(token);
    return `<iframe src="${link}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const copyLink = (token: string) => {
    const link = generateLink(token);
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({
      title: "Link copiado!",
      description: "Link individual copiado para área de transferência.",
    });
  };

  const copyEmbedCode = (token: string) => {
    const embedCode = generateEmbedCode(token);
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbedToken(token);
    setTimeout(() => setCopiedEmbedToken(null), 2000);
    toast({
      title: "Código embed copiado!",
      description: "Código de incorporação copiado para área de transferência.",
    });
  };

  const handleExportCSV = () => {
    const csvData = campaignContacts.map((cc) => ({
      "Tipo": cc.contacts.is_company ? "Empresa" : "Pessoa",
      "Nome": cc.contacts.name,
      "Email": cc.contacts.email,
      "Telefone": cc.contacts.phone || "",
      "Documento": cc.contacts.company_document || "",
      "Setor": cc.contacts.company_sector || "",
      "Link NPS": generateLink(cc.link_token),
      "Código Embed": generateEmbedCode(cc.link_token),
    }));
    exportToCSV(csvData, `campanha_${campaign?.name || 'contatos'}`);
    toast({
      title: "CSV exportado!",
      description: "Arquivo baixado com sucesso.",
    });
  };

  const sendNPSReminder = async (contactId: string) => {
    const campaignContact = campaignContacts.find(cc => cc.contact_id === contactId);
    if (!campaignContact || !campaign) return;

    setSendingEmail(contactId);
    
    try {
      // Fetch brand settings for company name
      const { data: { user } } = await supabase.auth.getUser();
      const { data: brandSettings } = await supabase
        .from("brand_settings")
        .select("company_name")
        .eq("user_id", user?.id)
        .single();

      const { error } = await supabase.functions.invoke("send-nps-reminder", {
        body: {
          contactName: campaignContact.contacts.name,
          contactEmail: campaignContact.contacts.email,
          campaignName: campaign.name,
          campaignMessage: campaign.message,
          npsLink: generateLink(campaignContact.link_token),
          companyName: brandSettings?.company_name || undefined,
        },
      });

      if (error) throw error;

      // Update email_sent status
      await supabase
        .from("campaign_contacts")
        .update({ 
          email_sent: true, 
          email_sent_at: new Date().toISOString() 
        })
        .eq("id", campaignContact.id);

      toast({
        title: "E-mail enviado!",
        description: `Lembrete enviado para ${campaignContact.contacts.name}`,
      });

      // Refresh data
      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingEmail(null);
    }
  };

  const sendBulkReminders = async () => {
    if (selectedContacts.length === 0) return;

    setSendingBulk(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: brandSettings } = await supabase
        .from("brand_settings")
        .select("company_name")
        .eq("user_id", user?.id)
        .single();

      for (const contactId of selectedContacts) {
        const campaignContact = campaignContacts.find(cc => cc.contact_id === contactId);
        if (!campaignContact || !campaign) continue;

        try {
          const { error } = await supabase.functions.invoke("send-nps-reminder", {
            body: {
              contactName: campaignContact.contacts.name,
              contactEmail: campaignContact.contacts.email,
              campaignName: campaign.name,
              campaignMessage: campaign.message,
              npsLink: generateLink(campaignContact.link_token),
              companyName: brandSettings?.company_name || undefined,
            },
          });

          if (error) throw error;

          // Update email_sent status
          await supabase
            .from("campaign_contacts")
            .update({ 
              email_sent: true, 
              email_sent_at: new Date().toISOString() 
            })
            .eq("id", campaignContact.id);

          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error sending to ${campaignContact.contacts.email}:`, error);
        }
      }

      toast({
        title: "Envio em massa concluído",
        description: `${successCount} e-mails enviados com sucesso${errorCount > 0 ? `, ${errorCount} falharam` : ''}`,
      });

      setSelectedContacts([]);
      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: "Erro no envio em massa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingBulk(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    const campaignContact = campaignContacts.find(cc => cc.id === contactId);
    if (!campaignContact) return;

    try {
      const { error } = await supabase
        .from("campaign_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      toast({
        title: "Contato removido",
        description: "Contato removido da campanha com sucesso",
      });

      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: "Erro ao remover contato",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setContactToDelete(null);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === campaignContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(campaignContacts.map(cc => cc.contact_id));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Campanha não encontrada.</p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2">{campaign.name}</h1>
              <p className="text-muted-foreground">{campaign.message}</p>
            </div>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Total de Contatos</div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">E-mails Enviados</div>
            <div className="text-3xl font-bold text-blue-600">{stats.sent}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Responderam</div>
            <div className="text-3xl font-bold text-green-600">{stats.responded}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Pendentes</div>
            <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Contatos da Campanha ({campaignContacts.length})
            </h2>
            <div className="flex gap-2">
              {selectedContacts.length > 0 && (
                <Button 
                  onClick={sendBulkReminders} 
                  disabled={sendingBulk}
                  size="sm"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendingBulk ? "Enviando..." : `Enviar para ${selectedContacts.length}`}
                </Button>
              )}
              {campaignContacts.length > 0 && (
                <Button onClick={handleExportCSV} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              )}
            </div>
          </div>
          
          {campaignContacts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum contato adicionado a esta campanha ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedContacts.length === campaignContacts.length && campaignContacts.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignContacts.map((cc) => (
                    <TableRow key={cc.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.includes(cc.contact_id)}
                          onCheckedChange={() => toggleContactSelection(cc.contact_id)}
                        />
                      </TableCell>
                      <TableCell>
                        {cc.contacts.is_company ? (
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-xs">Empresa</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs">Pessoa</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{cc.contacts.name}</TableCell>
                      <TableCell>
                        <span className="text-sm">{cc.contacts.email}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          cc.email_sent 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {cc.email_sent ? "Enviado" : "Pendente"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {cc.email_sent_at 
                            ? new Date(cc.email_sent_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyLink(cc.link_token)}
                          >
                            {copiedToken === cc.link_token ? (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 h-4 w-4" />
                                Link
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyEmbedCode(cc.link_token)}
                          >
                            {copiedEmbedToken === cc.link_token ? (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Code2 className="mr-2 h-4 w-4" />
                                Embed
                              </>
                            )}
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => sendNPSReminder(cc.contact_id)}
                            disabled={sendingEmail === cc.contact_id || cc.email_sent}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            {sendingEmail === cc.contact_id ? "Enviando..." : cc.email_sent ? "Enviado" : "Enviar"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setContactToDelete(cc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contato da campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o contato desta campanha e excluirá o link gerado. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => contactToDelete && handleDeleteContact(contactToDelete)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default CampaignDetails;
