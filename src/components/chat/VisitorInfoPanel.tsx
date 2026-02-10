import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, Building2, Hash, MessageSquare, Star, Calendar, DollarSign, Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimelineComponent } from "@/components/cs/TimelineComponent";

interface Visitor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  created_at: string;
  contact_id: string | null;
  company_contact_id: string | null;
}

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  external_id: string | null;
  chat_total: number | null;
  chat_avg_csat: number | null;
  chat_last_at: string | null;
}

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  health_score: number | null;
  mrr: number | null;
  contract_value: number | null;
  renewal_date: string | null;
  last_nps_score: number | null;
  last_nps_date: string | null;
  city: string | null;
  state: string | null;
  company_sector: string | null;
  company_document: string | null;
}

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  user_name: string;
  metadata: Record<string, unknown>;
}

interface VisitorInfoPanelProps {
  roomId: string;
  visitorId: string;
  contactId?: string | null;
  companyContactId?: string | null;
}

function getHealthColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function getHealthProgressColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getNpsBadge(score: number) {
  if (score >= 9) return { label: "Promotor", variant: "default" as const, className: "bg-green-500 hover:bg-green-600" };
  if (score >= 7) return { label: "Neutro", variant: "secondary" as const, className: "bg-yellow-500 hover:bg-yellow-600 text-white" };
  return { label: "Detrator", variant: "destructive" as const, className: "" };
}

export function VisitorInfoPanel({ visitorId, contactId: propContactId, companyContactId: propCompanyContactId }: VisitorInfoPanelProps) {
  const { t } = useLanguage();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyContact, setCompanyContact] = useState<CompanyContact | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch visitor
      const { data: visitorData } = await supabase
        .from("chat_visitors")
        .select("id, name, email, phone, role, department, created_at, contact_id, company_contact_id")
        .eq("id", visitorId)
        .maybeSingle();

      const v = visitorData as Visitor | null;
      setVisitor(v);

      const cId = propContactId || v?.contact_id;
      const ccId = propCompanyContactId || v?.company_contact_id;

      // Fetch company and contact in parallel when available
      const promises: Promise<void>[] = [];

      if (cId) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from("contacts")
              .select("id, name, trade_name, health_score, mrr, contract_value, renewal_date, last_nps_score, last_nps_date, city, state, company_sector, company_document")
              .eq("id", cId)
              .maybeSingle();
            setCompany(data as Company | null);
          })()
        );

        promises.push(
          (async () => {
            const { data } = await supabase
              .from("timeline_events")
              .select("id, type, title, description, date, user_name, metadata")
              .eq("contact_id", cId)
              .order("date", { ascending: false })
              .limit(10);
            setTimelineEvents((data as TimelineEvent[]) ?? []);
          })()
        );
      }

      if (ccId) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from("company_contacts")
              .select("id, name, email, phone, role, department, external_id, chat_total, chat_avg_csat, chat_last_at")
              .eq("id", ccId)
              .maybeSingle();
            setCompanyContact(data as CompanyContact | null);
          })()
        );
      }

      await Promise.all(promises);
      setLoading(false);
    };

    fetchData();
  }, [visitorId, propContactId, propCompanyContactId]);

  if (loading) {
    return (
      <div className="glass-card h-full flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!visitor) return null;

  const hasLinkedData = company || companyContact;
  const displayContact = companyContact || visitor;

  // Simple fallback for anonymous visitors
  if (!hasLinkedData) {
    return (
      <div className="glass-card h-full">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">{t("chat.workspace.visitor_info")}</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{visitor.name}</p>
              {visitor.role && <p className="text-xs text-muted-foreground">{visitor.role}</p>}
            </div>
          </div>
          {visitor.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{visitor.email}</span>
            </div>
          )}
          {visitor.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{visitor.phone}</span>
            </div>
          )}
          {visitor.department && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1">{t("chat.workspace.department")}</p>
              <p>{visitor.department}</p>
            </div>
          )}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {t("chat.workspace.since")} {new Date(visitor.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  }

  // Enriched panel with tabs
  return (
    <div className="glass-card h-full flex flex-col">
      {/* Header with contact name */}
      <div className="p-4 border-b border-border space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{displayContact.name}</p>
            {displayContact.role && <p className="text-xs text-muted-foreground truncate">{displayContact.role}</p>}
          </div>
        </div>
        {displayContact.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{displayContact.email}</span>
          </div>
        )}
        {displayContact.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{displayContact.phone}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contact" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 grid grid-cols-3 h-8">
          <TabsTrigger value="contact" className="text-xs">Contato</TabsTrigger>
          <TabsTrigger value="company" className="text-xs">Empresa</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Contact Tab */}
          <TabsContent value="contact" className="px-4 pb-4 space-y-3 mt-0">
            {companyContact?.department && (
              <InfoRow icon={Building2} label="Departamento" value={companyContact.department} />
            )}
            {companyContact?.external_id && (
              <InfoRow icon={Hash} label="External ID" value={companyContact.external_id} />
            )}

            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Métricas de Chat</p>
              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="Sessões" value={String(companyContact?.chat_total ?? 0)} />
                <MetricCard label="CSAT Médio" value={companyContact?.chat_avg_csat ? `${Number(companyContact.chat_avg_csat).toFixed(1)}` : "—"} />
              </div>
              {companyContact?.chat_last_at && (
                <p className="text-xs text-muted-foreground">
                  Último chat: {new Date(companyContact.chat_last_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </TabsContent>

          {/* Company Tab */}
          <TabsContent value="company" className="px-4 pb-4 space-y-3 mt-0">
            {company ? (
              <>
                <div>
                  <p className="font-medium text-sm">{company.trade_name || company.name}</p>
                  {company.trade_name && company.name !== company.trade_name && (
                    <p className="text-xs text-muted-foreground">{company.name}</p>
                  )}
                </div>

                {/* Health Score */}
                {company.health_score != null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Health Score</span>
                      <span className={`text-sm font-semibold ${getHealthColor(company.health_score)}`}>
                        {company.health_score}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getHealthProgressColor(company.health_score)}`}
                        style={{ width: `${company.health_score}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Financial */}
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard
                    label="MRR"
                    value={company.mrr ? `R$ ${Number(company.mrr).toLocaleString("pt-BR")}` : "—"}
                  />
                  <MetricCard
                    label="Contrato"
                    value={company.contract_value ? `R$ ${Number(company.contract_value).toLocaleString("pt-BR")}` : "—"}
                  />
                </div>

                {/* Renewal */}
                {company.renewal_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Renovação:</span>
                    <span className="text-xs">{new Date(company.renewal_date).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}

                {/* NPS */}
                {company.last_nps_score != null && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">NPS:</span>
                    <span className="text-sm font-semibold">{company.last_nps_score}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${getNpsBadge(company.last_nps_score).className}`}>
                      {getNpsBadge(company.last_nps_score).label}
                    </Badge>
                  </div>
                )}

                {/* Location & sector */}
                {(company.city || company.state) && (
                  <p className="text-xs text-muted-foreground">
                    📍 {[company.city, company.state].filter(Boolean).join(", ")}
                  </p>
                )}
                {company.company_sector && (
                  <p className="text-xs text-muted-foreground">
                    🏢 {company.company_sector}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem empresa vinculada</p>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="px-4 pb-4 mt-0">
            {timelineEvents.length > 0 ? (
              <TimelineComponent events={timelineEvents} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum evento registrado</p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-xs truncate">{value}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/50 p-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
