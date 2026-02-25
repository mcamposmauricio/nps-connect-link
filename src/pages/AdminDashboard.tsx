import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Clock, Star, Users, TrendingUp, Timer, Filter, Eye, ChevronDown, ChevronRight as ChevronRightIcon, ArrowUp, ArrowDown, AlertTriangle, Zap, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, DashboardFilters } from "@/hooks/useDashboardStats";
import { useAttendantQueues } from "@/hooks/useChatRealtime";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<DashboardFilters>({ period: "today" });
  const [attendantOptions, setAttendantOptions] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const { stats, loading } = useDashboardStats(filters);
  const { attendants, unassignedRooms, loading: queuesLoading } = useAttendantQueues();

  // Teams data for grouping
  const [teams, setTeams] = useState<{ id: string; name: string; memberIds: string[] }[]>([]);

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
    const fetchAttendantsAndMeta = async () => {
      const [attRes, catRes, tagRes, teamRes, memberRes] = await Promise.all([
        supabase.from("attendant_profiles").select("id, display_name, user_id"),
        supabase.from("chat_service_categories").select("id, name").order("name"),
        supabase.from("chat_tags").select("id, name").order("name"),
        supabase.from("chat_teams").select("id, name").order("name"),
        supabase.from("chat_team_members").select("team_id, attendant_id"),
      ]);
      if (attRes.data) {
        setAttendantOptions(attRes.data.map((a) => ({ id: a.id, name: a.display_name })));
        const mine = attRes.data.find((a) => a.user_id === user?.id);
        if (mine) setCurrentAttendantId(mine.id);
      }
      setCategories(catRes.data ?? []);
      setTags(tagRes.data ?? []);

      // Build teams with member lists
      const teamData = teamRes.data ?? [];
      const memberData = memberRes.data ?? [];
      setTeams(teamData.map((team) => ({
        id: team.id,
        name: team.name,
        memberIds: memberData.filter((m) => m.team_id === team.id).map((m) => m.attendant_id),
      })));
    };
    fetchAttendantsAndMeta();
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
    { title: t("chat.gerencial.avg_first_response"), value: stats.avgFirstResponseMinutes != null ? `${stats.avgFirstResponseMinutes}min` : "—", icon: Zap, color: "text-orange-500", delta: null as number | null },
    { title: t("chat.gerencial.unresolved_chats"), value: stats.unresolvedChats, icon: AlertTriangle, color: "text-red-500", delta: null as number | null },
    { title: t("chat.dashboard.avg_wait_time"), value: stats.avgWaitMinutes != null ? `${stats.avgWaitMinutes}min` : "—", icon: Clock, color: "text-cyan-500", delta: null as number | null },
    { title: t("chat.dashboard.abandonment_rate"), value: stats.abandonmentRate != null ? `${stats.abandonmentRate}%` : "—", icon: TrendingDown, color: "text-rose-500", delta: null as number | null },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case "online":
      case "available":
        return "bg-green-100 text-green-700";
      case "busy":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const skillBadge = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "senior":
        return <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200">Senior</Badge>;
      case "pleno":
        return <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">Pleno</Badge>;
      default:
        return <Badge className="text-[9px] bg-gray-100 text-gray-600 border-gray-200">Junior</Badge>;
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

  // Group attendants by team
  const getTeamGroups = () => {
    const assignedAttendantIds = new Set<string>();
    const groups: { teamName: string; teamId: string | null; members: typeof attendants; summary: { online: number; activeTotal: number; avgCapacity: number } }[] = [];

    teams.forEach((team) => {
      const members = attendants.filter((a) => team.memberIds.includes(a.id));
      if (members.length === 0) return;
      members.forEach((m) => assignedAttendantIds.add(m.id));

      const online = members.filter((m) => m.status === "online" || m.status === "available").length;
      const activeTotal = members.reduce((s, m) => s + m.active_count, 0);
      const totalCap = members.reduce((s, m) => s + m.max_conversations, 0);
      const avgCapacity = totalCap > 0 ? Math.round((activeTotal / totalCap) * 100) : 0;

      groups.push({ teamName: team.name, teamId: team.id, members, summary: { online, activeTotal, avgCapacity } });
    });

    // Unassigned to teams
    const unassigned = attendants.filter((a) => !assignedAttendantIds.has(a.id));
    if (unassigned.length > 0) {
      const online = unassigned.filter((m) => m.status === "online" || m.status === "available").length;
      const activeTotal = unassigned.reduce((s, m) => s + m.active_count, 0);
      const totalCap = unassigned.reduce((s, m) => s + m.max_conversations, 0);
      const avgCapacity = totalCap > 0 ? Math.round((activeTotal / totalCap) * 100) : 0;
      groups.push({ teamName: t("chat.dashboard.no_team"), teamId: null, members: unassigned, summary: { online, activeTotal, avgCapacity } });
    }

    return groups;
  };

  const resolutionColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-green-100 text-green-800";
      case "pending": return "bg-orange-100 text-orange-800";
      case "escalated": return "bg-red-100 text-red-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const PIE_COLORS = ["hsl(142,71%,45%)", "hsl(33,90%,55%)", "hsl(0,84%,60%)", "hsl(220,70%,55%)"];

  const renderAttendantRow = (att: typeof attendants[0]) => {
    const pct = capacityPercent(att.active_count, att.max_conversations);
    const isExpanded = expandedAttendant === att.id;

    return (
      <Collapsible key={att.id} open={isExpanded} onOpenChange={() => handleExpandAttendant(att.id)} asChild>
        <>
          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpandAttendant(att.id)}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-1.5">
                <CollapsibleTrigger asChild>
                  <span className="shrink-0">
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                  </span>
                </CollapsibleTrigger>
                <span className={`h-2 w-2 rounded-full shrink-0 ${att.status === "online" ? "bg-green-500" : att.status === "busy" ? "bg-amber-500" : "bg-gray-400"}`} />
                {att.display_name}
                {att.user_id === user?.id && (
                  <span className="text-xs text-muted-foreground ml-1">(você)</span>
                )}
              </div>
            </TableCell>
            <TableCell>{skillBadge((att as any).skill_level)}</TableCell>
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
              <TableCell colSpan={5} className="p-0">
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
  };

  const teamGroups = getTeamGroups();

  return (
    <>
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

              {categories.length > 0 && (
                <Select value={filters.categoryId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v === "all" ? null : v }))}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("chat.gerencial.filter_by_category")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {tags.length > 0 && (
                <Select value={filters.tagId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, tagId: v === "all" ? null : v }))}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tag" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Tags</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section: Period Metrics */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Métricas do Período
          </p>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardHeader><CardTitle>{t("chat.gerencial.conversations_per_day")}</CardTitle></CardHeader>
            <CardContent>
              {stats.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="total" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-sm">
            <CardHeader><CardTitle>{t("chat.gerencial.csat_evolution")}</CardTitle></CardHeader>
            <CardContent>
              {stats.csatByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.csatByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-sm">
            <CardHeader><CardTitle>{t("chat.gerencial.peak_hours")}</CardTitle></CardHeader>
            <CardContent>
              {stats.chatsByHour.some(h => h.count > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.chatsByHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip labelFormatter={(h) => `${h}:00`} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-sm">
            <CardHeader><CardTitle>{t("chat.gerencial.resolution_distribution")}</CardTitle></CardHeader>
            <CardContent>
              {stats.resolutionDistribution.length > 0 ? (
                <div className="flex flex-wrap gap-4 py-8 justify-center">
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
                <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Attendant Performance Table */}
        {stats.attendantPerformance.length > 0 && (
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{t("chat.gerencial.attendant_performance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("chat.gerencial.attendant")}</TableHead>
                    <TableHead>{t("chat.dashboard.team_col")}</TableHead>
                    <TableHead className="text-right">{t("chat.gerencial.chats_col")}</TableHead>
                    <TableHead className="text-right">{t("chat.gerencial.csat_col")}</TableHead>
                    <TableHead className="text-right">{t("chat.gerencial.resolution_col")}</TableHead>
                    <TableHead className="text-right">{t("chat.gerencial.avg_time_col")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.attendantPerformance.map((att) => {
                    const attId = attendantOptions.find((a) => a.name === att.name)?.id;
                    const teamName = teams.find((t) => attId && t.memberIds.includes(attId))?.name ?? "—";
                    return (
                      <TableRow key={att.name}>
                        <TableCell className="font-medium">{att.name}</TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{teamName}</span></TableCell>
                        <TableCell className="text-right">{att.chats}</TableCell>
                        <TableCell className="text-right">{att.csat != null ? `${att.csat}/5` : "—"}</TableCell>
                        <TableCell className="text-right">{att.resolutionRate != null ? `${att.resolutionRate}%` : "—"}</TableCell>
                        <TableCell className="text-right">{att.avgResolution != null ? `${att.avgResolution}min` : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Section: Real-time Status by Team */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Status em Tempo Real
          </p>

          {queuesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {teamGroups.length === 0 ? (
                <Card className="rounded-lg border bg-card shadow-sm">
                  <CardContent className="py-6 text-center text-muted-foreground">
                    Nenhum atendente cadastrado
                  </CardContent>
                </Card>
              ) : (
                teamGroups.map((group) => (
                  <Card key={group.teamId ?? "none"} className="rounded-lg border bg-card shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{group.teamName}</CardTitle>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            {group.summary.online} online
                          </span>
                          <span>{group.summary.activeTotal} {t("chat.dashboard.active_conversations")}</span>
                          <span>{t("chat.dashboard.capacity")}: {group.summary.avgCapacity}%</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("chat.gerencial.attendant")}</TableHead>
                            <TableHead>{t("chat.dashboard.skill_level")}</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">{t("chat.dashboard.in_queue")}</TableHead>
                            <TableHead className="w-[200px]">{t("chat.dashboard.capacity")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.members.map((att) => renderAttendantRow(att))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Unassigned rooms */}
              {unassignedRooms.length > 0 && (
                <Card className="rounded-lg border bg-card shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t("chat.dashboard.unassigned_queue")}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
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
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <ReadOnlyChatDialog
        roomId={readOnlyRoom?.id ?? null}
        visitorName={readOnlyRoom?.name ?? ""}
        open={!!readOnlyRoom}
        onOpenChange={(open) => !open && setReadOnlyRoom(null)}
      />
    </>
  );
};

export default AdminDashboard;
