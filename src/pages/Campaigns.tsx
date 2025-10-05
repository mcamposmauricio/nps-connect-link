import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Download, TrendingUp, Mail, MessageSquare, BarChart3 } from "lucide-react";

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

interface CampaignMetrics {
  total: number;
  sent: number;
  responded: number;
  avgScore: number;
  nps: number;
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
  const [campaignMetrics, setCampaignMetrics] = useState<Record<string, CampaignMetrics>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", message: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
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

      // Fetch metrics for each campaign
      if (data) {
        const metrics: Record<string, CampaignMetrics> = {};
        
        for (const campaign of data) {
          // Get campaign contacts
          const { data: contactsData } = await supabase
            .from("campaign_contacts")
            .select("id, contact_id, email_sent")
            .eq("campaign_id", campaign.id);

          const total = contactsData?.length || 0;
          const sent = contactsData?.filter(c => c.email_sent).length || 0;

          // Get responses
          const { data: responsesData } = await supabase
            .from("responses")
            .select("score, contact_id")
            .eq("campaign_id", campaign.id);

          const responded = responsesData?.length || 0;
          
          // Calculate average score and NPS
          let avgScore = 0;
          let nps = 0;
          
          if (responsesData && responsesData.length > 0) {
            const scores = responsesData.map(r => r.score);
            avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            
            // Calculate NPS (Net Promoter Score)
            const promoters = scores.filter(s => s >= 9).length;
            const detractors = scores.filter(s => s <= 6).length;
            nps = ((promoters - detractors) / scores.length) * 100;
          }

          metrics[campaign.id] = { total, sent, responded, avgScore, nps };
        }
        
        setCampaignMetrics(metrics);
      }
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
            {campaigns.map((campaign) => {
              const metrics = campaignMetrics[campaign.id];
              return (
                <Card key={campaign.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{campaign.name}</h3>
                      <p className="text-muted-foreground text-sm">{campaign.message}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ml-4 ${
                        campaign.status === "sent"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {campaign.status === "sent" ? "Enviada" : "Rascunho"}
                    </span>
                  </div>

                  {metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <BarChart3 className="h-3 w-3" />
                          <span>Total</span>
                        </div>
                        <div className="text-2xl font-bold">{metrics.total}</div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <Mail className="h-3 w-3" />
                          <span>Enviados</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{metrics.sent}</div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>Responderam</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">{metrics.responded}</div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>Nota Média</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                          {metrics.avgScore > 0 ? metrics.avgScore.toFixed(1) : "-"}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>NPS</span>
                        </div>
                        <div className={`text-2xl font-bold ${
                          metrics.nps > 0 ? "text-green-600" : metrics.nps < 0 ? "text-red-600" : "text-gray-600"
                        }`}>
                          {metrics.responded > 0 ? `${metrics.nps.toFixed(0)}%` : "-"}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Criada em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Campaigns;
