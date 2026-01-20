import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function CSHealthPage() {
  const { t } = useLanguage();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-health"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, trade_name, health_score, last_nps_score, cs_status, mrr")
        .eq("user_id", user.id)
        .eq("is_company", true)
        .order("health_score", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const getHealthColor = (score: number) => {
    if (score >= 70) return "bg-primary";
    if (score >= 40) return "bg-warning";
    return "bg-destructive";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 70) return t("cs.health.healthy");
    if (score >= 40) return t("cs.health.attention");
    return t("cs.health.critical");
  };

  const distribution = {
    healthy: companies.filter((c) => (c.health_score ?? 50) >= 70).length,
    attention: companies.filter((c) => (c.health_score ?? 50) >= 40 && (c.health_score ?? 50) < 70).length,
    critical: companies.filter((c) => (c.health_score ?? 50) < 40).length,
  };

  const avgHealth = companies.length > 0
    ? Math.round(companies.reduce((acc, c) => acc + (c.health_score ?? 50), 0) / companies.length)
    : 0;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("cs.health.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("cs.health.subtitle")}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("cs.health.average")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{avgHealth}%</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t("cs.health.healthy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-primary">{distribution.healthy}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Minus className="h-4 w-4 text-warning" />
                {t("cs.health.attention")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-warning">{distribution.attention}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                {t("cs.health.critical")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-destructive">{distribution.critical}</span>
            </CardContent>
          </Card>
        </div>

        {/* Companies List */}
        <Card>
          <CardHeader>
            <CardTitle>{t("cs.health.companiesList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("cs.health.noCompanies")}</div>
            ) : (
              <div className="space-y-3">
                {companies.map((company) => {
                  const healthScore = company.health_score ?? 50;
                  return (
                    <div key={company.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {company.trade_name || company.name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{t(`cs.status.${company.cs_status || "implementacao"}`)}</Badge>
                          {company.last_nps_score !== null && (
                            <span>NPS: {company.last_nps_score}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress value={healthScore} className="h-2" />
                      </div>
                      <Badge className={`${getHealthColor(healthScore)} text-white min-w-[80px] justify-center`}>
                        {healthScore}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
