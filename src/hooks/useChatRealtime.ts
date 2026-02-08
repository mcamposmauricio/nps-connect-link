import { useEffect, useState, useCallback } from "react";
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

export function useChatRooms(ownerUserId: string | null) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!ownerUserId) return;
    setLoading(true);
    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("created_at", { ascending: false });

    setRooms((data as ChatRoom[]) ?? []);
    setLoading(false);
  }, [ownerUserId]);

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerUserId, fetchRooms]);

  return { rooms, loading, refetch: fetchRooms };
}
