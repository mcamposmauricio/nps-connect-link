import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  room_id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  message_type: string;
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ChatRoom {
  id: string;
  owner_user_id: string;
  visitor_id: string;
  attendant_id: string | null;
  contact_id: string | null;
  company_contact_id: string | null;
  status: string;
  priority: string;
  started_at: string;
  assigned_at: string | null;
  closed_at: string | null;
  csat_score: number | null;
  csat_comment: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  visitor_name?: string;
  visitor_email?: string;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_type?: string;
  unread_count?: number;
}

interface AttendantQueue {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  max_conversations: number;
  active_count: number;
  waiting_count: number;
}

interface UnassignedRoom {
  id: string;
  visitor_name: string;
  created_at: string;
  status: string;
}

export function useChatMessages(roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    setMessages((data as ChatMessage[]) ?? []);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    fetchMessages();

    if (!roomId) return;

    const channel = supabase
      .channel(`chat-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchMessages]);

  return { messages, loading, refetch: fetchMessages };
}

export function useChatRooms(ownerUserId: string | null, options?: { excludeClosed?: boolean }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedRoomIdRef = useRef<string | null>(null);

  const fetchRooms = useCallback(async () => {
    if (!ownerUserId) return;
    setLoading(true);

    let query = supabase
      .from("chat_rooms")
      .select("*, chat_visitors!visitor_id(name, email)")
      .order("created_at", { ascending: false });

    if (options?.excludeClosed) {
      query = query.in("status", ["active", "waiting"]);
    }

    const { data } = await query;

    if (!data) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomIds = data.map((r: Record<string, unknown>) => (r as { id: string }).id);
    let lastMessages: Record<string, { content: string; created_at: string; sender_type: string }> = {};
    let unreadCounts: Record<string, number> = {};

    if (roomIds.length > 0) {
      // Fetch the most recent message per room (including sender_type)
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("room_id, content, created_at, sender_type")
        .in("room_id", roomIds)
        .eq("is_internal", false)
        .order("created_at", { ascending: false });

      if (msgs) {
        const seen = new Set<string>();
        for (const m of msgs as { room_id: string; content: string; created_at: string; sender_type: string }[]) {
          if (!seen.has(m.room_id)) {
            seen.add(m.room_id);
            lastMessages[m.room_id] = { content: m.content, created_at: m.created_at, sender_type: m.sender_type };
          }
        }
      }

      // Fetch unread counts using chat_room_reads
      const { data: reads } = await supabase
        .from("chat_room_reads")
        .select("room_id, last_read_at")
        .eq("user_id", ownerUserId)
        .in("room_id", roomIds);

      const readMap: Record<string, string> = {};
      if (reads) {
        for (const r of reads as { room_id: string; last_read_at: string }[]) {
          readMap[r.room_id] = r.last_read_at;
        }
      }

      // Count unread visitor messages per room
      for (const roomId of roomIds) {
        const lastReadAt = readMap[roomId] || "1970-01-01T00:00:00Z";
        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", roomId)
          .eq("sender_type", "visitor")
          .eq("is_internal", false)
          .gt("created_at", lastReadAt);

        unreadCounts[roomId] = count ?? 0;
      }
    }

    const enrichedRooms: ChatRoom[] = data.map((r: Record<string, unknown>) => {
      const room = r as Record<string, unknown>;
      const visitor = room.chat_visitors as { name?: string; email?: string } | null;
      const roomId = room.id as string;
      const lm = lastMessages[roomId];
      return {
        ...room,
        visitor_name: visitor?.name ?? undefined,
        visitor_email: visitor?.email ?? undefined,
        last_message: lm?.content,
        last_message_at: lm?.created_at,
        last_message_sender_type: lm?.sender_type,
        unread_count: unreadCounts[roomId] ?? 0,
      } as ChatRoom;
    });

    // Smart sort: unread first, then by most recent activity
    enrichedRooms.sort((a, b) => {
      if ((a.unread_count ?? 0) > 0 && (b.unread_count ?? 0) === 0) return -1;
      if ((a.unread_count ?? 0) === 0 && (b.unread_count ?? 0) > 0) return 1;
      const aTime = a.last_message_at || a.created_at;
      const bTime = b.last_message_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setRooms(enrichedRooms);
    setLoading(false);
  }, [ownerUserId, options?.excludeClosed]);

  useEffect(() => {
    fetchRooms();

    if (!ownerUserId) return;

    const channel = supabase
      .channel("chat-rooms-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_rooms",
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    // Listen for new messages to trigger sound notification and refresh
    const msgChannel = supabase
      .channel("chat-messages-notification")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.sender_type === "visitor" && msg.room_id !== selectedRoomIdRef.current) {
            // Play notification sound
            try {
              const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGjlqj8Lb1LRiQhY0YYa95+3UdFQmLFl7p+Xj2p6MiWpXdZqXh3FxOBImWVhzl5KCcHM1EjhWX3eVkYBxcjURO1hdepCSfm5pJytRVnqNjoFyey8lRE55lYd5ciwnNk55ioJ3ay0vQU94jXlwYSAyREhqfG9eLjAqI0E=");
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {}
          }
          // Refresh rooms to update unread counts
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(msgChannel);
    };
  }, [ownerUserId, fetchRooms]);

  const markRoomAsRead = useCallback(async (roomId: string) => {
    if (!ownerUserId) return;
    selectedRoomIdRef.current = roomId;

    await supabase
      .from("chat_room_reads")
      .upsert(
        { room_id: roomId, user_id: ownerUserId, last_read_at: new Date().toISOString() },
        { onConflict: "room_id,user_id" }
      );

    // Update local state immediately
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, unread_count: 0 } : r))
    );
  }, [ownerUserId]);

  const setSelectedRoomRef = useCallback((roomId: string | null) => {
    selectedRoomIdRef.current = roomId;
  }, []);

  return { rooms, loading, refetch: fetchRooms, markRoomAsRead, setSelectedRoomRef };
}

export function useAttendantQueues() {
  const [attendants, setAttendants] = useState<AttendantQueue[]>([]);
  const [unassignedRooms, setUnassignedRooms] = useState<UnassignedRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueues = useCallback(async () => {
    setLoading(true);

    const { data: profiles } = await supabase
      .from("attendant_profiles")
      .select("id, user_id, display_name, status, max_conversations");

    const { data: rooms } = await supabase
      .from("chat_rooms")
      .select("id, attendant_id, status, visitor_id, created_at, chat_visitors!visitor_id(name)")
      .in("status", ["active", "waiting"]);

    const roomsList = (rooms ?? []) as Array<{
      id: string;
      attendant_id: string | null;
      status: string;
      visitor_id: string;
      created_at: string;
      chat_visitors: { name: string } | null;
    }>;

    const activeByAttendant: Record<string, number> = {};
    const waitingByAttendant: Record<string, number> = {};
    const unassigned: UnassignedRoom[] = [];

    for (const room of roomsList) {
      if (!room.attendant_id) {
        unassigned.push({
          id: room.id,
          visitor_name: room.chat_visitors?.name ?? "Visitante",
          created_at: room.created_at,
          status: room.status,
        });
      } else {
        if (room.status === "active") {
          activeByAttendant[room.attendant_id] = (activeByAttendant[room.attendant_id] ?? 0) + 1;
        } else if (room.status === "waiting") {
          waitingByAttendant[room.attendant_id] = (waitingByAttendant[room.attendant_id] ?? 0) + 1;
        }
      }
    }

    const enrichedAttendants: AttendantQueue[] = (profiles ?? []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      display_name: p.display_name,
      status: p.status ?? "offline",
      max_conversations: p.max_conversations ?? 5,
      active_count: activeByAttendant[p.id] ?? 0,
      waiting_count: waitingByAttendant[p.id] ?? 0,
    }));

    setAttendants(enrichedAttendants);
    setUnassignedRooms(unassigned);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueues();

    const channel = supabase
      .channel("attendant-queues-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        () => fetchQueues()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendant_profiles" },
        () => fetchQueues()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQueues]);

  return { attendants, unassignedRooms, loading, refetch: fetchQueues };
}
