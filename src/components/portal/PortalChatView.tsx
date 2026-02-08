import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import PortalCSATForm from "./PortalCSATForm";

interface PortalChatViewProps {
  roomId: string;
  visitorId: string;
  contactName: string;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  created_at: string;
}

type ChatPhase = "waiting" | "chat" | "csat" | "closed";

const PortalChatView = ({ roomId, visitorId, contactName, onBack }: PortalChatViewProps) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<ChatPhase>("waiting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial room status + messages
  useEffect(() => {
    const init = async () => {
      const { data: room } = await supabase
        .from("chat_rooms")
        .select("status, csat_score")
        .eq("id", roomId)
        .single();

      if (room) {
        if (room.status === "closed") {
          setPhase(room.csat_score != null ? "closed" : "csat");
        } else if (room.status === "active") {
          setPhase("chat");
        } else {
          setPhase("waiting");
        }
      }

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("id, content, sender_type, sender_name, created_at")
        .eq("room_id", roomId)
        .eq("is_internal", false)
        .order("created_at", { ascending: true });

      setMessages(msgs ?? []);
    };

    init();
  }, [roomId]);

  // Realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`portal-msgs-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as any;
          if (!msg.is_internal) {
            setMessages((prev) => [...prev, { id: msg.id, content: msg.content, sender_type: msg.sender_type, sender_name: msg.sender_name, created_at: msg.created_at }]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Realtime room status
  useEffect(() => {
    const channel = supabase
      .channel(`portal-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const room = payload.new as any;
          if (room.status === "active" && phase === "waiting") {
            setPhase("chat");
          } else if (room.status === "closed" && phase !== "closed") {
            setPhase(room.csat_score != null ? "closed" : "csat");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, phase]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input;
    setInput("");
    setSending(true);

    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_type: "visitor",
      sender_id: visitorId,
      sender_name: contactName,
      content,
    });

    setSending(false);
  };

  const handleCSATSubmit = async (score: number, comment: string) => {
    await supabase
      .from("chat_rooms")
      .update({ csat_score: score, csat_comment: comment || null })
      .eq("id", roomId);

    setPhase("closed");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <p className="font-medium text-sm">
            {phase === "waiting" ? t("chat.portal.waiting") : phase === "chat" ? t("chat.portal.active_chat") : t("chat.portal.closed_chat")}
          </p>
        </div>
        <Badge variant={phase === "chat" ? "default" : phase === "waiting" ? "secondary" : "outline"}>
          {phase === "waiting" ? t("people.chatStatus.waiting") : phase === "chat" ? t("people.chatStatus.active") : t("people.chatStatus.closed")}
        </Badge>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-4" ref={scrollRef}>
        {phase === "waiting" && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
            <div className="animate-pulse">
              <MessageSquare className="h-12 w-12 text-primary opacity-50" />
            </div>
            <p className="text-sm text-muted-foreground text-center">{t("chat.portal.waiting")}</p>
            <p className="text-xs text-muted-foreground">{t("chat.portal.waiting_desc")}</p>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === "visitor" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender_type === "visitor"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.sender_type !== "visitor" && msg.sender_name && (
                    <p className="text-xs font-medium mb-1 opacity-70">{msg.sender_name}</p>
                  )}
                  <p>{msg.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {format(new Date(msg.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {phase === "csat" && (
          <PortalCSATForm onSubmit={handleCSATSubmit} />
        )}

        {phase === "closed" && (
          <div className="mt-6 text-center text-sm text-muted-foreground py-4">
            <p>{t("chat.portal.thanks")}</p>
          </div>
        )}
      </div>

      {/* Input bar */}
      {phase === "chat" && (
        <div className="border-t p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.portal.type_message")}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PortalChatView;
