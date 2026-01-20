import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Building2, PieChart } from "lucide-react";

export default function CSFinancialPage() {
  const { t } = useLanguage();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-financial"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_company", true)
        .neq("cs_status", "churn")
        .order("mrr", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalMRR = companies.reduce((acc, c) => acc + (c.mrr || 0), 0);
  const totalContractValue = companies.reduce((acc, c) => acc + (c.contract_value || 0), 0);
  const avgMRR = companies.length > 0 ? totalMRR / companies.length : 0;

  const mrrByStatus = {
    implementacao: companies.filter((c) => c.cs_status === "implementacao").reduce((acc, c) => acc + (c.mrr || 0), 0),
    onboarding: companies.filter((c) => c.cs_status === "onboarding").reduce((acc, c) => acc + (c.mrr || 0), 0),
    acompanhamento: companies.filter((c) => c.cs_status === "acompanhamento").reduce((acc, c) => acc + (c.mrr || 0), 0),
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("cs.financial.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("cs.financial.subtitle")}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t("cs.financial.totalMRR")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-primary">{formatCurrency(totalMRR)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t("cs.financial.avgMRR")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{formatCurrency(avgMRR)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                {t("cs.financial.totalContracts")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{formatCurrency(totalContractValue)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t("cs.financial.activeCompanies")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{companies.length}</span>
            </CardContent>
          </Card>
        </div>

        {/* MRR by Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t("cs.financial.mrrByStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">{t("cs.status.implementacao")}</p>
                <p className="text-xl font-bold">{formatCurrency(mrrByStatus.implementacao)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">{t("cs.status.onboarding")}</p>
                <p className="text-xl font-bold">{formatCurrency(mrrByStatus.onboarding)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">{t("cs.status.acompanhamento")}</p>
                <p className="text-xl font-bold">{formatCurrency(mrrByStatus.acompanhamento)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Companies by MRR */}
        <Card>
          <CardHeader>
            <CardTitle>{t("cs.financial.topCompanies")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("cs.financial.noCompanies")}</div>
            ) : (
              <div className="space-y-3">
                {companies.slice(0, 10).map((company, index) => (
                  <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">{index + 1}</span>
                      <div>
                        <p className="font-medium">{company.trade_name || company.name}</p>
                        <Badge variant="outline">{t(`cs.status.${company.cs_status || "implementacao"}`)}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrency(company.mrr || 0)}</p>
                      <p className="text-xs text-muted-foreground">{t("cs.financial.monthly")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
