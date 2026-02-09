import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Star, Loader2, X, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";

type WidgetPhase = "form" | "waiting" | "chat" | "csat" | "closed";

interface BannerData {
  assignment_id: string;
  content: string;
  bg_color: string;
  text_color: string;
  link_url: string | null;
  link_label: string | null;
  has_voting: boolean;
  vote: string | null;
}

const ChatWidget = () => {
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";
  const companyName = searchParams.get("companyName") ?? "Suporte";
  const position = searchParams.get("position") ?? "right";
  const primaryColor = searchParams.get("primaryColor") ?? "#7C3AED";
  const tenantId = searchParams.get("tenantId");

  const [isOpen, setIsOpen] = useState(!isEmbed);
  const [phase, setPhase] = useState<WidgetPhase>("form");
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; content: string; sender_type: string; sender_name: string | null; created_at: string }>>([]);
  const [input, setInput] = useState("");
  const [csatScore, setCsatScore] = useState(0);
  const [csatComment, setCsatComment] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRight = position !== "left";

  // Check localStorage for returning visitor
  useEffect(() => {
    const savedToken = localStorage.getItem("chat_visitor_token");
    if (savedToken) {
      setVisitorToken(savedToken);
      checkExistingRoom(savedToken);
    }
  }, []);

  // Load banners for visitor
  useEffect(() => {
    if (!visitorToken || !tenantId) return;
    loadBanners();
  }, [visitorToken, tenantId]);

  const loadBanners = async () => {
    if (!visitorToken) return;

    const { data: visitor } = await supabase
      .from("chat_visitors")
      .select("contact_id")
      .eq("visitor_token", visitorToken)
      .maybeSingle();

    if (!visitor?.contact_id) return;

    const { data } = await supabase
      .from("chat_banner_assignments")
      .select("id, vote, banner_id")
      .eq("contact_id", visitor.contact_id)
      .eq("is_active", true);

    if (!data || data.length === 0) return;

    const bannerIds = data.map((a) => a.banner_id);
    const { data: bannersData } = await supabase
      .from("chat_banners")
      .select("id, content, bg_color, text_color, link_url, link_label, has_voting")
      .in("id", bannerIds)
      .eq("is_active", true);

    if (!bannersData) return;

    const merged: BannerData[] = data
      .map((assignment) => {
        const banner = bannersData.find((b) => b.id === assignment.banner_id);
        if (!banner) return null;
        return {
          assignment_id: assignment.id,
          content: banner.content,
          bg_color: banner.bg_color ?? "#3B82F6",
          text_color: banner.text_color ?? "#FFFFFF",
          link_url: banner.link_url,
          link_label: banner.link_label,
          has_voting: banner.has_voting ?? false,
          vote: assignment.vote,
        };
      })
      .filter(Boolean) as BannerData[];

    setBanners(merged);

    // Increment views
    for (const a of data) {
      await supabase
        .from("chat_banner_assignments")
        .update({ views_count: ((a as any).views_count ?? 0) + 1 } as any)
        .eq("id", a.id);
    }
  };

  const handleVote = async (assignmentId: string, voteType: "up" | "down") => {
    await supabase
      .from("chat_banner_assignments")
      .update({ vote: voteType, voted_at: new Date().toISOString() } as any)
      .eq("id", assignmentId);

    setBanners((prev) =>
      prev.map((b) => (b.assignment_id === assignmentId ? { ...b, vote: voteType } : b))
    );
  };

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

  const postMsg = (type: string) => {
    if (isEmbed) window.parent.postMessage({ type }, "*");
  };

  const checkExistingRoom = async (token: string) => {
    const { data: visitor } = await supabase
      .from("chat_visitors")
      .select("id")
      .eq("visitor_token", token)
      .maybeSingle();

    if (visitor) {
      const { data: room } = await supabase
        .from("chat_rooms")
        .select("id, status")
        .eq("visitor_id", visitor.id)
        .in("status", ["waiting", "active"])
        .maybeSingle();

      if (room) {
        setRoomId(room.id);
        setPhase(room.status === "active" ? "chat" : "waiting");
        return;
      }
    }
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
      sender_name: formData.name || "Visitante",
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
    setPhase("closed");
  };

  const activeBanners = banners.filter((b) => !dismissedBanners.has(b.assignment_id));

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
      {/* Banners */}
      {activeBanners.map((banner) => (
        <div
          key={banner.assignment_id}
          className="px-4 py-3 text-sm relative"
          style={{ backgroundColor: banner.bg_color, color: banner.text_color }}
        >
          <button
            onClick={() => setDismissedBanners((prev) => new Set([...prev, banner.assignment_id]))}
            className="absolute top-1 right-1 p-1 rounded-full hover:bg-black/10"
            style={{ color: banner.text_color }}
          >
            <X className="h-3 w-3" />
          </button>
          <p className="pr-6">{banner.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            {banner.link_url && (
              <a
                href={banner.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs underline opacity-90 hover:opacity-100"
                style={{ color: banner.text_color }}
              >
                {banner.link_label || "Saiba mais"}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {banner.has_voting && (
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => handleVote(banner.assignment_id, "up")}
                  className={`p-1 rounded hover:bg-black/10 ${banner.vote === "up" ? "bg-black/20" : ""}`}
                  style={{ color: banner.text_color }}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleVote(banner.assignment_id, "down")}
                  className={`p-1 rounded hover:bg-black/10 ${banner.vote === "down" ? "bg-black/20" : ""}`}
                  style={{ color: banner.text_color }}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Header */}
      <div
        className="p-4 flex items-center gap-3"
        style={{ backgroundColor: primaryColor, color: "#fff" }}
      >
        <MessageSquare className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">{companyName}</p>
          <p className="text-xs opacity-80">
            {phase === "chat" ? "Chat ativo" : phase === "waiting" ? "Aguardando..." : "Suporte"}
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

        {phase === "waiting" && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
            <div className="animate-pulse">
              <MessageSquare className="h-12 w-12 opacity-50" style={{ color: primaryColor }} />
            </div>
            <p className="text-sm text-muted-foreground text-center">Aguardando atendimento...</p>
            <p className="text-xs text-muted-foreground">Você será conectado em breve.</p>
          </div>
        )}

        {(phase === "chat" || phase === "csat" || phase === "closed") && (
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
