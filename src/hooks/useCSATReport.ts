import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CSATRecord {
  roomId: string;
  visitorName: string;
  attendantName: string;
  attendantId: string | null;
  csatScore: number;
  csatComment: string | null;
  closedAt: string;
  createdAt: string;
  durationMinutes: number | null;
  tags: { id: string; name: string; color: string | null }[];
}

export interface CSATReportFilters {
  period: "today" | "week" | "month" | "all";
  scores: number[];
  attendantId: string | null;
  teamId: string | null;
  tagId: string | null;
  contactId: string | null;
  companyContactId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: "date" | "score";
  sortDir: "asc" | "desc";
  page: number;
}

export interface CSATReportStats {
  avgCsat: number | null;
  totalEvaluations: number;
  positivePercent: number | null;
  negativePercent: number | null;
  csatByDay: { date: string; avg: number; count: number }[];
  scoreDistribution: { score: number; count: number }[];
}

const PAGE_SIZE = 20;

export function useCSATReport(filters: CSATReportFilters) {
  const [records, setRecords] = useState<CSATRecord[]>([]);
  const [stats, setStats] = useState<CSATReportStats>({
    avgCsat: null,
    totalEvaluations: 0,
    positivePercent: null,
    negativePercent: null,
    csatByDay: [],
    scoreDistribution: [],
  });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (filters.dateFrom) {
      startDate = new Date(filters.dateFrom).toISOString();
    } else {
      switch (filters.period) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          break;
        case "week":
          const w = new Date(now);
          w.setDate(w.getDate() - 7);
          startDate = w.toISOString();
          break;
        case "month":
          const m = new Date(now);
          m.setDate(m.getDate() - 30);
          startDate = m.toISOString();
          break;
      }
    }

    if (filters.dateTo) {
      const d = new Date(filters.dateTo);
      d.setDate(d.getDate() + 1);
      endDate = d.toISOString();
    }

    // Get team member attendant IDs if filtering by team
    let teamAttendantIds: string[] | null = null;
    if (filters.teamId) {
      const { data: members } = await supabase
        .from("chat_team_members")
        .select("attendant_id")
        .eq("team_id", filters.teamId);
      teamAttendantIds = members?.map((m) => m.attendant_id) ?? [];
      if (teamAttendantIds.length === 0) {
        setRecords([]);
        setStats({ avgCsat: null, totalEvaluations: 0, positivePercent: null, negativePercent: null, csatByDay: [], scoreDistribution: [] });
        setTotalCount(0);
        setLoading(false);
        return;
      }
    }

    // Get tag room IDs if filtering by tag
    let tagRoomIds: string[] | null = null;
    if (filters.tagId) {
      const { data: tagRooms } = await supabase
        .from("chat_room_tags")
        .select("room_id")
        .eq("tag_id", filters.tagId);
      tagRoomIds = tagRooms?.map((r) => r.room_id) ?? [];
      if (tagRoomIds.length === 0) {
        setRecords([]);
        setStats({ avgCsat: null, totalEvaluations: 0, positivePercent: null, negativePercent: null, csatByDay: [], scoreDistribution: [] });
        setTotalCount(0);
        setLoading(false);
        return;
      }
    }

    // Build query for all matching rooms (for stats)
    let statsQuery = supabase
      .from("chat_rooms")
      .select("id, csat_score, csat_comment, closed_at, created_at, attendant_id")
      .eq("status", "closed")
      .not("csat_score", "is", null);

    if (startDate) statsQuery = statsQuery.gte("closed_at", startDate);
    if (endDate) statsQuery = statsQuery.lt("closed_at", endDate);
    if (filters.attendantId) statsQuery = statsQuery.eq("attendant_id", filters.attendantId);
    if (filters.scores.length > 0) statsQuery = statsQuery.in("csat_score", filters.scores);
    if (teamAttendantIds) statsQuery = statsQuery.in("attendant_id", teamAttendantIds);
    if (tagRoomIds) statsQuery = statsQuery.in("id", tagRoomIds);
    if (filters.contactId) statsQuery = statsQuery.eq("contact_id", filters.contactId);
    if (filters.companyContactId) statsQuery = statsQuery.eq("company_contact_id", filters.companyContactId);

    const { data: allRooms } = await statsQuery;
    const rooms = allRooms ?? [];

    // Calculate stats
    const totalEvaluations = rooms.length;
    const avgCsat = totalEvaluations > 0
      ? Number((rooms.reduce((s, r) => s + (r.csat_score ?? 0), 0) / totalEvaluations).toFixed(1))
      : null;
    const positive = rooms.filter((r) => (r.csat_score ?? 0) >= 4).length;
    const negative = rooms.filter((r) => (r.csat_score ?? 0) <= 2).length;
    const positivePercent = totalEvaluations > 0 ? Math.round((positive / totalEvaluations) * 100) : null;
    const negativePercent = totalEvaluations > 0 ? Math.round((negative / totalEvaluations) * 100) : null;

    // CSAT by day
    const byDayMap: Record<string, { sum: number; count: number }> = {};
    rooms.forEach((r) => {
      const day = (r.closed_at ?? r.created_at)?.slice(0, 10) ?? "";
      if (!byDayMap[day]) byDayMap[day] = { sum: 0, count: 0 };
      byDayMap[day].sum += r.csat_score ?? 0;
      byDayMap[day].count += 1;
    });
    const csatByDay = Object.entries(byDayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: date.slice(5), avg: Number((v.sum / v.count).toFixed(1)), count: v.count }));

    // Score distribution
    const scoreCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rooms.forEach((r) => {
      const s = r.csat_score ?? 0;
      if (s >= 1 && s <= 5) scoreCounts[s]++;
    });
    const scoreDistribution = [1, 2, 3, 4, 5].map((score) => ({ score, count: scoreCounts[score] }));

    setStats({ avgCsat, totalEvaluations, positivePercent, negativePercent, csatByDay, scoreDistribution });
    setTotalCount(totalEvaluations);

    // Now fetch paginated records with visitor/attendant info
    const sortField = filters.sortBy === "score" ? "csat_score" : "closed_at";
    const ascending = filters.sortDir === "asc";
    const offset = filters.page * PAGE_SIZE;

    let pageQuery = supabase
      .from("chat_rooms")
      .select("id, csat_score, csat_comment, closed_at, created_at, attendant_id, visitor_id, chat_visitors!visitor_id(name)")
      .eq("status", "closed")
      .not("csat_score", "is", null)
      .order(sortField, { ascending })
      .range(offset, offset + PAGE_SIZE - 1);

    if (startDate) pageQuery = pageQuery.gte("closed_at", startDate);
    if (endDate) pageQuery = pageQuery.lt("closed_at", endDate);
    if (filters.attendantId) pageQuery = pageQuery.eq("attendant_id", filters.attendantId);
    if (filters.scores.length > 0) pageQuery = pageQuery.in("csat_score", filters.scores);
    if (teamAttendantIds) pageQuery = pageQuery.in("attendant_id", teamAttendantIds);
    if (tagRoomIds) pageQuery = pageQuery.in("id", tagRoomIds);
    if (filters.contactId) pageQuery = pageQuery.eq("contact_id", filters.contactId);
    if (filters.companyContactId) pageQuery = pageQuery.eq("company_contact_id", filters.companyContactId);

    const { data: pageData } = await pageQuery;
    const pageRooms = pageData ?? [];

    // Fetch attendant names
    const attendantIds = [...new Set(pageRooms.map((r) => r.attendant_id).filter(Boolean))] as string[];
    let attendantMap: Record<string, string> = {};
    if (attendantIds.length > 0) {
      const { data: atts } = await supabase
        .from("attendant_profiles")
        .select("id, display_name")
        .in("id", attendantIds);
      (atts ?? []).forEach((a) => { attendantMap[a.id] = a.display_name; });
    }

    // Fetch tags for these rooms
    const roomIds = pageRooms.map((r) => r.id);
    let roomTagsMap: Record<string, { id: string; name: string; color: string | null }[]> = {};
    if (roomIds.length > 0) {
      const { data: roomTags } = await supabase
        .from("chat_room_tags")
        .select("room_id, tag_id, chat_tags!tag_id(id, name, color)")
        .in("room_id", roomIds);
      (roomTags ?? []).forEach((rt: any) => {
        if (!roomTagsMap[rt.room_id]) roomTagsMap[rt.room_id] = [];
        if (rt.chat_tags) {
          roomTagsMap[rt.room_id].push({ id: rt.chat_tags.id, name: rt.chat_tags.name, color: rt.chat_tags.color });
        }
      });
    }

    const mappedRecords: CSATRecord[] = pageRooms.map((r: any) => {
      const created = new Date(r.created_at).getTime();
      const closed = r.closed_at ? new Date(r.closed_at).getTime() : null;
      const duration = closed ? Math.round((closed - created) / 60000) : null;

      return {
        roomId: r.id,
        visitorName: r.chat_visitors?.name ?? "Visitante",
        attendantName: r.attendant_id ? (attendantMap[r.attendant_id] ?? "—") : "—",
        attendantId: r.attendant_id,
        csatScore: r.csat_score,
        csatComment: r.csat_comment,
        closedAt: r.closed_at ?? r.created_at,
        createdAt: r.created_at,
        durationMinutes: duration,
        tags: roomTagsMap[r.id] ?? [],
      };
    });

    setRecords(mappedRecords);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { records, stats, totalCount, loading, pageSize: PAGE_SIZE, refetch: fetchData };
}
