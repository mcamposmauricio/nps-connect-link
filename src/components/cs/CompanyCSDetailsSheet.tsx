import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Heart, 
  Mail, 
  Phone, 
  MapPin,
  TrendingUp,
  Route as RouteIcon,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { TimelineComponent } from "./TimelineComponent";

import { KanbanCompany } from "./CSKanbanCard";

export function CompanyCSDetailsSheet({ company, onClose }: CompanyCSDetailsSheetProps) {

interface CompanyCSDetailsSheetProps {
  company: CSCompany | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function CompanyCSDetailsSheet({ company, onClose, onRefresh }: CompanyCSDetailsSheetProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "pt-BR" ? ptBR : enUS;

  const { data: trails = [] } = useQuery({
    queryKey: ["company-trails", company?.id],
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await supabase
        .from("trails")
        .select("*")
        .eq("contact_id", company.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!company,
  });

  const { data: timelineEvents = [] } = useQuery({
    queryKey: ["company-timeline", company?.id],
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("contact_id", company.id)
        .order("date", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!company,
  });

  if (!company) return null;

  const healthScore = company.health_score ?? 50;
  
  const getHealthColor = (score: number) => {
    if (score >= 70) return "bg-primary";
    if (score >= 40) return "bg-warning";
    return "bg-destructive";
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Sheet open={!!company} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-start justify-between">
            <div>
              <p className="text-xl">{company.trade_name || company.name}</p>
              {company.trade_name && (
                <p className="text-sm text-muted-foreground font-normal">
                  {company.name}
                </p>
              )}
            </div>
            <Badge 
              variant="secondary"
              className={`${getHealthColor(healthScore)} text-primary-foreground`}
            >
              <Heart className="h-3 w-3 mr-1" />
              {healthScore}%
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">{t("cs.details.overview")}</TabsTrigger>
            <TabsTrigger value="trails">{t("cs.details.trails")}</TabsTrigger>
            <TabsTrigger value="timeline">{t("cs.details.timeline")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("cs.details.contact")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{company.email}</span>
                </div>
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{company.phone}</span>
                  </div>
                )}
                {(company.city || company.state) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {[company.city, company.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("cs.details.financial")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MRR</span>
                  <span className="font-medium">{formatCurrency(company.mrr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("cs.details.contractValue")}</span>
                  <span className="font-medium">{formatCurrency(company.contract_value)}</span>
                </div>
                {company.renewal_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cs.details.renewalDate")}</span>
                    <span className="font-medium">
                      {format(new Date(company.renewal_date), "PPP", { locale: dateLocale })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NPS Info */}
            {company.last_nps_score !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("cs.details.lastNPS")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-2xl font-bold">{company.last_nps_score}</span>
                    </div>
                    {company.last_nps_date && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(company.last_nps_date), "PPP", { locale: dateLocale })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trails" className="mt-4">
            <ScrollArea className="h-[400px]">
              {trails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RouteIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t("cs.noTrails")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trails.map((trail) => (
                    <Card key={trail.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{trail.name}</p>
                            <Badge 
                              variant={trail.status === "active" ? "default" : "secondary"}
                            >
                              {t(`cs.trailStatus.${trail.status}`)}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">
                              {trail.progress_percentage}%
                            </span>
                          </div>
                        </div>
                        <Progress value={trail.progress_percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {format(new Date(trail.started_at), "PPP", { locale: dateLocale })}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <TimelineComponent events={timelineEvents as Array<{
              id: string;
              type: string;
              title: string;
              description: string | null;
              date: string;
              user_name: string;
              metadata: Record<string, unknown>;
            }>} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
