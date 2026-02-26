import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboardStats, type DashboardFilters } from "@/hooks/useDashboardStats";
import { useAttendants } from "@/hooks/useAttendants";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MessageSquare, CalendarDays, Star, CheckCircle, Clock, AlertTriangle, Zap } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionLabel } from "@/components/ui/section-label";
import { FilterBar } from "@/components/ui/filter-bar";
import { ChartCard } from "@/components/ui/chart-card";

const AdminDashboardGerencial = () => {
  const { t } = useLanguage();
  const { attendants } = useAttendants();
  const [filters, setFilters] = useState<DashboardFilters>({ period: "month" });
  const { stats, loading } = useDashboardStats(filters);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [companyOptions, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [contactOptions, setContactOptions] = useState<{ id: string; name: string; companyId: string }[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("chat_service_categories").select("id, name").order("name"),
      supabase.from("chat_tags").select("id, name").order("name"),
      supabase.from("contacts").select("id, name").eq("is_company", true).order("name"),
      supabase.from("company_contacts").select("id, name, company_id").order("name"),
    ]).then(([catRes, tagRes, compRes, ccRes]) => {
      setCategories(catRes.data ?? []);
      setTags(tagRes.data ?? []);
      setCompanyOptions((compRes.data ?? []).map((c) => ({ id: c.id, name: c.name })));
      setContactOptions((ccRes.data ?? []).map((c) => ({ id: c.id, name: c.name, companyId: c.company_id })));
    });
  }, []);

  const resolutionColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-green-100 text-green-800";
      case "pending": return "bg-orange-100 text-orange-800";
      case "escalated": return "bg-red-100 text-red-800";
      default: return "";
    }
  };

  const kpis = [
    { title: t("chat.gerencial.total_chats"), value: stats.totalChats, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: t("chat.gerencial.chats_today"), value: stats.chatsToday, icon: CalendarDays, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: t("chat.dashboard.csat_avg"), value: stats.avgCsat != null ? `${stats.avgCsat}/5` : "—", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { title: t("chat.gerencial.resolution_rate"), value: stats.resolutionRate != null ? `${stats.resolutionRate}%` : "—", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: t("chat.gerencial.avg_resolution"), value: stats.avgResolutionMinutes != null ? `${stats.avgResolutionMinutes}min` : "—", icon: Clock, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: t("chat.gerencial.avg_first_response"), value: stats.avgFirstResponseMinutes != null ? `${stats.avgFirstResponseMinutes}min` : "—", icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: t("chat.gerencial.unresolved_chats"), value: stats.unresolvedChats, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("chat.gerencial.title")} subtitle={t("chat.gerencial.subtitle")} />

      {/* Filters */}
      <FilterBar>
        <Select value={filters.period} onValueChange={(v) => setFilters((f) => ({ ...f, period: v as DashboardFilters["period"] }))}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder={t("chat.gerencial.period")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t("chat.gerencial.today")}</SelectItem>
            <SelectItem value="week">{t("chat.gerencial.week")}</SelectItem>
            <SelectItem value="month">{t("chat.gerencial.month_period")}</SelectItem>
            <SelectItem value="all">{t("chat.gerencial.all_time")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.attendantId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, attendantId: v === "all" ? null : v }))}>
          <SelectTrigger className="w-[190px] h-9"><SelectValue placeholder={t("chat.gerencial.filter_by_attendant")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.all_attendants")}</SelectItem>
            {attendants.map((a) => <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={filters.categoryId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v === "all" ? null : v }))}>
            <SelectTrigger className="w-[190px] h-9"><SelectValue placeholder={t("chat.gerencial.filter_by_category")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all_categories")}</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {tags.length > 0 && (
          <Select value={filters.tagId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, tagId: v === "all" ? null : v }))}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all_tags")}</SelectItem>
              {tags.map((tag) => <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {companyOptions.length > 0 && (
          <Select value={filters.contactId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, contactId: v === "all" ? null : v, companyContactId: null }))}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Empresas</SelectItem>
              {companyOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {contactOptions.length > 0 && (
          <Select value={filters.companyContactId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, companyContactId: v === "all" ? null : v }))}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Contato" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Contatos</SelectItem>
              {(filters.contactId ? contactOptions.filter(c => c.companyId === filters.contactId) : contactOptions).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </FilterBar>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div>
            <SectionLabel>Métricas do Período</SectionLabel>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {kpis.map((kpi) => (
                <MetricCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} iconColor={kpi.color} iconBgColor={kpi.bg} />
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title={t("chat.gerencial.conversations_per_day")} isEmpty={stats.chartData.length === 0} emptyText={t("chat.gerencial.no_data")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("chat.gerencial.csat_evolution")} isEmpty={stats.csatByDay.length === 0} emptyText={t("chat.gerencial.no_data")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.csatByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("chat.gerencial.peak_hours")} isEmpty={!stats.chatsByHour.some(h => h.count > 0)} emptyText={t("chat.gerencial.no_data")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chatsByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(h) => `${h}:00`} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("chat.gerencial.resolution_distribution")} isEmpty={stats.resolutionDistribution.length === 0} emptyText={t("chat.gerencial.no_data")}>
              <div className="flex flex-wrap gap-4 h-full items-center justify-center">
                {stats.resolutionDistribution.map((item) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <Badge className={resolutionColor(item.status)}>
                      {item.status === "resolved" ? t("chat.history.resolved") : item.status === "escalated" ? t("chat.history.escalated") : t("chat.history.pending_status")}
                    </Badge>
                    <span className="text-2xl font-semibold tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Attendant Performance Table */}
          {stats.attendantPerformance.length > 0 && (
            <div>
              <SectionLabel>{t("chat.gerencial.attendant_performance")}</SectionLabel>
              <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                <CardContent className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.gerencial.attendant")}</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.chats_col")}</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.csat_col")}</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.resolution_col")}</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.avg_time_col")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.attendantPerformance.map((att) => (
                        <TableRow key={att.name}>
                          <TableCell className="text-[13px] font-medium">{att.name}</TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.chats}</TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.csat != null ? `${att.csat}/5` : "—"}</TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.resolutionRate != null ? `${att.resolutionRate}%` : "—"}</TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.avgResolution != null ? `${att.avgResolution}min` : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboardGerencial;
