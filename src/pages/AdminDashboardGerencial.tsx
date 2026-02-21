import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboardStats, type DashboardFilters } from "@/hooks/useDashboardStats";
import { useAttendants } from "@/hooks/useAttendants";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MessageSquare, CalendarDays, Star, CheckCircle, Clock, AlertTriangle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AdminDashboardGerencial = () => {
  const { t } = useLanguage();
  const { attendants } = useAttendants();
  const [filters, setFilters] = useState<DashboardFilters>({ period: "month" });
  const { stats, loading } = useDashboardStats(filters);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("chat_service_categories").select("id, name").order("name"),
      supabase.from("chat_tags").select("id, name").order("name"),
    ]).then(([catRes, tagRes]) => {
      setCategories(catRes.data ?? []);
      setTags(tagRes.data ?? []);
    });
  }, []);

  const resolutionColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "escalated": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "";
    }
  };

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t("chat.gerencial.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("chat.gerencial.subtitle")}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Select
              value={filters.period}
              onValueChange={(v) => setFilters((f) => ({ ...f, period: v as DashboardFilters["period"] }))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("chat.gerencial.period")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t("chat.gerencial.today")}</SelectItem>
                <SelectItem value="week">{t("chat.gerencial.week")}</SelectItem>
                <SelectItem value="month">{t("chat.gerencial.month_period")}</SelectItem>
                <SelectItem value="all">{t("chat.gerencial.all_time")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.attendantId ?? "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, attendantId: v === "all" ? null : v }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("chat.gerencial.filter_by_attendant")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {attendants.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categories.length > 0 && (
              <Select
                value={filters.categoryId ?? "all"}
                onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v === "all" ? null : v }))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("chat.gerencial.filter_by_category")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {tags.length > 0 && (
              <Select
                value={filters.tagId ?? "all"}
                onValueChange={(v) => setFilters((f) => ({ ...f, tagId: v === "all" ? null : v }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Tags</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards - 7 cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <KPICard icon={MessageSquare} label={t("chat.gerencial.total_chats")} value={stats.totalChats} />
              <KPICard icon={CalendarDays} label={t("chat.gerencial.chats_today")} value={stats.chatsToday} />
              <KPICard icon={Star} label={t("chat.dashboard.csat_avg")} value={stats.avgCsat != null ? `${stats.avgCsat}/5` : "—"} />
              <KPICard icon={CheckCircle} label={t("chat.gerencial.resolution_rate")} value={stats.resolutionRate != null ? `${stats.resolutionRate}%` : "—"} />
              <KPICard icon={Clock} label={t("chat.gerencial.avg_resolution")} value={stats.avgResolutionMinutes != null ? `${stats.avgResolutionMinutes}min` : "—"} />
              <KPICard icon={Zap} label={t("chat.gerencial.avg_first_response")} value={stats.avgFirstResponseMinutes != null ? `${stats.avgFirstResponseMinutes}min` : "—"} />
              <KPICard icon={AlertTriangle} label={t("chat.gerencial.unresolved_chats")} value={stats.unresolvedChats} />
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-lg border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle>{t("chat.gerencial.conversations_per_day")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.chartData}>
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

              <Card className="rounded-lg border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle>{t("chat.gerencial.csat_evolution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.csatByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stats.csatByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2: Peak hours + Resolution distribution */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-lg border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle>{t("chat.gerencial.peak_hours")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.chatsByHour.some(h => h.count > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.chatsByHour}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} />
                        <YAxis allowDecimals={false} />
                        <Tooltip labelFormatter={(h) => `${h}:00`} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-lg border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle>{t("chat.gerencial.resolution_distribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.resolutionDistribution.length > 0 ? (
                    <div className="flex flex-wrap gap-4 py-8">
                      {stats.resolutionDistribution.map((item) => (
                        <div key={item.status} className="flex items-center gap-2">
                          <Badge className={resolutionColor(item.status)}>
                            {item.status === "resolved" ? t("chat.history.resolved") :
                             item.status === "escalated" ? t("chat.history.escalated") :
                             t("chat.history.pending_status")}
                          </Badge>
                          <span className="text-2xl font-bold">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">{t("chat.gerencial.no_data")}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Attendant Performance Table */}
            <Card className="rounded-lg border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>{t("chat.gerencial.attendant_performance")}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.attendantPerformance.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("chat.gerencial.attendant")}</TableHead>
                        <TableHead className="text-right">{t("chat.gerencial.chats_col")}</TableHead>
                        <TableHead className="text-right">{t("chat.gerencial.csat_col")}</TableHead>
                        <TableHead className="text-right">{t("chat.gerencial.resolution_col")}</TableHead>
                        <TableHead className="text-right">{t("chat.gerencial.avg_time_col")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.attendantPerformance.map((att) => (
                        <TableRow key={att.name}>
                          <TableCell className="font-medium">{att.name}</TableCell>
                          <TableCell className="text-right">{att.chats}</TableCell>
                          <TableCell className="text-right">{att.csat != null ? `${att.csat}/5` : "—"}</TableCell>
                          <TableCell className="text-right">{att.resolutionRate != null ? `${att.resolutionRate}%` : "—"}</TableCell>
                          <TableCell className="text-right">{att.avgResolution != null ? `${att.avgResolution}min` : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("chat.gerencial.no_data")}</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
  <Card className="rounded-lg border bg-card shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-semibold">{value}</p>
    </CardContent>
  </Card>
);

export default AdminDashboardGerencial;
