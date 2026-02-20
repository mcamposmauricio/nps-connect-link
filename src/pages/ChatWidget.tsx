import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Star, Loader2, X, Plus, ArrowLeft, Clock, CheckCircle2, Paperclip, FileText, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

type WidgetPhase = "form" | "history" | "waiting" | "chat" | "csat" | "closed" | "viewTranscript";

interface HistoryRoom {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
}

interface ChatMsg {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  created_at: string;
  message_type?: string | null;
  metadata?: { file_url?: string; file_name?: string; file_type?: string; file_size?: number } | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function isImage(type: string) { return type.startsWith("image/"); }
function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [csatScore, setCsatScore] = useState(0);
  const [csatComment, setCsatComment] = useState("");
  const [formData, setFormData] = useState({ name: paramVisitorName || "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [allBusy, setAllBusy] = useState(false);
  const [outsideHours, setOutsideHours] = useState(false);
  const [historyRooms, setHistoryRooms] = useState<HistoryRoom[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<{
    show_outside_hours_banner: boolean;
    outside_hours_title: string;
    outside_hours_message: string;
    show_all_busy_banner: boolean;
    all_busy_title: string;
    all_busy_message: string;
    waiting_message: string;
    show_email_field: boolean;
    show_phone_field: boolean;
    form_intro_text: string;
    show_chat_history: boolean;
    show_csat: boolean;
    allow_file_attachments: boolean;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRight = position !== "left";

  const postMsg = (type: string) => {
    if (isEmbed) window.parent.postMessage({ type }, "*");
  };

  // Notify parent iframe about open/close state for dynamic resizing
  useEffect(() => {
    if (isEmbed) {
      window.parent.postMessage({ type: "chat-toggle", isOpen }, "*");
    }
  }, [isOpen, isEmbed]);

  // Force transparent background on html/body when embedded in iframe
  useEffect(() => {
    if (isEmbed) {
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
    }
  }, [isEmbed]);

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

  useEffect(() => {
    const init = async () => {
      // Fetch widget display config if ownerUserId is available
      const ownerForConfig = paramOwnerUserId;
      if (ownerForConfig && ownerForConfig !== "00000000-0000-0000-0000-000000000000") {
        const { data: cfg } = await supabase
          .from("chat_settings")
          .select("show_outside_hours_banner, outside_hours_title, outside_hours_message, show_all_busy_banner, all_busy_title, all_busy_message, waiting_message, show_email_field, show_phone_field, form_intro_text, show_chat_history, show_csat, allow_file_attachments")
          .eq("user_id", ownerForConfig)
          .maybeSingle();
        if (cfg) setWidgetConfig(cfg as any);
      }

      if (paramVisitorToken) {
        setVisitorToken(paramVisitorToken);
        localStorage.setItem("chat_visitor_token", paramVisitorToken);

        const { data: visitor } = await supabase
          .from("chat_visitors")
          .select("id")
          .eq("visitor_token", paramVisitorToken)
          .maybeSingle();

        if (!visitor) return;
        setVisitorId(visitor.id);

        if (isResolvedVisitor) {
          const rooms = await fetchHistory(visitor.id);
          const activeRoom = rooms.find((r) => r.status === "waiting" || r.status === "active");
          if (activeRoom) {
            setRoomId(activeRoom.id);
            setPhase(activeRoom.status === "active" ? "chat" : "waiting");
          } else {
            setPhase("history");
          }
        } else {
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

  const PAGE_SIZE = 10;

  const fetchMessages = useCallback(async (roomIdToFetch: string, before?: string) => {
    let query = supabase
      .from("chat_messages")
      .select("id, content, sender_type, sender_name, created_at, message_type, metadata")
      .eq("room_id", roomIdToFetch)
      .eq("is_internal", false)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data } = await query;
    const items = (data as ChatMsg[]) ?? [];
    const hasMore = items.length > PAGE_SIZE;
    if (hasMore) items.pop();
    items.reverse();

    if (before) {
      setMessages(prev => [...items, ...prev]);
    } else {
      setMessages(items);
    }
    setHasMoreMessages(hasMore);
  }, []);

  const loadMore = async () => {
    if (messages.length === 0 || loadingMore || !roomId) return;
    setLoadingMore(true);
    await fetchMessages(roomId, messages[0].created_at);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (!roomId) return;

    fetchMessages(roomId);

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
  }, [roomId, fetchMessages]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`widget-room-${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const room = payload.new as any;
        if (room.status === "active" && phase === "waiting") {
          setAllBusy(false);
          setPhase("chat");
          postMsg("chat-connected");
        } else if (room.status === "closed") {
          setPhase("csat");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, phase]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const checkRoomAssignment = async (rId: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/assign-chat-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": supabaseAnonKey },
        body: JSON.stringify({ room_id: rId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.assigned) {
          setPhase("chat");
        } else if (data.outside_hours) {
          setOutsideHours(true);
          setAllBusy(false);
        } else if (data.all_busy) {
          setAllBusy(true);
          setOutsideHours(false);
        }
      }
    } catch {
      // fail silently — realtime subscription will handle the status update
    }
  };

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
      .select("id, status, attendant_id")
      .single();

    return newRoom;
  };

  const handleNewChat = async () => {
    if (!visitorId) return;
    setLoading(true);
    setAllBusy(false);

    const newRoom = await createLinkedRoom(visitorId);
    if (newRoom) {
      setRoomId(newRoom.id);
      setMessages([]);
      setCsatScore(0);
      setCsatComment("");
      // Trigger already assigned the room (BEFORE INSERT) — check status
      if (newRoom.status === "active" && newRoom.attendant_id) {
        setPhase("chat");
      } else {
        setPhase("waiting");
        // Call edge function to get real-time feedback on queue status
        await checkRoomAssignment(newRoom.id);
      }
      postMsg("chat-ready");
    }
    setLoading(false);
  };

  const handleViewTranscript = async (rId: string) => {
    setRoomId(rId);
    setPhase("viewTranscript");
  };

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
    setAllBusy(false);

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
      .select("id, status, attendant_id")
      .single();

    if (room) {
      setRoomId(room.id);
      // Trigger may have already assigned it
      if (room.status === "active" && room.attendant_id) {
        setPhase("chat");
      } else {
        setPhase("waiting");
        // Anonymous visitors won't have contact_id → all_busy will be false, just shows waiting
      }
      postMsg("chat-ready");
    }

    setLoading(false);
  };

  const uploadFile = async (file: File) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, { contentType: file.type });

    if (error) {
      toast.error("Erro ao enviar arquivo");
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(path);

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    };
  };

  const handleSend = async () => {
    const hasContent = input.trim() || pendingFile;
    if (!hasContent || !roomId || uploading) return;

    let metadata: any = undefined;

    if (pendingFile) {
      setUploading(true);
      const result = await uploadFile(pendingFile);
      setUploading(false);
      if (!result) return;
      metadata = result;
    }

    const content = input.trim() || metadata?.file_name || "";
    setInput("");
    setPendingFile(null);

    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_type: "visitor",
      sender_id: visitorToken,
      sender_name: formData.name || paramVisitorName || "Visitante",
      content,
      ...(metadata ? { message_type: "file", metadata } : {}),
    });
  };

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Limite: 10MB");
      return;
    }
    setPendingFile(file);
  };

  const handleSubmitCsat = async () => {
    if (!roomId || csatScore === 0) return;

    await supabase
      .from("chat_rooms")
      .update({ csat_score: csatScore, csat_comment: csatComment || null })
      .eq("id", roomId);

    postMsg("chat-csat-submitted");

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

  const renderFileMessage = (msg: ChatMsg) => {
    const meta = msg.metadata;
    if (!meta?.file_url) return <p>{msg.content}</p>;

    if (isImage(meta.file_type || "")) {
      return (
        <div className="space-y-1 cursor-pointer" onClick={() => setLightboxUrl(meta.file_url!)}>
          <img src={meta.file_url} alt={meta.file_name} className="max-w-[200px] max-h-[160px] rounded-md object-cover" loading="lazy" />
          <p className="text-[10px] opacity-60 truncate max-w-[200px]">{meta.file_name}</p>
        </div>
      );
    }

    return (
      <a href={meta.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors">
        <FileText className="h-6 w-6 shrink-0 opacity-60" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{meta.file_name}</p>
          {meta.file_size && <p className="text-[10px] opacity-60">{formatFileSize(meta.file_size)}</p>}
        </div>
        <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </a>
    );
  };

  // FAB button when closed (embed mode) - fills the small iframe entirely
  if (isEmbed && !isOpen) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
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
      className={`flex flex-col overflow-hidden border-0 rounded-xl shadow-2xl min-h-0 ${isEmbed ? "flex-1" : ""}`}
      style={isEmbed ? { width: "100%", height: "100%", minHeight: 0 } : { width: "100%", maxWidth: "420px", height: "600px" }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center gap-3"
        style={{ backgroundColor: primaryColor, color: "#fff" }}
      >
      {(phase === "viewTranscript" || phase === "chat" || phase === "waiting") && (
          <button
            onClick={() => {
              if (phase === "chat" || phase === "waiting") {
                setPhase("history");
                if (visitorId) fetchHistory(visitorId);
              } else {
                handleBackToHistory();
              }
            }}
            className="p-1 rounded-full hover:bg-white/20"
            style={{ color: "#fff" }}
          >
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
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {phase === "form" && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {widgetConfig?.form_intro_text ?? "Preencha seus dados para iniciar o atendimento."}
              </p>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome" />
              </div>
              {(widgetConfig?.show_email_field ?? true) && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" type="email" />
                </div>
              )}
              {(widgetConfig?.show_phone_field ?? true) && (
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
              )}
              <Button className="w-full" onClick={handleStartChat} disabled={loading || !formData.name.trim()} style={{ backgroundColor: primaryColor }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Iniciar Conversa
              </Button>
            </div>
          </div>
        )}

        {phase === "history" && (widgetConfig?.show_chat_history ?? true) && (
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
          </div>
        )}

        {phase === "history" && !(widgetConfig?.show_chat_history ?? true) && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
            <Button
              className="w-full gap-2"
              onClick={handleNewChat}
              disabled={loading}
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Novo Chat
            </Button>
          </div>
        )}

        {phase === "waiting" && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
            <div className={allBusy || outsideHours ? "" : "animate-pulse"}>
              <MessageSquare className="h-12 w-12 opacity-50" style={{ color: primaryColor }} />
            </div>
            {outsideHours && (widgetConfig?.show_outside_hours_banner ?? true) ? (
              <div className="text-center space-y-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 max-w-xs">
                <p className="text-sm font-medium text-blue-800">
                  {widgetConfig?.outside_hours_title ?? "Estamos fora do horário de atendimento."}
                </p>
                <p className="text-xs text-blue-700">
                  {widgetConfig?.outside_hours_message ?? "Sua mensagem ficará registrada e responderemos assim que voltarmos."}
                </p>
              </div>
            ) : allBusy && (widgetConfig?.show_all_busy_banner ?? true) ? (
              <div className="text-center space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 max-w-xs">
                <p className="text-sm font-medium text-amber-800">
                  {widgetConfig?.all_busy_title ?? "Todos os atendentes estão ocupados no momento."}
                </p>
                <p className="text-xs text-amber-700">
                  {widgetConfig?.all_busy_message ?? "Você está na fila e será atendido em breve. Por favor, aguarde."}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  {widgetConfig?.waiting_message ?? "Aguardando atendimento..."}
                </p>
                <p className="text-xs text-muted-foreground">Você será conectado em breve.</p>
              </>
            )}
          </div>
        )}

        {(phase === "chat" || phase === "csat" || phase === "closed" || phase === "viewTranscript") && (
          <div className="flex-1 overflow-y-auto p-4 min-h-0" ref={scrollRef}>
            {hasMoreMessages && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full text-xs mb-3 py-2 px-3 border rounded-md hover:bg-muted/50 disabled:opacity-50 flex items-center justify-center gap-1"
                style={{ color: primaryColor, borderColor: `${primaryColor}33` }}
              >
                {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "▲ Carregar anteriores"}
              </button>
            )}
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
                    {msg.message_type === "file" && msg.metadata?.file_url
                      ? renderFileMessage(msg)
                      : <p>{msg.content}</p>
                    }
                  </div>
                </div>
              ))}

              {phase === "viewTranscript" && messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem nesta conversa.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {phase === "csat" && (widgetConfig?.show_csat ?? true) && (
        <div className="p-4 space-y-4 border-t">
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

      {phase === "csat" && !(widgetConfig?.show_csat ?? true) && (
        <div className="p-4 text-center text-sm text-muted-foreground border-t">
          <p>Obrigado! Esta conversa foi encerrada.</p>
          <Button className="mt-2 w-full" onClick={() => { if (isResolvedVisitor) { handleBackToHistory(); } else { setPhase("closed"); } }} style={{ backgroundColor: primaryColor }}>
            Concluir
          </Button>
        </div>
      )}

      {phase === "closed" && (
        <div className="p-4 text-center text-sm text-muted-foreground border-t">
          <p>Obrigado pelo feedback! Esta conversa foi encerrada.</p>
        </div>
      )}

      {/* File preview bar */}
      {phase === "chat" && pendingFile && (
        <div className="border-t px-3 py-2 flex items-center gap-2 bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs truncate flex-1">{pendingFile.name}</span>
          <button onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Input bar */}
      {phase === "chat" && (
        <div className="border-t p-3 flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          {(widgetConfig?.allow_file_attachments ?? true) && (
          <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Paperclip className="h-4 w-4" />
          </Button>
          )}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={uploading}
          />
          <Button size="icon" onClick={handleSend} disabled={(!input.trim() && !pendingFile) || uploading} style={{ backgroundColor: primaryColor }}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {phase === "viewTranscript" && (
        <div className="border-t p-3">
          <Button variant="outline" className="w-full gap-2" onClick={handleBackToHistory}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao histórico
          </Button>
        </div>
      )}
    </Card>
  );

  // Lightbox dialog
  const lightboxDialog = (
    <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
      <DialogContent className="max-w-3xl p-2">
        {lightboxUrl && <img src={lightboxUrl} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain rounded" />}
      </DialogContent>
    </Dialog>
  );

  if (isEmbed) {
    return (
      <>
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "transparent",
          }}
        >
          {widgetContent}
        </div>
        {lightboxDialog}
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        {widgetContent}
      </div>
      {lightboxDialog}
    </>
  );
};

export default ChatWidget;
