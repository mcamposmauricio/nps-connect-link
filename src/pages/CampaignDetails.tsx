import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, User, Building2, Code2, Download, Mail, Trash2, Send, Users, TrendingUp, BarChart3, MessageSquare } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  avgScore: number;
  nps: number;
}

interface Response {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  contact_id: string;
  contacts: Contact;
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
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedEmbedToken, setCopiedEmbedToken] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStats>({ total: 0, sent: 0, responded: 0, pending: 0, avgScore: 0, nps: 0 });
  const [addContactsDialogOpen, setAddContactsDialogOpen] = useState(false);
  const [selectedNewContactIds, setSelectedNewContactIds] = useState<string[]>([]);
  const [addingContacts, setAddingContacts] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaignDetails();
    fetchAllContacts();
    fetchResponses();
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
      
      // Calculate average score and NPS
      let avgScore = 0;
      let nps = 0;
      
      if (responsesData && responsesData.length > 0) {
        const { data: scoresData } = await supabase
          .from("responses")
          .select("score")
          .eq("campaign_id", id);
        
        if (scoresData && scoresData.length > 0) {
          const scores = scoresData.map(r => r.score);
          avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          
          // Calculate NPS (Net Promoter Score)
          const promoters = scores.filter(s => s >= 9).length;
          const detractors = scores.filter(s => s <= 6).length;
          nps = ((promoters - detractors) / scores.length) * 100;
        }
      }
      
      setStats({ total, sent, responded, pending, avgScore, nps });
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

  const fetchAllContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, phone, is_company, company_document, company_sector")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setAllContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
    }
  };

  const openAddContactsDialog = () => {
    setSelectedNewContactIds([]);
    setAddContactsDialogOpen(true);
  };

  const handleNewContactToggle = (contactId: string) => {
    setSelectedNewContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleAddNewContacts = async () => {
    if (!id || selectedNewContactIds.length === 0) return;
    setAddingContacts(true);

    try {
      const inserts = selectedNewContactIds.map((contactId) => ({
        campaign_id: id,
        contact_id: contactId,
      }));

      const { error } = await supabase
        .from("campaign_contacts")
        .insert(inserts);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `${selectedNewContactIds.length} contato(s) adicionado(s) à campanha.`,
      });

      setAddContactsDialogOpen(false);
      setSelectedNewContactIds([]);
      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAddingContacts(false);
    }
  };

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from("responses")
        .select(`
          id,
          score,
          comment,
          responded_at,
          contact_id,
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
        .eq("campaign_id", id)
        .order("responded_at", { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error: any) {
      console.error("Error fetching responses:", error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-success/10 text-success border-success/20";
    if (score >= 7) return "bg-warning/10 text-warning border-warning/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Promotor";
    if (score >= 7) return "Neutro";
    return "Detrator";
  };

  const availableContacts = allContacts.filter(
    contact => !campaignContacts.some(cc => cc.contact_id === contact.id)
  );

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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <BarChart3 className="h-4 w-4" />
              <span>Total</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Mail className="h-4 w-4" />
              <span>Enviados</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <MessageSquare className="h-4 w-4" />
              <span>Respostas</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.responded}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Mail className="h-4 w-4" />
              <span>Pendentes</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>Média</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : "-"}
            </div>
          </Card>
          <Card className="p-4">
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
              <Button onClick={openAddContactsDialog} variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Adicionar Contatos
              </Button>
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

        {/* Respostas da Campanha */}
        {responses.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Respostas Recebidas ({responses.length})
            </h2>
            <div className="space-y-4">
              {responses.map((response) => (
                <div key={response.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{response.contacts.name}</h4>
                        <span className="text-sm text-muted-foreground">{response.contacts.email}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Respondido em {new Date(response.responded_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg border ${getScoreColor(response.score)}`}>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{response.score}</div>
                        <div className="text-xs">{getScoreLabel(response.score)}</div>
                      </div>
                    </div>
                  </div>
                  {response.comment && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm italic">&ldquo;{response.comment}&rdquo;</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
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

      <Dialog open={addContactsDialogOpen} onOpenChange={setAddContactsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Contatos à Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableContacts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {allContacts.length === 0 
                  ? "Você ainda não tem contatos cadastrados."
                  : "Todos os seus contatos já estão nesta campanha."}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {availableContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleNewContactToggle(contact.id)}
                    >
                      <Checkbox
                        checked={selectedNewContactIds.includes(contact.id)}
                        onCheckedChange={() => handleNewContactToggle(contact.id)}
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
                  onClick={handleAddNewContacts}
                  className="w-full"
                  disabled={addingContacts || selectedNewContactIds.length === 0}
                >
                  {addingContacts
                    ? "Adicionando..."
                    : `Adicionar ${selectedNewContactIds.length} Contato(s)`}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CampaignDetails;
