import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Calendar, Clock, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
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


const Campaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(5);
  const { toast } = useToast();
  const { t } = useLanguage();

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
      setCampaigns((data || []) as Campaign[]);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvData = campaigns.map((campaign) => ({
      [t("campaigns.name")]: campaign.name,
      [t("campaignForm.messageLabel")]: campaign.message,
      [t("campaigns.status")]: getStatusLabel(campaign.status),
      [t("campaigns.created")]: new Date(campaign.created_at).toLocaleDateString(),
      [t("campaigns.scheduledFor")]: campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString() : "",
    }));
    exportToCSV(csvData, "campaigns");
    toast({
      title: t("contacts.exportSuccess"),
      description: t("contacts.exportDescription"),
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t("campaigns.title")}</h1>
            <p className="text-muted-foreground">{t("contacts.subtitle")}</p>
          </div>

          <div className="flex gap-2">
            {campaigns.length > 0 && (
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t("contacts.export")}
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("campaigns.createCampaign")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("campaignForm.title")}</DialogTitle>
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
            <p className="text-muted-foreground">{t("campaigns.noCampaigns")}</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-3">
              {campaigns.slice(0, displayCount).map((campaign) => (
                <Card 
                  key={campaign.id} 
                  className="overflow-hidden hover:shadow-md transition-all hover:border-primary/20 cursor-pointer"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold truncate">{campaign.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                              {getStatusLabel(campaign.status)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                              {campaign.campaign_type === 'automatic' ? t("campaigns.automatic") : t("campaigns.manual")}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{t("campaigns.created")}: {new Date(campaign.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          {campaign.campaign_type === 'automatic' && campaign.next_send && campaign.status !== 'completed' && campaign.status !== 'cancelled' && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{t("campaigns.nextSend")}: {formatDate(campaign.next_send)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {displayCount < campaigns.length && (
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setDisplayCount(prev => prev + 5)}
                >
                  {t("contacts.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Campaigns;
