import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Clock, Star, Users, TrendingUp, Timer, Filter, Eye, ChevronDown, ChevronRight as ChevronRightIcon, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, DashboardFilters } from "@/hooks/useDashboardStats";
import { useAttendantQueues } from "@/hooks/useChatRealtime";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<DashboardFilters>({ period: "today" });
  const [attendantOptions, setAttendantOptions] = useState<{ id: string; name: string }[]>([]);
  const { stats, loading } = useDashboardStats(filters);
  const { attendants, unassignedRooms, loading: queuesLoading } = useAttendantQueues();

  // Previous period stats for delta
  const [prevStats, setPrevStats] = useState<{ totalChats: number; avgCsat: number | null; resolutionRate: number | null } | null>(null);

  // ReadOnly dialog state
  const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string } | null>(null);

  // Current user's attendant profile id
  const [currentAttendantId, setCurrentAttendantId] = useState<string | null>(null);

  // Expanded attendant rows
  const [expandedAttendant, setExpandedAttendant] = useState<string | null>(null);

  // Attendant rooms for expanded view
  const [attendantRooms, setAttendantRooms] = useState<Record<string, { id: string; visitor_name: string; status: string; created_at: string }[]>>({});

  // Last refresh time
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    setLastRefresh(new Date());
  }, [stats]);

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

  // Fetch previous period stats for delta calculation
  useEffect(() => {
    const fetchPrevStats = async () => {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      switch (filters.period) {
        case "today":
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "week":
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() - 7);
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() - 30);
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          setPrevStats(null);
          return;
      }

      let query = supabase
        .from("chat_rooms")
        .select("id, status, csat_score, resolution_status");

      if (startDate) query = query.gte("created_at", startDate.toISOString());
      if (endDate) query = query.lt("created_at", endDate.toISOString());

      const { data } = await query;
      if (!data || data.length === 0) {
        setPrevStats({ totalChats: 0, avgCsat: null, resolutionRate: null });
        return;
      }

      const withCsat = data.filter((r) => r.csat_score != null);
      const avgCsat = withCsat.length > 0
        ? Number((withCsat.reduce((s, r) => s + (r.csat_score ?? 0), 0) / withCsat.length).toFixed(1))
        : null;

      const closed = data.filter((r) => r.status === "closed");
      const resolved = closed.filter((r) => r.resolution_status === "resolved").length;
      const resolutionRate = closed.length > 0 ? Math.round((resolved / closed.length) * 100) : null;

      setPrevStats({ totalChats: data.length, avgCsat, resolutionRate });
    };
    fetchPrevStats();
  }, [filters.period]);

  // Fetch rooms for an expanded attendant
  const handleExpandAttendant = async (attendantId: string) => {
    if (expandedAttendant === attendantId) {
      setExpandedAttendant(null);
      return;
    }
    setExpandedAttendant(attendantId);

    if (!attendantRooms[attendantId]) {
      const { data } = await supabase
        .from("chat_rooms")
        .select("id, status, created_at, visitor_id, chat_visitors!visitor_id(name)")
        .eq("attendant_id", attendantId)
        .in("status", ["active", "waiting"])
        .order("created_at", { ascending: false });

      if (data) {
        const rooms = data.map((r: any) => ({
          id: r.id,
          visitor_name: r.chat_visitors?.name ?? "Visitante",
          status: r.status,
          created_at: r.created_at,
        }));
        setAttendantRooms((prev) => ({ ...prev, [attendantId]: rooms }));
      }
    }
  };

  const getDelta = (current: number, prev: number | null | undefined) => {
    if (prev == null || prev === 0) return null;
    const pct = Math.round(((current - prev) / prev) * 100);
    return pct;
  };

  const deltaIcon = (delta: number | null, invertColors = false) => {
    if (delta == null) return null;
    const isPositive = delta > 0;
    const color = invertColors
      ? (isPositive ? "text-red-500" : "text-green-500")
      : (isPositive ? "text-green-500" : "text-red-500");
    return (
      <span className={`flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {Math.abs(delta)}%
      </span>
    );
  };

  const metricCards = [
    { title: t("chat.dashboard.active_chats"), value: stats.activeChats, icon: MessageSquare, color: "text-blue-500", delta: null as number | null },
    { title: t("chat.dashboard.waiting"), value: stats.waitingChats, icon: Clock, color: "text-amber-500", delta: null as number | null },
    { title: t("chat.dashboard.csat_avg"), value: stats.avgCsat != null ? `${stats.avgCsat}/5` : "—", icon: Star, color: "text-yellow-500", delta: prevStats && stats.avgCsat != null && prevStats.avgCsat != null ? getDelta(stats.avgCsat, prevStats.avgCsat) : null },
    { title: t("chat.dashboard.online_attendants"), value: stats.onlineAttendants, icon: Users, color: "text-green-500", delta: null as number | null },
    { title: t("chat.dashboard.closed_today"), value: stats.chatsToday, icon: TrendingUp, color: "text-purple-500", delta: getDelta(stats.totalChats, prevStats?.totalChats) },
    { title: t("chat.gerencial.resolution_rate"), value: stats.resolutionRate != null ? `${stats.resolutionRate}%` : "—", icon: TrendingUp, color: "text-emerald-500", delta: prevStats && stats.resolutionRate != null && prevStats.resolutionRate != null ? getDelta(stats.resolutionRate, prevStats.resolutionRate) : null },
    { title: t("chat.gerencial.avg_resolution"), value: stats.avgResolutionMinutes != null ? `${stats.avgResolutionMinutes}min` : "—", icon: Timer, color: "text-indigo-500", delta: null as number | null },
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

  const lastRefreshLabel = () => {
    const diff = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (diff < 10) return "agora";
    if (diff < 60) return `${diff}s atrás`;
    return `${Math.floor(diff / 60)}min atrás`;
  };

  const capacityPercent = (active: number, max: number) => {
    if (max === 0) return 0;
    return Math.round((active / max) * 100);
  };

  const capacityColor = (pct: number) => {
    if (pct < 60) return "bg-green-500";
    if (pct < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title={t("chat.dashboard.title")} subtitle={t("chat.dashboard.subtitle")} />
          <span className="text-[10px] text-muted-foreground">
            Atualizado {lastRefreshLabel()}
          </span>
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

        {/* Section: Period Metrics */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Métricas do Período
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {metricCards.map((card) => (
              <Card key={card.title} className="rounded-lg border bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] font-medium uppercase tracking-wider">{card.title}</CardTitle>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-semibold">{card.value}</div>
                    {deltaIcon(card.delta)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Section: Real-time Status */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Status em Tempo Real
          </p>
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardContent className="pt-6">
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
                        <TableHead className="w-[200px]">Capacidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                            Nenhum atendente cadastrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendants.map((att) => {
                          const pct = capacityPercent(att.active_count, att.max_conversations);
                          const isExpanded = expandedAttendant === att.id;

                          return (
                            <Collapsible key={att.id} open={isExpanded} onOpenChange={() => handleExpandAttendant(att.id)} asChild>
                              <>
                                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpandAttendant(att.id)}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                      <CollapsibleTrigger asChild>
                                        <span className="shrink-0">
                                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                                        </span>
                                      </CollapsibleTrigger>
                                      {att.display_name}
                                      {att.user_id === user?.id && (
                                        <span className="text-xs text-muted-foreground ml-1">(você)</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(att.status)}`}>
                                      {att.status}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">{att.waiting_count}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <Progress
                                          value={pct}
                                          className="h-2"
                                          style={{
                                            ['--progress-color' as string]: pct < 60 ? 'hsl(142 71% 45%)' : pct < 80 ? 'hsl(48 96% 53%)' : 'hsl(0 84% 60%)',
                                          }}
                                        />
                                      </div>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {att.active_count}/{att.max_conversations}
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                <CollapsibleContent asChild>
                                  <TableRow>
                                    <TableCell colSpan={4} className="p-0">
                                      <div className="bg-muted/30 p-3 space-y-1">
                                        {(attendantRooms[att.id] ?? []).length === 0 ? (
                                          <p className="text-xs text-muted-foreground">Nenhuma conversa ativa</p>
                                        ) : (
                                          (attendantRooms[att.id] ?? []).map((room) => (
                                            <div
                                              key={room.id}
                                              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                                              onClick={(e) => { e.stopPropagation(); handleRoomClick(room.id, att.id, room.visitor_name); }}
                                            >
                                              <div className="flex items-center gap-2">
                                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm">{room.visitor_name}</span>
                                                <Badge variant={room.status === "active" ? "default" : "secondary"} className="text-[10px]">
                                                  {room.status}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">{timeAgo(room.created_at)}</span>
                                              </div>
                                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                                                <Eye className="h-3 w-3" />
                                                Ver
                                              </Button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </CollapsibleContent>
                              </>
                            </Collapsible>
                          );
                        })
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
