import { useEffect, useState } from "react";
import { MessageSquare, Clock, Star, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState({
    activeChats: 0,
    waitingChats: 0,
    closedToday: 0,
    avgCsat: 0,
    onlineAttendants: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeRes, waitingRes, closedRes, csatRes, attendantsRes] = await Promise.all([
        supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("status", "waiting"),
        supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("status", "closed").gte("closed_at", today.toISOString()),
        supabase.from("chat_rooms").select("csat_score").not("csat_score", "is", null),
        supabase.from("attendant_profiles").select("id", { count: "exact", head: true }).eq("status", "available"),
      ]);

      const csatScores = csatRes.data ?? [];
      const avgCsat = csatScores.length > 0
        ? csatScores.reduce((sum, r) => sum + (r.csat_score ?? 0), 0) / csatScores.length
        : 0;

      setMetrics({
        activeChats: activeRes.count ?? 0,
        waitingChats: waitingRes.count ?? 0,
        closedToday: closedRes.count ?? 0,
        avgCsat: Number(avgCsat.toFixed(1)),
        onlineAttendants: attendantsRes.count ?? 0,
      });
    };

    fetchMetrics();
  }, []);

  const cards = [
    { title: t("chat.dashboard.active_chats"), value: metrics.activeChats, icon: MessageSquare, color: "text-blue-500" },
    { title: t("chat.dashboard.waiting"), value: metrics.waitingChats, icon: Clock, color: "text-amber-500" },
    { title: t("chat.dashboard.csat_avg"), value: metrics.avgCsat > 0 ? `${metrics.avgCsat}/5` : "—", icon: Star, color: "text-yellow-500" },
    { title: t("chat.dashboard.online_attendants"), value: metrics.onlineAttendants, icon: Users, color: "text-green-500" },
  ];

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("chat.dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("chat.dashboard.subtitle")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("chat.dashboard.closed_today")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.closedToday}</p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default AdminDashboard;
