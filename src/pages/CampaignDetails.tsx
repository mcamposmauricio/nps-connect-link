import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, User, Building2, Code2, Download } from "lucide-react";
import { exportToCSV } from "@/lib/utils";
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
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedEmbedToken, setCopiedEmbedToken] = useState<string | null>(null);
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
      setCampaignContacts(contactsData || []);
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

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Contatos da Campanha ({campaignContacts.length})
            </h2>
            {campaignContacts.length > 0 && (
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            )}
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignContacts.map((cc) => (
                    <TableRow key={cc.id}>
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
                        <span className="text-sm">{cc.contacts.phone || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {cc.contacts.company_document || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {cc.contacts.company_sector || "-"}
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
    </Layout>
  );
};

export default CampaignDetails;
