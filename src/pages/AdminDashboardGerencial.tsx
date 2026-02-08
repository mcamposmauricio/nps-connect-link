import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboardStats, type DashboardFilters } from "@/hooks/useDashboardStats";
import { useAttendants } from "@/hooks/useAttendants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MessageSquare, CalendarDays, Star, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AdminDashboardGerencial = () => {
  const { t } = useLanguage();
  const { attendants } = useAttendants();
  const [filters, setFilters] = useState<DashboardFilters>({ period: "month" });
  const { stats, loading } = useDashboardStats(filters);

  const resolutionColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "escalated": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "";
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("chat.gerencial.title")}</h1>
            <p className="text-muted-foreground">{t("chat.gerencial.subtitle")}</p>
          </div>
          <div className="flex gap-3">
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
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t("chat.gerencial.total_chats")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalChats}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {t("chat.gerencial.chats_today")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.chatsToday}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    {t("chat.dashboard.csat_avg")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {stats.avgCsat != null ? `${stats.avgCsat}/5` : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {t("chat.gerencial.resolution_rate")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {stats.resolutionRate != null ? `${stats.resolutionRate}%` : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t("chat.gerencial.avg_resolution")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {stats.avgResolutionMinutes != null ? `${stats.avgResolutionMinutes}min` : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Conversations per Day */}
              <Card>
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

              {/* Chats by Attendant */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("chat.gerencial.chats_by_attendant")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.chatsByAttendant.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.chatsByAttendant} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Resolution Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t("chat.gerencial.resolution_distribution")}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.resolutionDistribution.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
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
          </>
        )}
      </div>
    </SidebarLayout>
  );
};

export default AdminDashboardGerencial;
