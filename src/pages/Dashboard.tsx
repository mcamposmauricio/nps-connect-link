import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Send, TrendingUp, MessageSquare } from "lucide-react";

interface Stats {
  totalContacts: number;
  totalCampaigns: number;
  totalResponses: number;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalCampaigns: 0,
    totalResponses: 0,
    npsScore: 0,
    promoters: 0,
    passives: 0,
    detractors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [contactsRes, campaignsRes, responsesRes] = await Promise.all([
          supabase.from("contacts").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase.from("campaigns").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase
            .from("responses")
            .select("score, campaigns!inner(user_id)")
            .eq("campaigns.user_id", user.id),
        ]);

        const responses = responsesRes.data || [];
        const promoters = responses.filter((r) => r.score >= 9).length;
        const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
        const detractors = responses.filter((r) => r.score <= 6).length;
        const total = responses.length;
        const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

        setStats({
          totalContacts: contactsRes.count || 0,
          totalCampaigns: campaignsRes.count || 0,
          totalResponses: total,
          npsScore,
          promoters,
          passives,
          detractors,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "Contatos", value: stats.totalContacts, icon: Users, color: "text-blue-600" },
    { title: "Campanhas", value: stats.totalCampaigns, icon: Send, color: "text-purple-600" },
    { title: "Respostas", value: stats.totalResponses, icon: MessageSquare, color: "text-indigo-600" },
    { title: "NPS Score", value: stats.npsScore, icon: TrendingUp, color: "text-primary", suffix: "" },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu sistema de NPS</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold">
                  {stat.value}
                  {stat.suffix !== undefined ? stat.suffix : ""}
                </p>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Promotores</h3>
              <span className="text-2xl">😊</span>
            </div>
            <p className="text-4xl font-bold text-success">{stats.promoters}</p>
            <p className="text-sm text-muted-foreground mt-2">Score 9-10</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Neutros</h3>
              <span className="text-2xl">😐</span>
            </div>
            <p className="text-4xl font-bold text-warning">{stats.passives}</p>
            <p className="text-sm text-muted-foreground mt-2">Score 7-8</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Detratores</h3>
              <span className="text-2xl">😞</span>
            </div>
            <p className="text-4xl font-bold text-destructive">{stats.detractors}</p>
            <p className="text-sm text-muted-foreground mt-2">Score 0-6</p>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
