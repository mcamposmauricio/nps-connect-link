import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HistoryFilter {
  resolutionStatus?: string | null;
  attendantId?: string | null;
  tagId?: string | null;
  search?: string;
  page: number;
}

export interface ClosedRoom {
  id: string;
  status: string;
  resolution_status: string | null;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
  visitor_id: string;
  attendant_id: string | null;
  visitor_name: string | null;
  attendant_name: string | null;
  tags: { name: string; color: string }[];
}

const PAGE_SIZE = 20;

export function useChatHistory(filters: HistoryFilter) {
  const [rooms, setRooms] = useState<ClosedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRooms = useCallback(async () => {
    setLoading(true);

    const from = filters.page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Build query
    let query = supabase
      .from("chat_rooms")
      .select("id, status, resolution_status, created_at, closed_at, csat_score, visitor_id, attendant_id", { count: "exact" })
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .range(from, to);

    if (filters.resolutionStatus) {
      query = query.eq("resolution_status", filters.resolutionStatus);
    }
    if (filters.attendantId) {
      query = query.eq("attendant_id", filters.attendantId);
    }

    const { data: roomsData, count } = await query;

    if (!roomsData || roomsData.length === 0) {
      setRooms([]);
      setTotalCount(count ?? 0);
      setLoading(false);
      return;
    }

    setTotalCount(count ?? 0);

    // Fetch visitor names
    const visitorIds = [...new Set(roomsData.map((r) => r.visitor_id))];
    const { data: visitors } = await supabase
      .from("chat_visitors")
      .select("id, name")
      .in("id", visitorIds);

    const visitorMap = new Map(visitors?.map((v) => [v.id, v.name]) ?? []);

    // Fetch attendant names
    const attendantIds = [...new Set(roomsData.filter((r) => r.attendant_id).map((r) => r.attendant_id!))];
    let attendantMap = new Map<string, string>();
    if (attendantIds.length > 0) {
      const { data: attendants } = await supabase
        .from("attendant_profiles")
        .select("id, display_name")
        .in("id", attendantIds);
      attendantMap = new Map(attendants?.map((a) => [a.id, a.display_name]) ?? []);
    }

    // Fetch tags for rooms
    const roomIds = roomsData.map((r) => r.id);
    const { data: roomTags } = await supabase
      .from("chat_room_tags")
      .select("room_id, tag_id")
      .in("room_id", roomIds);

    let tagMap = new Map<string, { name: string; color: string }[]>();
    if (roomTags && roomTags.length > 0) {
      const tagIds = [...new Set(roomTags.map((rt) => rt.tag_id))];
      const { data: tags } = await supabase
        .from("chat_tags")
        .select("id, name, color")
        .in("id", tagIds);

      const tagInfoMap = new Map(tags?.map((t) => [t.id, { name: t.name, color: t.color ?? "#6366f1" }]) ?? []);

      roomTags.forEach((rt) => {
        const existing = tagMap.get(rt.room_id) ?? [];
        const tagInfo = tagInfoMap.get(rt.tag_id);
        if (tagInfo) existing.push(tagInfo);
        tagMap.set(rt.room_id, existing);
      });
    }

    // Filter by tag if needed
    let filteredRooms = roomsData;
    if (filters.tagId) {
      const roomIdsWithTag = new Set(
        roomTags?.filter((rt) => rt.tag_id === filters.tagId).map((rt) => rt.room_id) ?? []
      );
      filteredRooms = roomsData.filter((r) => roomIdsWithTag.has(r.id));
    }

    // Filter by search (visitor name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredRooms = filteredRooms.filter((r) => {
        const name = visitorMap.get(r.visitor_id) ?? "";
        return name.toLowerCase().includes(searchLower);
      });
    }

    const enriched: ClosedRoom[] = filteredRooms.map((r) => ({
      id: r.id,
      status: r.status ?? "closed",
      resolution_status: r.resolution_status,
      created_at: r.created_at ?? "",
      closed_at: r.closed_at,
      csat_score: r.csat_score,
      visitor_id: r.visitor_id,
      attendant_id: r.attendant_id,
      visitor_name: visitorMap.get(r.visitor_id) ?? null,
      attendant_name: r.attendant_id ? (attendantMap.get(r.attendant_id) ?? null) : null,
      tags: tagMap.get(r.id) ?? [],
    }));

    setRooms(enriched);
    setLoading(false);
  }, [filters.page, filters.resolutionStatus, filters.attendantId, filters.tagId, filters.search]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const exportToCSV = useCallback(() => {
    const headers = ["ID", "Cliente", "Atendente", "Status", "Resolução", "CSAT", "Início", "Encerramento", "Tags"];
    const rows = rooms.map((r) => [
      r.id.slice(0, 8),
      r.visitor_name ?? "—",
      r.attendant_name ?? "—",
      r.status,
      r.resolution_status ?? "—",
      r.csat_score != null ? `${r.csat_score}/5` : "—",
      r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "—",
      r.closed_at ? new Date(r.closed_at).toLocaleString("pt-BR") : "—",
      r.tags.map((t) => t.name).join(", ") || "—",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-chats-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rooms]);

  return {
    rooms,
    loading,
    totalCount,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
    exportToCSV,
    refetch: fetchRooms,
  };
}
