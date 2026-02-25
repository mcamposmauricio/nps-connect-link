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
  activeChats: number;
  waitingChats: number;
  onlineAttendants: number;
  avgFirstResponseMinutes: number | null;
  unresolvedChats: number;
  csatByDay: { date: string; avg: number }[];
  attendantPerformance: { name: string; chats: number; csat: number | null; resolutionRate: number | null; avgResolution: number | null }[];
  chatsByHour: { hour: number; count: number }[];
  avgWaitMinutes: number | null;
  abandonmentRate: number | null;
}

export interface DashboardFilters {
  period: "today" | "week" | "month" | "all";
  attendantId?: string | null;
  status?: string | null;
  priority?: string | null;
  categoryId?: string | null;
  tagId?: string | null;
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
    activeChats: 0,
    waitingChats: 0,
    onlineAttendants: 0,
    avgFirstResponseMinutes: null,
    unresolvedChats: 0,
    csatByDay: [],
    attendantPerformance: [],
    chatsByHour: [],
    avgWaitMinutes: null,
    abandonmentRate: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);

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

    // Build rooms query
    let query = supabase
      .from("chat_rooms")
      .select("id, status, resolution_status, created_at, closed_at, csat_score, attendant_id, priority, contact_id");

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (filters.attendantId) {
      query = query.eq("attendant_id", filters.attendantId);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.priority) {
      query = query.eq("priority", filters.priority);
    }

    // If filtering by category, we need to get contact IDs for that category first
    let categoryContactIds: string[] | null = null;
    if (filters.categoryId) {
      const { data: catContacts } = await supabase
        .from("contacts")
        .select("id")
        .eq("service_category_id", filters.categoryId);
      categoryContactIds = catContacts?.map(c => c.id) ?? [];
    }

    // If filtering by tag, get room IDs that have this tag
    let tagRoomIds: string[] | null = null;
    if (filters.tagId) {
      const { data: tagRooms } = await supabase
        .from("chat_room_tags")
        .select("room_id")
        .eq("tag_id", filters.tagId);
      tagRoomIds = tagRooms?.map(r => r.room_id) ?? [];
      if (tagRoomIds.length === 0) {
        // No rooms with this tag, return empty stats
        setStats({
          totalChats: 0, chatsToday: 0, avgCsat: null, resolutionRate: null,
          avgResolutionMinutes: null, chartData: [], chatsByAttendant: [],
          resolutionDistribution: [], activeChats: 0, waitingChats: 0,
          onlineAttendants: 0, avgFirstResponseMinutes: null, unresolvedChats: 0,
          csatByDay: [], attendantPerformance: [], chatsByHour: [],
          avgWaitMinutes: null, abandonmentRate: null,
        });
        setLoading(false);
        return;
      }
    }

    const [roomsRes, attendantsRes] = await Promise.all([
      query,
      supabase.from("attendant_profiles").select("id, display_name, status"),
    ]);

    let rooms = roomsRes.data ?? [];
    const allAttendants = attendantsRes.data ?? [];

    // Filter by category if needed
    if (categoryContactIds !== null) {
      rooms = rooms.filter(r => r.contact_id && categoryContactIds!.includes(r.contact_id));
    }

    // Filter by tag if needed
    if (tagRoomIds !== null) {
      const tagSet = new Set(tagRoomIds);
      rooms = rooms.filter(r => tagSet.has(r.id));
    }

    const onlineAttendants = allAttendants.filter((a) => a.status === "available" || a.status === "online").length;

    if (rooms.length === 0) {
      setStats({
        totalChats: 0, chatsToday: 0, avgCsat: null, resolutionRate: null,
        avgResolutionMinutes: null, chartData: [], chatsByAttendant: [],
        resolutionDistribution: [], activeChats: 0, waitingChats: 0,
        onlineAttendants, avgFirstResponseMinutes: null, unresolvedChats: 0,
        csatByDay: [], attendantPerformance: [], chatsByHour: [],
        avgWaitMinutes: null, abandonmentRate: null,
      });
      setLoading(false);
      return;
    }

    const totalChats = rooms.length;
    const todayStr = now.toISOString().slice(0, 10);
    const chatsToday = rooms.filter((r) => r.created_at?.slice(0, 10) === todayStr).length;
    const activeChats = rooms.filter((r) => r.status === "active").length;
    const waitingChats = rooms.filter((r) => r.status === "waiting").length;

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

    // Avg resolution time
    const roomsWithTimes = closedRooms.filter((r) => r.created_at && r.closed_at);
    let avgResolutionMinutes: number | null = null;
    if (roomsWithTimes.length > 0) {
      const totalMinutes = roomsWithTimes.reduce((sum, r) => {
        return sum + (new Date(r.closed_at!).getTime() - new Date(r.created_at!).getTime()) / 60000;
      }, 0);
      avgResolutionMinutes = Math.round(totalMinutes / roomsWithTimes.length);
    }

    // Unresolved chats
    const unresolvedChats = closedRooms.filter((r) => r.resolution_status === "pending").length;

    // Chart data (by day)
    const byDay: Record<string, number> = {};
    rooms.forEach((r) => {
      const day = r.created_at?.slice(0, 10) ?? "";
      byDay[day] = (byDay[day] ?? 0) + 1;
    });
    const chartData = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date: date.slice(5), total }));

    // CSAT by day
    const csatByDayMap: Record<string, { sum: number; count: number }> = {};
    rooms.forEach((r) => {
      if (r.csat_score != null && r.created_at) {
        const day = r.created_at.slice(0, 10);
        if (!csatByDayMap[day]) csatByDayMap[day] = { sum: 0, count: 0 };
        csatByDayMap[day].sum += r.csat_score;
        csatByDayMap[day].count += 1;
      }
    });
    const csatByDay = Object.entries(csatByDayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: date.slice(5), avg: Number((v.sum / v.count).toFixed(1)) }));

    // Chats by hour
    const byHour: Record<number, number> = {};
    rooms.forEach((r) => {
      if (r.created_at) {
        const hour = new Date(r.created_at).getHours();
        byHour[hour] = (byHour[hour] ?? 0) + 1;
      }
    });
    const chatsByHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: byHour[h] ?? 0 }));

    // Chats by attendant & performance
    const byAttendant: Record<string, typeof rooms> = {};
    rooms.forEach((r) => {
      if (r.attendant_id) {
        if (!byAttendant[r.attendant_id]) byAttendant[r.attendant_id] = [];
        byAttendant[r.attendant_id].push(r);
      }
    });

    const nameMap = new Map(allAttendants.map((a) => [a.id, a.display_name]));
    const chatsByAttendant = Object.keys(byAttendant)
      .map((id) => ({ name: nameMap.get(id) ?? id.slice(0, 8), count: byAttendant[id].length }))
      .sort((a, b) => b.count - a.count);

    const attendantPerformance = Object.keys(byAttendant).map((id) => {
      const attRooms = byAttendant[id];
      const attCsat = attRooms.filter(r => r.csat_score != null);
      const attClosed = attRooms.filter(r => r.status === "closed");
      const attResolved = attClosed.filter(r => r.resolution_status === "resolved");
      const attWithTimes = attClosed.filter(r => r.created_at && r.closed_at);
      let attAvgRes: number | null = null;
      if (attWithTimes.length > 0) {
        const total = attWithTimes.reduce((s, r) => s + (new Date(r.closed_at!).getTime() - new Date(r.created_at!).getTime()) / 60000, 0);
        attAvgRes = Math.round(total / attWithTimes.length);
      }
      return {
        name: nameMap.get(id) ?? id.slice(0, 8),
        chats: attRooms.length,
        csat: attCsat.length > 0 ? Number((attCsat.reduce((s, r) => s + (r.csat_score ?? 0), 0) / attCsat.length).toFixed(1)) : null,
        resolutionRate: attClosed.length > 0 ? Math.round((attResolved.length / attClosed.length) * 100) : null,
        avgResolution: attAvgRes,
      };
    }).sort((a, b) => b.chats - a.chats);

    // Resolution distribution
    const resDist: Record<string, number> = {};
    closedRooms.forEach((r) => {
      const st = r.resolution_status ?? "pending";
      resDist[st] = (resDist[st] ?? 0) + 1;
    });
    const resolutionDistribution = Object.entries(resDist).map(([status, count]) => ({ status, count }));

    // Avg first response time - fetch first attendant message per room
    let avgFirstResponseMinutes: number | null = null;
    const roomIds = rooms.map(r => r.id);
    if (roomIds.length > 0) {
      // Fetch in batches to avoid URL length limits
      const batchSize = 50;
      const allMessages: any[] = [];
      for (let i = 0; i < Math.min(roomIds.length, 200); i += batchSize) {
        const batch = roomIds.slice(i, i + batchSize);
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("room_id, created_at")
          .in("room_id", batch)
          .eq("sender_type", "attendant")
          .order("created_at", { ascending: true });
        if (msgs) allMessages.push(...msgs);
      }

      // Get first message per room
      const firstByRoom: Record<string, string> = {};
      allMessages.forEach(m => {
        if (!firstByRoom[m.room_id]) firstByRoom[m.room_id] = m.created_at;
      });

      const responseTimes: number[] = [];
      rooms.forEach(r => {
        if (r.created_at && firstByRoom[r.id]) {
          const diff = (new Date(firstByRoom[r.id]).getTime() - new Date(r.created_at).getTime()) / 60000;
          if (diff >= 0) responseTimes.push(diff);
        }
      });

      if (responseTimes.length > 0) {
        avgFirstResponseMinutes = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      }
    }

    // Avg wait time (created_at -> assigned_at)
    const roomsWithAssignment = rooms.filter(r => r.created_at && (r as any).assigned_at);
    let avgWaitMinutes: number | null = null;
    // We don't have assigned_at in our select, so approximate using closed rooms with attendant
    const waitingRooms = rooms.filter(r => r.created_at && r.attendant_id);
    // Use first response time as proxy for wait time
    avgWaitMinutes = avgFirstResponseMinutes;

    // Abandonment rate: closed rooms without attendant_id
    const closedWithoutAttendant = closedRooms.filter(r => !r.attendant_id).length;
    const abandonmentRate = closedRooms.length > 0
      ? Math.round((closedWithoutAttendant / closedRooms.length) * 100)
      : null;

    setStats({
      totalChats, chatsToday, avgCsat, resolutionRate, avgResolutionMinutes,
      chartData, chatsByAttendant, resolutionDistribution, activeChats,
      waitingChats, onlineAttendants, avgFirstResponseMinutes, unresolvedChats,
      csatByDay, attendantPerformance, chatsByHour,
      avgWaitMinutes, abandonmentRate,
    });
    setLoading(false);
  }, [filters.period, filters.attendantId, filters.status, filters.priority, filters.categoryId, filters.tagId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
