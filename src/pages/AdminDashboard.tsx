import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Clock, Star, Users, TrendingUp, Timer, Filter, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, DashboardFilters } from "@/hooks/useDashboardStats";
import { useAttendantQueues } from "@/hooks/useChatRealtime";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<DashboardFilters>({ period: "today" });
  const [attendantOptions, setAttendantOptions] = useState<{ id: string; name: string }[]>([]);
  const { stats, loading } = useDashboardStats(filters);
  const { attendants, unassignedRooms, loading: queuesLoading } = useAttendantQueues();

  // ReadOnly dialog state
  const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string } | null>(null);

  // Current user's attendant profile id
  const [currentAttendantId, setCurrentAttendantId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendants = async () => {
      const { data } = await supabase
        .from("attendant_profiles")
        .select("id, display_name, user_id");
      if (data) {
        setAttendantOptions(data.map((a) => ({ id: a.id, name: a.display_name })));
        const mine = data.find((a) => a.user_id === user?.id);
        if (mine) setCurrentAttendantId(mine.id);
      }
    };
    fetchAttendants();
  }, [user?.id]);

  const metricCards = [
    { title: t("chat.dashboard.active_chats"), value: stats.activeChats, icon: MessageSquare, color: "text-blue-500" },
    { title: t("chat.dashboard.waiting"), value: stats.waitingChats, icon: Clock, color: "text-amber-500" },
    { title: t("chat.dashboard.csat_avg"), value: stats.avgCsat != null ? `${stats.avgCsat}/5` : "—", icon: Star, color: "text-yellow-500" },
    { title: t("chat.dashboard.online_attendants"), value: stats.onlineAttendants, icon: Users, color: "text-green-500" },
    { title: t("chat.dashboard.closed_today"), value: stats.chatsToday, icon: TrendingUp, color: "text-purple-500" },
    { title: t("chat.gerencial.resolution_rate"), value: stats.resolutionRate != null ? `${stats.resolutionRate}%` : "—", icon: TrendingUp, color: "text-emerald-500" },
    { title: t("chat.gerencial.avg_resolution"), value: stats.avgResolutionMinutes != null ? `${stats.avgResolutionMinutes}min` : "—", icon: Timer, color: "text-indigo-500" },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case "online":
      case "available":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "busy":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleRoomClick = (roomId: string, attendantId: string | null, visitorName: string) => {
    if (attendantId === currentAttendantId) {
      navigate(`/admin/workspace/${roomId}`);
    } else {
      setReadOnlyRoom({ id: roomId, name: visitorName });
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return "<1min";
    if (diff < 60) return `${diff}min`;
    return `${Math.floor(diff / 60)}h`;
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("chat.dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("chat.dashboard.subtitle")}</p>
        </div>

        {/* Filters */}
        <Card className="rounded-lg border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filters.period} onValueChange={(v) => setFilters((f) => ({ ...f, period: v as DashboardFilters["period"] }))}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("chat.gerencial.today")}</SelectItem>
                  <SelectItem value="week">{t("chat.gerencial.week")}</SelectItem>
                  <SelectItem value="month">{t("chat.gerencial.month_period")}</SelectItem>
                  <SelectItem value="all">{t("chat.gerencial.all_time")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.attendantId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, attendantId: v === "all" ? null : v }))}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("chat.gerencial.filter_by_attendant")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("chat.gerencial.all_time")}</SelectItem>
                  {attendantOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? null : v }))}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="waiting">Na Fila</SelectItem>
                  <SelectItem value="closed">Encerrado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.priority ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? null : v }))}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {metricCards.map((card) => (
            <Card key={card.title} className="rounded-lg border bg-card shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-medium uppercase tracking-wider">{card.title}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Real-time status */}
        <Card className="rounded-lg border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Status em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queuesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Attendant table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atendente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Na Fila</TableHead>
                      <TableHead className="text-center">Ativas</TableHead>
                      <TableHead className="text-center">Capacidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          Nenhum atendente cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendants.map((att) => (
                        <TableRow key={att.id}>
                          <TableCell className="font-medium">
                            {att.display_name}
                            {att.user_id === user?.id && (
                              <span className="text-xs text-muted-foreground ml-1">(você)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(att.status)}`}>
                              {att.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{att.waiting_count}</TableCell>
                          <TableCell className="text-center">{att.active_count}</TableCell>
                          <TableCell className="text-center">{att.max_conversations}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Unassigned rooms */}
                {unassignedRooms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Fila Geral (sem atendente)</h4>
                    <div className="space-y-1">
                      {unassignedRooms.map((room) => (
                        <div
                          key={room.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleRoomClick(room.id, null, room.visitor_name)}
                        >
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{room.visitor_name}</span>
                            <span className="text-xs text-muted-foreground">{timeAgo(room.created_at)} atrás</span>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                            <Eye className="h-3 w-3" />
                            Ver
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReadOnlyChatDialog
        roomId={readOnlyRoom?.id ?? null}
        visitorName={readOnlyRoom?.name ?? ""}
        open={!!readOnlyRoom}
        onOpenChange={(open) => !open && setReadOnlyRoom(null)}
      />
    </SidebarLayout>
  );
};

export default AdminDashboard;
