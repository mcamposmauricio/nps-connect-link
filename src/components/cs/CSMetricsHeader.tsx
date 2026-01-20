import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, DollarSign, Heart, AlertTriangle } from "lucide-react";

interface CSMetricsHeaderProps {
  metrics: {
    totalCompanies: number;
    totalMRR: number;
    avgHealthScore: number;
    atRisk: number;
  };
}

export function CSMetricsHeader({ metrics }: CSMetricsHeaderProps) {
  const { t } = useLanguage();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const cards = [
    {
      title: t("cs.metrics.totalCompanies"),
      value: metrics.totalCompanies,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t("cs.metrics.totalMRR"),
      value: formatCurrency(metrics.totalMRR),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: t("cs.metrics.avgHealth"),
      value: `${metrics.avgHealthScore}%`,
      icon: Heart,
      color: metrics.avgHealthScore >= 70 ? "text-green-600" : metrics.avgHealthScore >= 40 ? "text-yellow-600" : "text-destructive",
      bgColor: metrics.avgHealthScore >= 70 ? "bg-green-100" : metrics.avgHealthScore >= 40 ? "bg-yellow-100" : "bg-destructive/10",
    },
    {
      title: t("cs.metrics.atRisk"),
      value: metrics.atRisk,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
