import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Copy, Check } from "lucide-react";
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

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const generateLink = (campaignId: string, contactId: string) => {
    const token = `${campaignId}-${contactId}-${Date.now()}`;
    return `${window.location.origin}/nps/${token}`;
  };

  const copyLink = (campaignId: string) => {
    const link = generateLink(campaignId, "CONTACT_ID");
    navigator.clipboard.writeText(link);
    setCopiedId(campaignId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Link copiado!",
      description: "Substitua CONTACT_ID pelo ID do contato.",
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
                  <Button variant="outline" onClick={() => copyLink(campaign.id)}>
                    {copiedId === campaign.id ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copiar Link Modelo
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
