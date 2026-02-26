import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Clock, Star, Users, TrendingUp, Timer, Eye, ChevronDown, ChevronRight as ChevronRightIcon, ArrowUp, ArrowDown, AlertTriangle, Zap, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, DashboardFilters } from "@/hooks/useDashboardStats";
import { useAttendantQueues } from "@/hooks/useChatRealtime";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionLabel } from "@/components/ui/section-label";
import { FilterBar } from "@/components/ui/filter-bar";
import { ChartCard } from "@/components/ui/chart-card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

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

  const [teams, setTeams] = useState<{ id: string; name: string; memberIds: string[] }[]>([]);
  const [prevStats, setPrevStats] = useState<{ totalChats: number; avgCsat: number | null; resolutionRate: number | null } | null>(null);
  const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string } | null>(null);
  const [currentAttendantId, setCurrentAttendantId] = useState<string | null>(null);
  const [expandedAttendant, setExpandedAttendant] = useState<string | null>(null);
  const [attendantRooms, setAttendantRooms] = useState<Record<string, { id: string; visitor_name: string; status: string; created_at: string }[]>>({});
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => { setLastRefresh(new Date()); }, [stats]);

  useEffect(() => {
    const fetchMeta = async () => {
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
      const teamData = teamRes.data ?? [];
      const memberData = memberRes.data ?? [];
      setTeams(teamData.map((team) => ({
        id: team.id, name: team.name,
        memberIds: memberData.filter((m) => m.team_id === team.id).map((m) => m.attendant_id),
      })));
    };
    fetchMeta();
  }, [user?.id]);

  useEffect(() => {
    const fetchPrevStats = async () => {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      switch (filters.period) {
        case "today":
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 1); break;
        case "week":
          endDate = new Date(now); endDate.setDate(endDate.getDate() - 7);
          startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 7); break;
        case "month":
          endDate = new Date(now); endDate.setDate(endDate.getDate() - 30);
          startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 30); break;
        default: setPrevStats(null); return;
      }
      let query = supabase.from("chat_rooms").select("id, status, csat_score, resolution_status");
      if (startDate) query = query.gte("created_at", startDate.toISOString());
      if (endDate) query = query.lt("created_at", endDate.toISOString());
      const { data } = await query;
      if (!data || data.length === 0) { setPrevStats({ totalChats: 0, avgCsat: null, resolutionRate: null }); return; }
      const withCsat = data.filter((r) => r.csat_score != null);
      const avgCsat = withCsat.length > 0 ? Number((withCsat.reduce((s, r) => s + (r.csat_score ?? 0), 0) / withCsat.length).toFixed(1)) : null;
      const closed = data.filter((r) => r.status === "closed");
      const resolved = closed.filter((r) => r.resolution_status === "resolved").length;
      const resolutionRate = closed.length > 0 ? Math.round((resolved / closed.length) * 100) : null;
      setPrevStats({ totalChats: data.length, avgCsat, resolutionRate });
    };
    fetchPrevStats();
  }, [filters.period]);

  const handleExpandAttendant = async (attendantId: string) => {
    if (expandedAttendant === attendantId) { setExpandedAttendant(null); return; }
    setExpandedAttendant(attendantId);
    if (!attendantRooms[attendantId]) {
      const { data } = await supabase.from("chat_rooms")
        .select("id, status, created_at, visitor_id, chat_visitors!visitor_id(name)")
        .eq("attendant_id", attendantId).in("status", ["active", "waiting"])
        .order("created_at", { ascending: false });
      if (data) {
        const rooms = data.map((r: any) => ({ id: r.id, visitor_name: r.chat_visitors?.name ?? "Visitante", status: r.status, created_at: r.created_at }));
        setAttendantRooms((prev) => ({ ...prev, [attendantId]: rooms }));
      }
    }
  };

  const getDelta = (current: number, prev: number | null | undefined) => {
    if (prev == null || prev === 0) return null;
    return Math.round(((current - prev) / prev) * 100);
  };

  const handleRoomClick = (roomId: string, attendantId: string | null, visitorName: string) => {
    if (attendantId === currentAttendantId) navigate(`/admin/workspace/${roomId}`);
    else setReadOnlyRoom({ id: roomId, name: visitorName });
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

  const capacityPercent = (active: number, max: number) => max === 0 ? 0 : Math.round((active / max) * 100);

  const getTeamGroups = () => {
    const assignedIds = new Set<string>();
    const groups: { teamName: string; teamId: string | null; members: typeof attendants; summary: { online: number; activeTotal: number; avgCapacity: number } }[] = [];
    teams.forEach((team) => {
      const members = attendants.filter((a) => team.memberIds.includes(a.id));
      if (members.length === 0) return;
      members.forEach((m) => assignedIds.add(m.id));
      const online = members.filter((m) => m.status === "online" || m.status === "available").length;
      const activeTotal = members.reduce((s, m) => s + m.active_count, 0);
      const totalCap = members.reduce((s, m) => s + m.max_conversations, 0);
      groups.push({ teamName: team.name, teamId: team.id, members, summary: { online, activeTotal, avgCapacity: totalCap > 0 ? Math.round((activeTotal / totalCap) * 100) : 0 } });
    });
    const unassigned = attendants.filter((a) => !assignedIds.has(a.id));
    if (unassigned.length > 0) {
      const online = unassigned.filter((m) => m.status === "online" || m.status === "available").length;
      const activeTotal = unassigned.reduce((s, m) => s + m.active_count, 0);
      const totalCap = unassigned.reduce((s, m) => s + m.max_conversations, 0);
      groups.push({ teamName: t("chat.dashboard.no_team"), teamId: null, members: unassigned, summary: { online, activeTotal, avgCapacity: totalCap > 0 ? Math.round((activeTotal / totalCap) * 100) : 0 } });
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

  const skillBadge = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "senior": return <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200">Senior</Badge>;
      case "pleno": return <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">Pleno</Badge>;
      default: return <Badge className="text-[9px] bg-gray-100 text-gray-600 border-gray-200">Junior</Badge>;
    }
  };

  const metricCards = [
    { title: t("chat.dashboard.active_chats"), value: stats.activeChats, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10", delta: null as number | null },
    { title: t("chat.dashboard.waiting"), value: stats.waitingChats, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", delta: null as number | null },
    { title: t("chat.dashboard.closed_today"), value: stats.chatsToday, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10", delta: getDelta(stats.totalChats, prevStats?.totalChats) },
    { title: t("chat.dashboard.online_attendants"), value: stats.onlineAttendants, icon: Users, color: "text-green-500", bg: "bg-green-500/10", delta: null as number | null },
    { title: t("chat.dashboard.csat_avg"), value: stats.avgCsat != null ? `${stats.avgCsat}/5` : "—", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10", delta: prevStats && stats.avgCsat != null && prevStats.avgCsat != null ? getDelta(stats.avgCsat, prevStats.avgCsat) : null },
    { title: t("chat.gerencial.resolution_rate"), value: stats.resolutionRate != null ? `${stats.resolutionRate}%` : "—", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", delta: prevStats && stats.resolutionRate != null && prevStats.resolutionRate != null ? getDelta(stats.resolutionRate, prevStats.resolutionRate) : null },
    { title: t("chat.dashboard.avg_wait_time"), value: stats.avgWaitMinutes != null ? `${stats.avgWaitMinutes}min` : "—", icon: Clock, color: "text-cyan-500", bg: "bg-cyan-500/10", delta: null as number | null },
    { title: t("chat.gerencial.avg_first_response"), value: stats.avgFirstResponseMinutes != null ? `${stats.avgFirstResponseMinutes}min` : "—", icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10", delta: null as number | null },
    { title: t("chat.gerencial.unresolved_chats"), value: stats.unresolvedChats, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", delta: null as number | null },
    { title: t("chat.gerencial.avg_resolution"), value: stats.avgResolutionMinutes != null ? `${stats.avgResolutionMinutes}min` : "—", icon: Timer, color: "text-indigo-500", bg: "bg-indigo-500/10", delta: null as number | null },
    { title: t("chat.dashboard.abandonment_rate"), value: stats.abandonmentRate != null ? `${stats.abandonmentRate}%` : "—", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", delta: null as number | null },
  ];

  const teamGroups = getTeamGroups();

  const renderAttendantRow = (att: typeof attendants[0]) => {
    const pct = capacityPercent(att.active_count, att.max_conversations);
    const isExpanded = expandedAttendant === att.id;
    return (
      <Collapsible key={att.id} open={isExpanded} onOpenChange={() => handleExpandAttendant(att.id)} asChild>
        <>
          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpandAttendant(att.id)}>
            <TableCell className="text-[13px] font-medium">
              <div className="flex items-center gap-1.5">
                <CollapsibleTrigger asChild>
                  <span className="shrink-0">{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}</span>
                </CollapsibleTrigger>
                <span className={`h-2 w-2 rounded-full shrink-0 ${att.status === "online" ? "bg-green-500" : att.status === "busy" ? "bg-amber-500" : "bg-gray-400"}`} />
                {att.display_name}
                {att.user_id === user?.id && <span className="text-[11px] text-muted-foreground ml-1">(você)</span>}
              </div>
            </TableCell>
            <TableCell>{skillBadge((att as any).skill_level)}</TableCell>
            <TableCell>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${att.status === "online" || att.status === "available" ? "bg-green-100 text-green-700" : att.status === "busy" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                {att.status}
              </span>
            </TableCell>
            <TableCell className="text-center text-[13px]">{att.waiting_count}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Progress value={pct} className="h-1.5" style={{ ['--progress-color' as string]: pct < 60 ? 'hsl(142 71% 45%)' : pct < 80 ? 'hsl(48 96% 53%)' : 'hsl(0 84% 60%)' }} />
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">{att.active_count}/{att.max_conversations}</span>
              </div>
            </TableCell>
          </TableRow>
          <CollapsibleContent asChild>
            <TableRow>
              <TableCell colSpan={5} className="p-0">
                <div className="bg-muted/30 p-3 space-y-1">
                  {(attendantRooms[att.id] ?? []).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Nenhuma conversa ativa</p>
                  ) : (
                    (attendantRooms[att.id] ?? []).map((room) => (
                      <div key={room.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleRoomClick(room.id, att.id, room.visitor_name); }}>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[13px]">{room.visitor_name}</span>
                          <Badge variant={room.status === "active" ? "default" : "secondary"} className="text-[10px]">{room.status}</Badge>
                          <span className="text-[11px] text-muted-foreground">{timeAgo(room.created_at)}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1"><Eye className="h-3 w-3" />Ver</Button>
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

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader title={t("chat.dashboard.title")} subtitle={t("chat.dashboard.subtitle")} />
          <span className="text-[10px] text-muted-foreground/60">Atualizado {lastRefreshLabel()}</span>
        </div>

        {/* Filters */}
        <FilterBar>
          <Select value={filters.period} onValueChange={(v) => setFilters((f) => ({ ...f, period: v as DashboardFilters["period"] }))}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t("chat.gerencial.today")}</SelectItem>
              <SelectItem value="week">{t("chat.gerencial.week")}</SelectItem>
              <SelectItem value="month">{t("chat.gerencial.month_period")}</SelectItem>
              <SelectItem value="all">{t("chat.gerencial.all_time")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.attendantId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, attendantId: v === "all" ? null : v }))}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder={t("chat.gerencial.filter_by_attendant")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all_attendants")}</SelectItem>
              {attendantOptions.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? null : v }))}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all_status")}</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="waiting">Na Fila</SelectItem>
              <SelectItem value="closed">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? null : v }))}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all_categories")}</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
          {categories.length > 0 && (
            <Select value={filters.categoryId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v === "all" ? null : v }))}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder={t("chat.gerencial.filter_by_category")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {tags.length > 0 && (
            <Select value={filters.tagId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, tagId: v === "all" ? null : v }))}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filter.all_tags")}</SelectItem>
                {tags.map((tag) => <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}
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
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {metricCards.map((card) => (
                  <MetricCard key={card.title} title={card.title} value={card.value} icon={card.icon} iconColor={card.color} iconBgColor={card.bg} delta={card.delta} />
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title={t("chat.gerencial.conversations_per_day")} isEmpty={stats.chartData.length === 0} emptyText={t("chat.gerencial.no_data")}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="total" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={t("chat.gerencial.csat_evolution")} isEmpty={stats.csatByDay.length === 0} emptyText={t("chat.gerencial.no_data")}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.csatByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
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
                    <RechartsTooltip labelFormatter={(h) => `${h}:00`} />
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
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.dashboard.team_col")}</TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.chats_col")}</TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.csat_col")}</TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.resolution_col")}</TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.avg_time_col")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.attendantPerformance.map((att) => {
                          const attId = attendantOptions.find((a) => a.name === att.name)?.id;
                          const teamName = teams.find((t) => attId && t.memberIds.includes(attId))?.name ?? "—";
                          return (
                            <TableRow key={att.name}>
                              <TableCell className="text-[13px] font-medium">{att.name}</TableCell>
                              <TableCell className="text-[13px] text-muted-foreground">{teamName}</TableCell>
                              <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.chats}</TableCell>
                              <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.csat != null ? `${att.csat}/5` : "—"}</TableCell>
                              <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.resolutionRate != null ? `${att.resolutionRate}%` : "—"}</TableCell>
                              <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.avgResolution != null ? `${att.avgResolution}min` : "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Real-time Status by Team */}
            <div>
              <SectionLabel>Status em Tempo Real</SectionLabel>
              {queuesLoading ? (
                <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
              ) : (
                <div className="space-y-4">
                  {teamGroups.length === 0 ? (
                    <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                      <CardContent className="py-6 text-center text-[13px] text-muted-foreground">Nenhum atendente cadastrado</CardContent>
                    </Card>
                  ) : (
                    teamGroups.map((group) => (
                      <Card key={group.teamId ?? "none"} className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                          <p className="text-sm font-medium">{group.teamName}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />{group.summary.online} online</span>
                            <span>·</span>
                            <span>{group.summary.activeTotal} {t("chat.dashboard.active_conversations")}</span>
                            <span>·</span>
                            <span>{t("chat.dashboard.capacity")}: {group.summary.avgCapacity}%</span>
                          </div>
                        </div>
                        <CardContent className="px-4 pb-4 pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.gerencial.attendant")}</TableHead>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.dashboard.skill_level")}</TableHead>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">{t("chat.dashboard.in_queue")}</TableHead>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-[200px]">{t("chat.dashboard.capacity")}</TableHead>
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

                  {unassignedRooms.length > 0 && (
                    <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                      <div className="px-4 pt-4 pb-2"><p className="text-sm font-medium">{t("chat.dashboard.unassigned_queue")}</p></div>
                      <CardContent className="px-4 pb-4 pt-0">
                        <div className="space-y-1">
                          {unassignedRooms.map((room) => (
                            <div key={room.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                              onClick={() => handleRoomClick(room.id, null, room.visitor_name)}>
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[13px]">{room.visitor_name}</span>
                                <span className="text-[11px] text-muted-foreground">{timeAgo(room.created_at)} atrás</span>
                              </div>
                              <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1"><Eye className="h-3 w-3" />Ver</Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ReadOnlyChatDialog roomId={readOnlyRoom?.id ?? null} visitorName={readOnlyRoom?.name ?? ""} open={!!readOnlyRoom} onOpenChange={(open) => !open && setReadOnlyRoom(null)} />
    </>
  );
};

export default AdminDashboard;
