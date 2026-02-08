import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  totalChats: number;
  chatsToday: number;
  avgCsat: number | null;
  resolutionRate: number | null;
  avgResolutionMinutes: number | null;
  chartData: { date: string; total: number }[];
  chatsByAttendant: { name: string; count: number }[];
  resolutionDistribution: { status: string; count: number }[];
}

export interface DashboardFilters {
  period: "today" | "week" | "month" | "all";
  attendantId?: string | null;
}

export function useDashboardStats(filters: DashboardFilters) {
  const [stats, setStats] = useState<DashboardStats>({
    totalChats: 0,
    chatsToday: 0,
    avgCsat: null,
    resolutionRate: null,
    avgResolutionMinutes: null,
    chartData: [],
    chatsByAttendant: [],
    resolutionDistribution: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    // Calculate date range
    const now = new Date();
    let startDate: Date | null = null;
    switch (filters.period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "all":
        startDate = null;
        break;
    }

    // Fetch rooms
    let query = supabase
      .from("chat_rooms")
      .select("id, status, resolution_status, created_at, closed_at, csat_score, attendant_id");

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (filters.attendantId) {
      query = query.eq("attendant_id", filters.attendantId);
    }

    const { data: rooms } = await query;

    if (!rooms || rooms.length === 0) {
      setStats({
        totalChats: 0,
        chatsToday: 0,
        avgCsat: null,
        resolutionRate: null,
        avgResolutionMinutes: null,
        chartData: [],
        chatsByAttendant: [],
        resolutionDistribution: [],
      });
      setLoading(false);
      return;
    }

    // Total chats
    const totalChats = rooms.length;

    // Chats today
    const todayStr = now.toISOString().slice(0, 10);
    const chatsToday = rooms.filter((r) => r.created_at?.slice(0, 10) === todayStr).length;

    // Avg CSAT
    const withCsat = rooms.filter((r) => r.csat_score != null);
    const avgCsat = withCsat.length > 0
      ? Number((withCsat.reduce((s, r) => s + (r.csat_score ?? 0), 0) / withCsat.length).toFixed(1))
      : null;

    // Resolution rate
    const closedRooms = rooms.filter((r) => r.status === "closed");
    const resolvedCount = closedRooms.filter((r) => r.resolution_status === "resolved").length;
    const resolutionRate = closedRooms.length > 0
      ? Math.round((resolvedCount / closedRooms.length) * 100)
      : null;

    // Avg resolution time (minutes)
    const roomsWithTimes = closedRooms.filter((r) => r.created_at && r.closed_at);
    let avgResolutionMinutes: number | null = null;
    if (roomsWithTimes.length > 0) {
      const totalMinutes = roomsWithTimes.reduce((sum, r) => {
        const start = new Date(r.created_at!).getTime();
        const end = new Date(r.closed_at!).getTime();
        return sum + (end - start) / 60000;
      }, 0);
      avgResolutionMinutes = Math.round(totalMinutes / roomsWithTimes.length);
    }

    // Chart data (by day)
    const byDay: Record<string, number> = {};
    rooms.forEach((r) => {
      const day = r.created_at?.slice(0, 10) ?? "";
      byDay[day] = (byDay[day] ?? 0) + 1;
    });
    const chartData = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date: date.slice(5), total }));

    // Chats by attendant
    const byAttendant: Record<string, number> = {};
    rooms.forEach((r) => {
      if (r.attendant_id) {
        byAttendant[r.attendant_id] = (byAttendant[r.attendant_id] ?? 0) + 1;
      }
    });

    let chatsByAttendant: { name: string; count: number }[] = [];
    const attendantIds = Object.keys(byAttendant);
    if (attendantIds.length > 0) {
      const { data: attendants } = await supabase
        .from("attendant_profiles")
        .select("id, display_name")
        .in("id", attendantIds);

      const nameMap = new Map(attendants?.map((a) => [a.id, a.display_name]) ?? []);
      chatsByAttendant = attendantIds
        .map((id) => ({ name: nameMap.get(id) ?? id.slice(0, 8), count: byAttendant[id] }))
        .sort((a, b) => b.count - a.count);
    }

    // Resolution distribution
    const resDist: Record<string, number> = {};
    closedRooms.forEach((r) => {
      const st = r.resolution_status ?? "pending";
      resDist[st] = (resDist[st] ?? 0) + 1;
    });
    const resolutionDistribution = Object.entries(resDist).map(([status, count]) => ({ status, count }));

    setStats({
      totalChats,
      chatsToday,
      avgCsat,
      resolutionRate,
      avgResolutionMinutes,
      chartData,
      chatsByAttendant,
      resolutionDistribution,
    });
    setLoading(false);
  }, [filters.period, filters.attendantId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
