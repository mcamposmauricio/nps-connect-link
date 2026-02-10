import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Star, Loader2, X, Plus, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";

type WidgetPhase = "form" | "history" | "waiting" | "chat" | "csat" | "closed" | "viewTranscript";

interface HistoryRoom {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
}

const ChatWidget = () => {
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";
  const companyName = searchParams.get("companyName") ?? "Suporte";
  const position = searchParams.get("position") ?? "right";
  const primaryColor = searchParams.get("primaryColor") ?? "#7C3AED";
  const paramVisitorToken = searchParams.get("visitorToken");
  const paramVisitorName = searchParams.get("visitorName");
  const paramOwnerUserId = searchParams.get("ownerUserId");
  const paramCompanyContactId = searchParams.get("companyContactId");
  const paramContactId = searchParams.get("contactId");

  const isResolvedVisitor = !!paramVisitorToken && !!paramOwnerUserId;

  const [isOpen, setIsOpen] = useState(!isEmbed);
  const [phase, setPhase] = useState<WidgetPhase>("form");
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; content: string; sender_type: string; sender_name: string | null; created_at: string }>>([]);
  const [input, setInput] = useState("");
  const [csatScore, setCsatScore] = useState(0);
  const [csatComment, setCsatComment] = useState("");
  const [formData, setFormData] = useState({ name: paramVisitorName || "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [historyRooms, setHistoryRooms] = useState<HistoryRoom[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRight = position !== "left";

  const postMsg = (type: string) => {
    if (isEmbed) window.parent.postMessage({ type }, "*");
  };

  // Fetch chat history for a visitor
  const fetchHistory = useCallback(async (vId: string) => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("chat_rooms")
      .select("id, status, created_at, closed_at, csat_score")
      .eq("visitor_id", vId)
      .order("created_at", { ascending: false });
    setHistoryRooms(data ?? []);
    setHistoryLoading(false);
    return data ?? [];
  }, []);

  // Init: resolve visitor or check localStorage
  useEffect(() => {
    const init = async () => {
      if (paramVisitorToken) {
        setVisitorToken(paramVisitorToken);
        localStorage.setItem("chat_visitor_token", paramVisitorToken);

        // Lookup visitor id
        const { data: visitor } = await supabase
          .from("chat_visitors")
          .select("id")
          .eq("visitor_token", paramVisitorToken)
          .maybeSingle();

        if (!visitor) return;
        setVisitorId(visitor.id);

        if (isResolvedVisitor) {
          // Resolved visitor -> show history
          const rooms = await fetchHistory(visitor.id);
          // Check for active room
          const activeRoom = rooms.find((r) => r.status === "waiting" || r.status === "active");
          if (activeRoom) {
            setRoomId(activeRoom.id);
            setPhase(activeRoom.status === "active" ? "chat" : "waiting");
          } else {
            setPhase("history");
          }
        } else {
          // Legacy token (no owner info) — check existing room
          const { data: room } = await supabase
            .from("chat_rooms")
            .select("id, status")
            .eq("visitor_id", visitor.id)
            .in("status", ["waiting", "active"])
            .maybeSingle();

          if (room) {
            setRoomId(room.id);
            setPhase(room.status === "active" ? "chat" : "waiting");
          }
        }
        return;
      }

      const savedToken = localStorage.getItem("chat_visitor_token");
      if (savedToken) {
        setVisitorToken(savedToken);
        const { data: visitor } = await supabase
          .from("chat_visitors")
          .select("id")
          .eq("visitor_token", savedToken)
          .maybeSingle();

        if (visitor) {
          setVisitorId(visitor.id);
          const { data: room } = await supabase
            .from("chat_rooms")
            .select("id, status")
            .eq("visitor_id", visitor.id)
            .in("status", ["waiting", "active"])
            .maybeSingle();

          if (room) {
            setRoomId(room.id);
            setPhase(room.status === "active" ? "chat" : "waiting");
          }
        }
      }
    };
    init();
  }, []);

  // Realtime messages
  useEffect(() => {
    if (!roomId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, content, sender_type, sender_name, created_at")
        .eq("room_id", roomId)
        .eq("is_internal", false)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
    };

    fetchMessages();

    const channel = supabase
      .channel(`widget-messages-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        const msg = payload.new as any;
        if (!msg.is_internal) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Realtime room status
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`widget-room-${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const room = payload.new as any;
        if (room.status === "active" && phase === "waiting") {
          setPhase("chat");
          postMsg("chat-connected");
        } else if (room.status === "closed") {
          setPhase("csat");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, phase]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Create a new room with proper linking
  const createLinkedRoom = async (vId: string) => {
    const insertData: any = {
      visitor_id: vId,
      owner_user_id: paramOwnerUserId || "00000000-0000-0000-0000-000000000000",
      status: "waiting",
    };
    if (paramCompanyContactId) insertData.company_contact_id = paramCompanyContactId;
    if (paramContactId) insertData.contact_id = paramContactId;

    const { data: newRoom } = await supabase
      .from("chat_rooms")
      .insert(insertData)
      .select("id")
      .single();

    return newRoom;
  };

  // Handle "New Chat" from history
  const handleNewChat = async () => {
    if (!visitorId) return;
    setLoading(true);

    const newRoom = await createLinkedRoom(visitorId);
    if (newRoom) {
      setRoomId(newRoom.id);
      setMessages([]);
      setCsatScore(0);
      setCsatComment("");
      setPhase("waiting");
      postMsg("chat-ready");
    }
    setLoading(false);
  };

  // View transcript of a closed room
  const handleViewTranscript = async (rId: string) => {
    setRoomId(rId);
    setPhase("viewTranscript");
    // Messages will be fetched by the realtime effect
  };

  // Go back to history
  const handleBackToHistory = async () => {
    if (visitorId) await fetchHistory(visitorId);
    setRoomId(null);
    setMessages([]);
    setCsatScore(0);
    setCsatComment("");
    setPhase("history");
  };

  const handleStartChat = async () => {
    if (!formData.name.trim()) return;
    setLoading(true);

    const { data: visitor, error: vError } = await supabase
      .from("chat_visitors")
      .insert({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        owner_user_id: "00000000-0000-0000-0000-000000000000",
      })
      .select("id, visitor_token")
      .single();

    if (vError || !visitor) {
      setLoading(false);
      return;
    }

    localStorage.setItem("chat_visitor_token", visitor.visitor_token);
    setVisitorToken(visitor.visitor_token);
    setVisitorId(visitor.id);

    const { data: room } = await supabase
      .from("chat_rooms")
      .insert({
        visitor_id: visitor.id,
        owner_user_id: "00000000-0000-0000-0000-000000000000",
        status: "waiting",
      })
      .select("id")
      .single();

    if (room) {
      setRoomId(room.id);
      setPhase("waiting");
      postMsg("chat-ready");
    }

    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !roomId) return;
    const content = input;
    setInput("");

    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_type: "visitor",
      sender_id: visitorToken,
      sender_name: formData.name || paramVisitorName || "Visitante",
      content,
    });
  };

  const handleSubmitCsat = async () => {
    if (!roomId || csatScore === 0) return;

    await supabase
      .from("chat_rooms")
      .update({ csat_score: csatScore, csat_comment: csatComment || null })
      .eq("id", roomId);

    postMsg("chat-csat-submitted");

    // If resolved visitor, go back to history; otherwise show closed
    if (isResolvedVisitor) {
      await handleBackToHistory();
    } else {
      setPhase("closed");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "waiting": return "Aguardando";
      case "active": return "Em andamento";
      case "closed": return "Encerrado";
      default: return status;
    }
  };

  // FAB button when closed (embed mode)
  if (isEmbed && !isOpen) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          ...(isRight ? { right: "20px" } : { left: "20px" }),
          zIndex: 99999,
        }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
          style={{
            width: "60px",
            height: "60px",
            backgroundColor: primaryColor,
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          <MessageSquare className="h-7 w-7" />
        </button>
      </div>
    );
  }

  const widgetContent = (
    <Card
      className="flex flex-col overflow-hidden border-0 rounded-xl shadow-2xl"
      style={isEmbed ? { height: "100%", width: "100%" } : { width: "100%", maxWidth: "420px", height: "600px" }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center gap-3"
        style={{ backgroundColor: primaryColor, color: "#fff" }}
      >
        {(phase === "viewTranscript") && (
          <button onClick={handleBackToHistory} className="p-1 rounded-full hover:bg-white/20" style={{ color: "#fff" }}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <MessageSquare className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">{companyName}</p>
          <p className="text-xs opacity-80">
            {phase === "chat" ? "Chat ativo" : phase === "waiting" ? "Aguardando..." : phase === "history" ? "Suas conversas" : phase === "viewTranscript" ? "Histórico" : "Suporte"}
          </p>
        </div>
        {isEmbed && (
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full hover:bg-white/20"
            style={{ color: "#fff" }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4" ref={scrollRef}>
        {/* Form phase (anonymous visitors) */}
        {phase === "form" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Preencha seus dados para iniciar o atendimento.</p>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <Button className="w-full" onClick={handleStartChat} disabled={loading || !formData.name.trim()} style={{ backgroundColor: primaryColor }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Iniciar Conversa
            </Button>
          </div>
        )}

        {/* History phase (resolved visitors) */}
        {phase === "history" && (
          <div className="space-y-3">
            <Button
              className="w-full gap-2"
              onClick={handleNewChat}
              disabled={loading || historyRooms.some((r) => r.status === "waiting" || r.status === "active")}
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Novo Chat
            </Button>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyRooms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa anterior.</p>
            ) : (
              historyRooms.map((room) => {
                const isActive = room.status === "waiting" || room.status === "active";
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      if (isActive) {
                        setRoomId(room.id);
                        setPhase(room.status === "active" ? "chat" : "waiting");
                      } else {
                        handleViewTranscript(room.id);
                      }
                    }}
                    className="w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <Clock className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium" style={isActive ? { color: primaryColor } : {}}>
                          {statusLabel(room.status)}
                        </span>
                      </div>
                      {room.csat_score != null && (
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs text-muted-foreground">{room.csat_score}/5</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(room.created_at)}
                      {room.closed_at && ` — ${formatDate(room.closed_at)}`}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        )}

        {phase === "waiting" && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
            <div className="animate-pulse">
              <MessageSquare className="h-12 w-12 opacity-50" style={{ color: primaryColor }} />
            </div>
            <p className="text-sm text-muted-foreground text-center">Aguardando atendimento...</p>
            <p className="text-xs text-muted-foreground">Você será conectado em breve.</p>
          </div>
        )}

        {/* Messages display (chat, csat, closed, viewTranscript) */}
        {(phase === "chat" || phase === "csat" || phase === "closed" || phase === "viewTranscript") && (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === "visitor" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender_type === "visitor" ? "text-white" : "bg-muted"
                  }`}
                  style={msg.sender_type === "visitor" ? { backgroundColor: primaryColor } : {}}
                >
                  {msg.sender_type !== "visitor" && (
                    <p className="text-xs font-medium mb-1 opacity-70">{msg.sender_name}</p>
                  )}
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}

            {phase === "viewTranscript" && messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem nesta conversa.</p>
            )}
          </div>
        )}

        {phase === "csat" && (
          <div className="mt-6 space-y-4 border-t pt-4">
            <p className="text-sm font-medium text-center">Avalie o atendimento</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setCsatScore(v)} className="focus:outline-none">
                  <Star className={`h-8 w-8 ${v <= csatScore ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Comentário (opcional)"
              value={csatComment}
              onChange={(e) => setCsatComment(e.target.value)}
            />
            <Button className="w-full" onClick={handleSubmitCsat} disabled={csatScore === 0} style={{ backgroundColor: primaryColor }}>
              Enviar Avaliação
            </Button>
          </div>
        )}

        {phase === "closed" && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Obrigado pelo feedback! Esta conversa foi encerrada.</p>
          </div>
        )}
      </div>

      {/* Input bar */}
      {phase === "chat" && (
        <div className="border-t p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim()} style={{ backgroundColor: primaryColor }}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Back button for transcript view */}
      {phase === "viewTranscript" && (
        <div className="border-t p-3">
          <Button variant="outline" className="w-full gap-2" onClick={handleBackToHistory}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao histórico
          </Button>
        </div>
      )}
    </Card>
  );

  // Embed mode: floating panel
  if (isEmbed) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          ...(isRight ? { right: "20px" } : { left: "20px" }),
          width: "400px",
          height: "600px",
          zIndex: 99999,
        }}
      >
        {widgetContent}
      </div>
    );
  }

  // Standalone mode: centered
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      {widgetContent}
    </div>
  );
};

export default ChatWidget;
