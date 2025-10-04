import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, User, Building2 } from "lucide-react";
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
            is_company
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
          <h2 className="text-2xl font-semibold mb-4">
            Contatos da Campanha ({campaignContacts.length})
          </h2>
          
          {campaignContacts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum contato adicionado a esta campanha ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Link Individual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignContacts.map((cc) => (
                  <TableRow key={cc.id}>
                    <TableCell>
                      {cc.contacts.is_company ? (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{cc.contacts.name}</TableCell>
                    <TableCell>{cc.contacts.email}</TableCell>
                    <TableCell>{cc.contacts.phone || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(cc.link_token)}
                      >
                        {copiedToken === cc.link_token ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copiar Link
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default CampaignDetails;
