import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import SidebarLayout from "@/components/SidebarLayout";
import { CSKanbanBoard } from "@/components/cs/CSKanbanBoard";
import { CSMetricsHeader } from "@/components/cs/CSMetricsHeader";

export default function CSDashboard() {
  const { t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ["cs-companies", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_company", true)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: csms = [] } = useQuery({
    queryKey: ["csms", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("csms")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const metrics = {
    totalCompanies: companies.length,
    totalMRR: companies.reduce((sum, c) => sum + Number(c.mrr || 0), 0),
    avgHealthScore: companies.length > 0 
      ? Math.round(companies.reduce((sum, c) => sum + Number(c.health_score || 50), 0) / companies.length)
      : 0,
    atRisk: companies.filter(c => Number(c.health_score || 50) < 40).length,
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("cs.dashboard")}</h1>
          <p className="text-muted-foreground">{t("cs.dashboardSubtitle")}</p>
        </div>

        <CSMetricsHeader metrics={metrics} />

        <CSKanbanBoard 
          companies={companies} 
          csms={csms}
          isLoading={isLoading} 
          onRefresh={refetch}
        />
      </div>
    </SidebarLayout>
  );
}
