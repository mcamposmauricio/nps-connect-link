import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const AdminDashboardGerencial = () => {
  const { t } = useLanguage();
  const [chartData, setChartData] = useState<{ date: string; total: number }[]>([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [avgCsat, setAvgCsat] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("created_at, csat_score")
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (rooms) {
        setTotalRooms(rooms.length);

        const withCsat = rooms.filter((r) => r.csat_score != null);
        setAvgCsat(
          withCsat.length > 0
            ? Number((withCsat.reduce((s, r) => s + (r.csat_score ?? 0), 0) / withCsat.length).toFixed(1))
            : 0
        );

        // Group by day
        const byDay: Record<string, number> = {};
        rooms.forEach((r) => {
          const day = r.created_at?.slice(0, 10) ?? "";
          byDay[day] = (byDay[day] ?? 0) + 1;
        });

        setChartData(
          Object.entries(byDay)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, total]) => ({ date: date.slice(5), total }))
        );
      }
    };

    fetchData();
  }, []);

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("chat.gerencial.title")}</h1>
          <p className="text-muted-foreground">{t("chat.gerencial.subtitle")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">{t("chat.gerencial.total_conversations")}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{totalRooms}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">{t("chat.dashboard.csat_avg")}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{avgCsat > 0 ? `${avgCsat}/5` : "—"}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("chat.gerencial.conversations_per_day")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default AdminDashboardGerencial;
