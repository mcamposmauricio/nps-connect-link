import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Download, TrendingUp, Mail, MessageSquare, BarChart3, Edit, Calendar, Clock, RefreshCw } from "lucide-react";
import { getStatusLabel, getStatusColor, getCycleLabel, formatDate } from "@/utils/campaignUtils";

import { exportToCSV } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CampaignForm } from "@/components/CampaignForm";

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  campaign_type: 'manual' | 'automatic';
  start_date: string | null;
  cycle_type: 'weekly' | 'biweekly' | null;
  attempts_total: number | null;
  attempt_current: number;
  next_send: string | null;
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
      
      // Sort to put cancelled campaigns at the end
      const sortedData = data?.sort((a, b) => {
        if (a.status === 'cancelled' && b.status !== 'cancelled') return 1;
        if (a.status !== 'cancelled' && b.status === 'cancelled') return -1;
        return 0;
      });

      if (error) throw error;
      setCampaigns((sortedData || []) as Campaign[]);

      // Fetch metrics for each campaign
      if (sortedData) {
        const metrics: Record<string, CampaignMetrics> = {};
        
        for (const campaign of sortedData) {
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Campanha</DialogTitle>
                </DialogHeader>
                <CampaignForm
                  onSuccess={() => {
                    setDialogOpen(false);
                    fetchCampaigns();
                  }}
                  onCancel={() => setDialogOpen(false)}
                />
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
          <div className="grid gap-3">
            {campaigns.map((campaign) => {
              const metrics = campaignMetrics[campaign.id];
              return (
                <Card 
                  key={campaign.id} 
                  className="overflow-hidden hover:shadow-md transition-all hover:border-primary/20 cursor-pointer"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-xl font-bold truncate">{campaign.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                              {getStatusLabel(campaign.status)}
                            </span>
                            {campaign.campaign_type === 'automatic' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                Auto
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{campaign.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-wrap">
                        {metrics && (
                          <>
                            <div className="flex items-center gap-1.5">
                              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Total:</span>
                              <span className="text-sm font-semibold">{metrics.total}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-blue-600" />
                              <span className="text-xs text-muted-foreground">Enviados:</span>
                              <span className="text-sm font-semibold text-blue-600">{metrics.sent}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-success" />
                              <span className="text-xs text-muted-foreground">Respostas:</span>
                              <span className="text-sm font-semibold text-success">{metrics.responded}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs text-muted-foreground">NPS:</span>
                              <span className={`text-sm font-bold ${
                                metrics.nps > 0 ? "text-success" : metrics.nps < 0 ? "text-destructive" : "text-muted-foreground"
                              }`}>
                                {metrics.responded > 0 ? `${metrics.nps.toFixed(0)}%` : "-"}
                              </span>
                            </div>
                          </>
                        )}
                        {campaign.campaign_type === 'automatic' && campaign.next_send && campaign.status !== 'completed' && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Próximo:</span>
                            <span className="text-sm font-medium">{formatDate(campaign.next_send)}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
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
