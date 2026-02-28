import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { renderTextWithLinks } from "@/utils/chatUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Star, Loader2, X, Plus, ArrowLeft, Clock, CheckCircle2, Paperclip, FileText, Download, ArrowRight, User, Mail, Phone, ArrowDown } from "lucide-react";
import { toast } from "sonner";

type WidgetPhase = "form" | "history" | "waiting" | "chat" | "csat" | "closed" | "viewTranscript";

interface HistoryRoom {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
  last_message?: string | null;
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

import { MAX_FILE_SIZE, isImage, formatFileSize, uploadChatFile, type FileMetadata } from "@/utils/chatUtils";

const ChatWidget = () => {
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";
  const companyName = searchParams.get("companyName") ?? "Suporte";
  const position = searchParams.get("position") ?? "right";
  const primaryColor = searchParams.get("primaryColor") ?? "#7C3AED";
  const buttonShape = searchParams.get("buttonShape") ?? "circle";
  const paramVisitorToken = searchParams.get("visitorToken");
  const paramVisitorName = searchParams.get("visitorName");
  const paramOwnerUserId = searchParams.get("ownerUserId");
  const paramCompanyContactId = searchParams.get("companyContactId");
  const paramContactId = searchParams.get("contactId");
  const paramApiKey = searchParams.get("apiKey");

  const isResolvedVisitor = !!paramVisitorToken && !!paramOwnerUserId;

  const [isOpen, setIsOpen] = useState(!isEmbed);
  const [phase, setPhase] = useState<WidgetPhase>("form");
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [customProps, setCustomProps] = useState<Record<string, any>>({});
  const [input, setInput] = useState("");
  const [csatScore, setCsatScore] = useState(0);
  const [csatComment, setCsatComment] = useState("");
  const [formData, setFormData] = useState({ name: paramVisitorName || "", email: "", phone: "" });
  const [attendantName, setAttendantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allBusy, setAllBusy] = useState(false);
  const [outsideHours, setOutsideHours] = useState(false);
  const [historyRooms, setHistoryRooms] = useState<HistoryRoom[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcast = useRef<number>(0);
  // attendantLastReadAt removed — checks moved to workspace
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
    allow_multiple_chats: boolean;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const isOpenRef = useRef(isOpen);

  const isRight = position !== "left";

  const postMsg = (type: string) => {
    if (isEmbed) window.parent.postMessage({ type }, "*");
  };

  // Notify parent iframe about open/close state for dynamic resizing
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isEmbed) {
      window.parent.postMessage({ type: "chat-toggle", isOpen }, "*");
    }
    // When widget opens, reset unread and trigger scroll
    if (isOpen) {
      setUnreadCount(0);
      setScrollTrigger(prev => prev + 1);
      if (isEmbed) {
        window.parent.postMessage({ type: "chat-unread-count", count: 0 }, "*");
      }
      // Update visitor_last_read_at when widget opens and there's an active room
      if (roomId && (phase === "chat" || phase === "waiting")) {
        supabase.from("chat_rooms").update({ visitor_last_read_at: new Date().toISOString() }).eq("id", roomId).then(() => {});
      }
    }
  }, [isOpen, isEmbed]);

  // Force transparent background on html/body when embedded in iframe
  useEffect(() => {
    if (isEmbed) {
      document.documentElement.setAttribute("data-embed", "true");
      [document.documentElement, document.body, document.getElementById("root")].forEach((el) => {
        if (el) {
          el.style.setProperty("background", "transparent", "important");
          el.style.setProperty("background-color", "transparent", "important");
        }
      });
    }
  }, [isEmbed]);

  // Listen for NPSChat.update() messages from parent frame
  const autoStartTriggered = useRef(false);
  useEffect(() => {
    if (!isEmbed) return;
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === "nps-chat-update" && event.data.props) {
        const props = event.data.props;
        const { name, email, phone, ...custom } = props;
        setFormData(prev => ({
          name: name ?? prev.name,
          email: email ?? prev.email,
          phone: phone ?? prev.phone,
        }));
        if (Object.keys(custom).length > 0) {
          setCustomProps(prev => ({ ...prev, ...custom }));
        }
        // Auto-start: if name provided and still on form phase with no active visitor
        if (name && !autoStartTriggered.current && !visitorId) {
          autoStartTriggered.current = true;
        }

        // If visitor already exists, sync data to backend in background
        if (visitorId && paramApiKey) {
          const RESERVED = ["name", "email", "phone", "company_id", "company_name", "user_id"];
          const payload: Record<string, any> = { api_key: paramApiKey };
          const customData: Record<string, any> = {};
          for (const [key, val] of Object.entries(props)) {
            if (RESERVED.includes(key)) {
              payload[key] = val;
            } else {
              customData[key] = val;
            }
          }
          if (Object.keys(customData).length > 0) payload.custom_data = customData;

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          fetch(`${supabaseUrl}/functions/v1/resolve-chat-visitor`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": supabaseAnonKey },
            body: JSON.stringify(payload),
          }).then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              // Update room IDs if returned
              if (roomId && (data.contact_id || data.company_contact_id)) {
                await supabase.from("chat_rooms").update({
                  ...(data.contact_id ? { contact_id: data.contact_id } : {}),
                  ...(data.company_contact_id ? { company_contact_id: data.company_contact_id } : {}),
                }).eq("id", roomId);
              }
            }
          }).catch(() => {});
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isEmbed, visitorId, paramApiKey, roomId]);

  // Auto-start chat when name+email provided via update() API
  useEffect(() => {
    if (autoStartTriggered.current && formData.name && phase === "form" && !visitorId && !loading) {
      handleStartChat();
    }
  }, [formData.name, phase, visitorId]);

  const fetchHistory = useCallback(async (vId: string) => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("chat_rooms")
      .select("id, status, created_at, closed_at, csat_score, resolution_status")
      .eq("visitor_id", vId)
      .order("created_at", { ascending: false });
    
    // Fetch last message for each room
    const rooms = data ?? [];
    const roomsWithPreview = await Promise.all(
      rooms.map(async (room) => {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("content")
          .eq("room_id", room.id)
          .neq("sender_type", "system")
          .eq("is_internal", false)
          .order("created_at", { ascending: false })
          .limit(1);
        return { ...room, last_message: msgs?.[0]?.content ?? null };
      })
    );
    
    setHistoryRooms(roomsWithPreview);
    setHistoryLoading(false);
    return roomsWithPreview;
  }, []);

  useEffect(() => {
    const init = async () => {
      // Fetch widget display config if ownerUserId is available
      const ownerForConfig = paramOwnerUserId;
      if (ownerForConfig && ownerForConfig !== "00000000-0000-0000-0000-000000000000") {
        const { data: cfg } = await supabase
          .from("chat_settings")
          .select("show_outside_hours_banner, outside_hours_title, outside_hours_message, show_all_busy_banner, all_busy_title, all_busy_message, waiting_message, show_email_field, show_phone_field, form_intro_text, show_chat_history, show_csat, allow_file_attachments, allow_multiple_chats")
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
            .select("id, status, attendant_id")
            .eq("visitor_id", visitor.id)
            .in("status", ["waiting", "active"])
            .maybeSingle();

          if (room) {
            setRoomId(room.id);
            setPhase(room.status === "active" ? "chat" : "waiting");
            if (room.status === "active" && room.attendant_id) {
              const { data: att } = await supabase
                .from("attendant_profiles")
                .select("display_name")
                .eq("id", room.attendant_id)
                .maybeSingle();
              setAttendantName(att?.display_name ?? null);
            }
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
            .select("id, status, attendant_id")
            .eq("visitor_id", visitor.id)
            .in("status", ["waiting", "active"])
            .maybeSingle();

          if (room) {
            setRoomId(room.id);
            if (room.status === "active") {
              setPhase("chat");
              if (room.attendant_id) {
                const { data: att } = await supabase
                  .from("attendant_profiles")
                  .select("display_name")
                  .eq("id", room.attendant_id)
                  .maybeSingle();
                setAttendantName(att?.display_name ?? null);
              }
            } else {
              setPhase("waiting");
            }
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
          // Play notification sound for attendant messages
          if (msg.sender_type === "attendant") {
            try {
              const audio = new Audio(
                "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGjlqj8Lb1LRiQhY0YYa95+3UdFQmLFl7p+Xj2p6MiWpXdZqXh3FxOBImWVhzl5KCcHM1EjhWX3eVkYBxcjURO1hdepCSfm5pJytRVnqNjoFyey8lRE55lYd5ciwnNk55ioJ3ay0vQU94jXlwYSAyREhqfG9eLjAqI0E="
              );
              audio.volume = 0.25;
              audio.play().catch(() => {});
            } catch {}
            // Track unread when widget is minimized
            if (!isOpenRef.current) {
              setUnreadCount(prev => {
                const next = prev + 1;
                if (isEmbed) {
                  window.parent.postMessage({ type: "chat-unread-count", count: next }, "*");
                }
                return next;
              });
            }
          }
          setMessages((prev) => {
            // Remove any optimistic version of this message to prevent duplicates
            const withoutOptimistic = prev.filter((m) => !m.id.startsWith("optimistic-"));
            // Also check if the real message already exists
            if (withoutOptimistic.some((m) => m.id === msg.id)) return withoutOptimistic;
            return [...withoutOptimistic, msg];
          });
          // Update visitor_last_read_at only when widget is open AND message is from attendant/system
          if (isOpenRef.current && isOpen && (msg.sender_type === "attendant" || msg.sender_type === "system")) {
            supabase.from("chat_rooms").update({ visitor_last_read_at: new Date().toISOString() }).eq("id", roomId!).then(() => {});
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchMessages]);

  // Typing indicator broadcast
  useEffect(() => {
    if (!roomId) { setTypingUser(null); return; }
    setTypingUser(null);

    const channel = supabase
      .channel(`typing-${roomId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const name = payload.payload?.name;
        if (name) {
          setTypingUser(name);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`widget-room-${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${roomId}` }, async (payload) => {
        const room = payload.new as any;
        if (room.status === "active" && phase === "waiting") {
          setAllBusy(false);
          setPhase("chat");
          postMsg("chat-connected");
          // Fetch attendant name
          if (room.attendant_id) {
            const { data: att } = await supabase
              .from("attendant_profiles")
              .select("display_name")
              .eq("id", room.attendant_id)
              .maybeSingle();
            setAttendantName(att?.display_name ?? null);
          }
        } else if (room.status === "closed") {
          const resStatus = room.resolution_status;
          if (resStatus === "resolved") {
            setPhase("csat");
          } else {
            // pending or archived — skip CSAT
            if (isResolvedVisitor) {
              handleBackToHistory();
            } else {
              setPhase("closed");
            }
          }
          setAttendantName(null);
        }
        // visitor_last_read_at is now only updated on widget open and new message arrival
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, phase]);

  // Realtime subscription for proactive chats (new rooms created by attendants)
  useEffect(() => {
    if (!visitorId) return;

    const channel = supabase
      .channel(`widget-new-rooms-${visitorId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_rooms",
        filter: `visitor_id=eq.${visitorId}`,
      }, async (payload) => {
        const newRoom = payload.new as any;
        // If not currently in an active conversation, auto-enter the new proactive chat
        if (phase !== "chat" && phase !== "waiting" && phase !== "csat") {
          setRoomId(newRoom.id);
          setMessages([]);
          setCsatScore(0);
          setCsatComment("");
          if (newRoom.status === "active") {
            setPhase("chat");
            if (newRoom.attendant_id) {
              const { data: att } = await supabase
                .from("attendant_profiles")
                .select("display_name")
                .eq("id", newRoom.attendant_id)
                .maybeSingle();
              setAttendantName(att?.display_name ?? null);
            }
          } else {
            setPhase("waiting");
          }
          postMsg("chat-ready");
        }
        // If viewing history, refresh the list
        if (phase === "history") {
          fetchHistory(visitorId);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [visitorId, phase, fetchHistory]);

  // Trigger scroll when phase changes to chat/viewTranscript + update read status
  useEffect(() => {
    if (phase === "chat" || phase === "viewTranscript") {
      setScrollTrigger(prev => prev + 1);
    }
    // Update visitor_last_read_at when entering chat phase
    if (phase === "chat" && roomId) {
      supabase.from("chat_rooms").update({ visitor_last_read_at: new Date().toISOString() }).eq("id", roomId).then(() => {});
    }
  }, [phase, roomId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Use double-rAF to ensure scroll happens after layout + paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, [messages, scrollTrigger]);

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
          setAttendantName(data.attendant_name ?? null);
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

    // Check if multiple chats are allowed
    if (!(widgetConfig?.allow_multiple_chats ?? false)) {
      const { data: existingRooms } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("visitor_id", visitorId)
        .in("status", ["waiting", "active"])
        .limit(1);

      if (existingRooms && existingRooms.length > 0) {
        toast.error("Você já possui um chat ativo. Finalize-o antes de iniciar outro.");
        setLoading(false);
        return;
      }
    }

    const newRoom = await createLinkedRoom(visitorId);
    if (newRoom) {
      setRoomId(newRoom.id);
      setMessages([]);
      setCsatScore(0);
      setCsatComment("");
      if (newRoom.status === "active" && newRoom.attendant_id) {
        const { data: att } = await supabase
          .from("attendant_profiles")
          .select("display_name")
          .eq("id", newRoom.attendant_id)
          .maybeSingle();
        setAttendantName(att?.display_name ?? null);
        setPhase("chat");
      } else {
        setPhase("waiting");
        await checkRoomAssignment(newRoom.id);
      }
      postMsg("chat-ready");
    }
    setLoading(false);
  };

  // Reopen a pending chat (client side)
  const handleReopenChat = async (reopenRoomId: string) => {
    if (!visitorId) return;
    setLoading(true);

    // Check if multiple chats are allowed
    if (!(widgetConfig?.allow_multiple_chats ?? false)) {
      const { data: existingRooms } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("visitor_id", visitorId)
        .in("status", ["waiting", "active"])
        .limit(1);

      if (existingRooms && existingRooms.length > 0) {
        toast.error("Você já possui um chat ativo. Finalize-o antes de reabrir outro.");
        setLoading(false);
        return;
      }
    }

    // Reopen the room
    await supabase.from("chat_rooms").update({
      status: "waiting",
      closed_at: null,
      resolution_status: null,
    }).eq("id", reopenRoomId);

    // System message
    await supabase.from("chat_messages").insert({
      room_id: reopenRoomId,
      sender_type: "system",
      sender_name: "Sistema",
      content: "[Sistema] Chat reaberto pelo cliente",
      is_internal: false,
    });

    setRoomId(reopenRoomId);
    setMessages([]);
    setPhase("waiting");
    await checkRoomAssignment(reopenRoomId);
    setLoading(false);
  };

  const [viewTranscriptResolutionStatus, setViewTranscriptResolutionStatus] = useState<string | null>(null);

  const handleViewTranscript = async (rId: string) => {
    // Fetch resolution_status for this room
    const { data: roomData } = await supabase
      .from("chat_rooms")
      .select("resolution_status")
      .eq("id", rId)
      .maybeSingle();
    setViewTranscriptResolutionStatus(roomData?.resolution_status ?? null);
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

  // Company upsert logic has been moved to resolve-chat-visitor edge function

  const handleStartChat = async () => {
    if (!formData.name.trim()) return;
    setLoading(true);
    setAllBusy(false);

    let ownerUserId = paramOwnerUserId;
    let finalCompanyContactId: string | null = paramCompanyContactId || null;
    let finalContactId: string | null = paramContactId || null;
    let resolvedVisitorToken: string | null = null;
    let resolvedVisitorId: string | null = null;

    const hasCustomProps = Object.keys(customProps).length > 0;

    // Use resolve-chat-visitor for full upsert if we have an API key
    if (paramApiKey) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        // Build payload separating reserved from custom
        const RESERVED = ["name", "email", "phone", "company_id", "company_name", "user_id"];
        const payload: Record<string, any> = {
          api_key: paramApiKey,
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
        };

        // Add external_id from URL if present
        const urlExternalId = new URLSearchParams(window.location.search).get("externalId");
        if (urlExternalId) payload.external_id = urlExternalId;

        // Separate custom props
        const customData: Record<string, any> = {};
        for (const [key, val] of Object.entries(customProps)) {
          if (RESERVED.includes(key)) {
            payload[key] = val;
          } else {
            customData[key] = val;
          }
        }
        if (Object.keys(customData).length > 0) payload.custom_data = customData;

        const res = await fetch(`${supabaseUrl}/functions/v1/resolve-chat-visitor`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": supabaseAnonKey },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user_id) ownerUserId = data.user_id;
          if (data.contact_id) finalContactId = data.contact_id;
          if (data.company_contact_id) finalCompanyContactId = data.company_contact_id;
          if (data.visitor_token) {
            resolvedVisitorToken = data.visitor_token;
            localStorage.setItem("chat_visitor_token", data.visitor_token);

            // Get visitor ID
            const { data: vData } = await supabase
              .from("chat_visitors")
              .select("id")
              .eq("visitor_token", data.visitor_token)
              .maybeSingle();
            if (vData) resolvedVisitorId = vData.id;
          }
        }
      } catch { /* fallback below */ }
    }

    if (!ownerUserId) ownerUserId = "00000000-0000-0000-0000-000000000000";

    // If resolver already created a visitor, use it
    if (resolvedVisitorId) {
      setVisitorToken(resolvedVisitorToken);
      setVisitorId(resolvedVisitorId);

      const { data: room } = await supabase
        .from("chat_rooms")
        .insert({
          visitor_id: resolvedVisitorId,
          owner_user_id: ownerUserId,
          status: "waiting",
          ...(finalCompanyContactId ? { company_contact_id: finalCompanyContactId } : {}),
          ...(finalContactId ? { contact_id: finalContactId } : {}),
          ...(hasCustomProps ? { metadata: customProps } : {}),
        })
        .select("id, status, attendant_id")
        .single();

      if (room) {
        setRoomId(room.id);
        if (room.status === "active" && room.attendant_id) {
          const { data: att } = await supabase
            .from("attendant_profiles")
            .select("display_name")
            .eq("id", room.attendant_id)
            .maybeSingle();
          setAttendantName(att?.display_name ?? null);
          setPhase("chat");
        } else {
          setPhase("waiting");
        }
        postMsg("chat-ready");
      }
      setLoading(false);
      return;
    }

    // Fallback: create visitor directly (no API key / anonymous mode)
    const { data: visitor, error: vError } = await supabase
      .from("chat_visitors")
      .insert({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        owner_user_id: ownerUserId,
        ...(finalCompanyContactId ? { company_contact_id: finalCompanyContactId } : {}),
        ...(finalContactId ? { contact_id: finalContactId } : {}),
        ...(hasCustomProps ? { metadata: customProps } : {}),
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
        owner_user_id: ownerUserId,
        status: "waiting",
        ...(finalCompanyContactId ? { company_contact_id: finalCompanyContactId } : {}),
        ...(finalContactId ? { contact_id: finalContactId } : {}),
        ...(hasCustomProps ? { metadata: customProps } : {}),
      })
      .select("id, status, attendant_id")
      .single();

    if (room) {
      setRoomId(room.id);
      if (room.status === "active" && room.attendant_id) {
        const { data: att } = await supabase
          .from("attendant_profiles")
          .select("display_name")
          .eq("id", room.attendant_id)
          .maybeSingle();
        setAttendantName(att?.display_name ?? null);
        setPhase("chat");
      } else {
        setPhase("waiting");
      }
      postMsg("chat-ready");
    }

    setLoading(false);
  };

  const uploadFile = async (file: File) => {
    const result = await uploadChatFile(file);
    if (!result) {
      toast.error("Erro ao enviar arquivo");
      return null;
    }
    return result;
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
    const senderName = formData.name || paramVisitorName || "Visitante";
    setInput("");
    setPendingFile(null);

    // Optimistic: add message immediately with pending state
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: ChatMsg = {
      id: optimisticId,
      content,
      sender_type: "visitor",
      sender_name: senderName,
      created_at: new Date().toISOString(),
      message_type: metadata ? "file" : undefined,
      metadata: metadata ?? undefined,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_type: "visitor",
      sender_id: visitorToken,
      sender_name: senderName,
      content,
      ...(metadata ? { message_type: "file", metadata } : {}),
    });

    if (error) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast.error("Erro ao enviar mensagem");
    }
    // On success, the realtime subscription will add the real message;
    // remove optimistic to avoid duplicates
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
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return mins <= 1 ? "agora" : `há ${mins} min`;
    }
    if (diffHours < 24) return `há ${Math.floor(diffHours)}h`;
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

  const getInitials = (name: string) => {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  };

  const darkenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
  };

  const csatEmoji = (score: number) => {
    if (score <= 1) return "😞";
    if (score <= 2) return "😕";
    if (score <= 3) return "😐";
    if (score <= 4) return "🙂";
    return "😄";
  };

  const renderFileMessage = (msg: ChatMsg) => {
    const meta = msg.metadata;
    if (!meta?.file_url) return <p>{msg.content}</p>;

    if (isImage(meta.file_type || "")) {
      return (
        <div className="space-y-1 cursor-pointer" onClick={() => window.open(meta.file_url!, '_blank', 'noopener,noreferrer')}>
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

  // FAB button when closed (embed mode)
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
        <div style={{ position: "relative", display: "inline-flex" }}>
          <button
            onClick={() => setIsOpen(true)}
            className={`${buttonShape === "square" ? "rounded-lg" : "rounded-full"} flex items-center justify-center transition-all duration-300 hover:scale-[1.08] animate-scale-in active:scale-95`}
            style={{
              width: "60px",
              height: "60px",
              background: `linear-gradient(135deg, ${primaryColor}, ${darkenColor(primaryColor, 10)})`,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              boxShadow: `0 4px 14px ${primaryColor}40`,
            }}
          >
            <MessageSquare className="h-7 w-7 transition-transform duration-300" />
          </button>
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                minWidth: "22px",
                height: "22px",
                borderRadius: "11px",
                background: "#EF4444",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 5px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                animation: "scale-in 0.2s ease-out",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Helper: should messages be grouped (same sender, <2min apart)
  const shouldGroup = (prev: ChatMsg | null, curr: ChatMsg) => {
    if (!prev) return false;
    if (prev.sender_type !== curr.sender_type) return false;
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff < 2 * 60 * 1000;
  };

  const primaryDark = darkenColor(primaryColor, 15);

  const widgetContent = (
    <Card
      className={`flex flex-col overflow-hidden border-0 shadow-2xl min-h-0 ${isEmbed ? "flex-1 rounded-2xl" : "rounded-2xl"}`}
      style={isEmbed ? { width: "100%", height: "100%", minHeight: 0 } : { width: "100%", maxWidth: "420px", height: "600px" }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center gap-3 rounded-t-2xl relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})`, color: "#fff" }}
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
            className="p-1.5 rounded-full transition-all hover:bg-white/20 active:scale-95 backdrop-blur-sm"
            style={{ color: "#fff" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        {/* Attendant avatar or icon */}
        {phase === "chat" && attendantName ? (
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs font-semibold">
              {getInitials(attendantName)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 animate-pulse-soft" style={{ borderColor: primaryColor }} />
          </div>
        ) : (
          <div className="h-9 w-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <MessageSquare className="h-4.5 w-4.5" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{companyName}</p>
          <p className="text-xs opacity-80 animate-fade-in truncate" key={phase + (attendantName || "")}>
            {phase === "chat" ? (attendantName ? `Você está falando com ${attendantName}` : "Chat ativo") : phase === "waiting" ? "Aguardando..." : phase === "history" ? "Suas conversas" : phase === "viewTranscript" ? "Histórico" : "Suporte"}
          </p>
        </div>

        {isEmbed && (
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full transition-all hover:bg-white/20 active:scale-95 backdrop-blur-sm border border-white/20"
            style={{ color: "#fff" }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">

        {/* ===== FORM PHASE ===== */}
        {phase === "form" && (
          <div className="flex-1 overflow-y-auto p-5 relative">
            {/* Decorative background icon */}
            <div className="absolute top-4 right-4 opacity-[0.04] pointer-events-none">
              <MessageSquare className="h-28 w-28" style={{ color: primaryColor }} />
            </div>
            <div className="space-y-5 relative z-10">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {widgetConfig?.form_intro_text ?? "Preencha seus dados para iniciar o atendimento."}
              </p>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nome *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome" className="pl-9" />
                </div>
              </div>
              {(widgetConfig?.show_email_field ?? true) && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" type="email" className="pl-9" />
                  </div>
                </div>
              )}
              {(widgetConfig?.show_phone_field ?? true) && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" className="pl-9" />
                  </div>
                </div>
              )}
              <button
                className="w-full h-11 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none group"
                onClick={handleStartChat}
                disabled={loading || !formData.name.trim()}
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})` }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Iniciar Conversa
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* ===== HISTORY PHASE ===== */}
        {phase === "history" && (widgetConfig?.show_chat_history ?? true) && (
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="space-y-3">
              <button
                className="w-full h-10 rounded-full text-sm font-medium text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                onClick={handleNewChat}
                disabled={loading || historyRooms.some((r) => r.status === "waiting" || r.status === "active")}
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})` }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Novo Chat
              </button>

              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : historyRooms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa anterior.</p>
              ) : (
                historyRooms.map((room) => {
                  const isActive = room.status === "waiting" || room.status === "active";
                  const isPending = room.status === "closed" && (room as any).resolution_status === "pending";
                  const statusColor = isActive ? primaryColor : isPending ? "#f59e0b" : "#9ca3af";
                  return (
                    <div
                      key={room.id}
                      className="w-full text-left rounded-xl border border-border/60 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group"
                    >
                      {/* Status bar left */}
                      <div className="flex">
                        <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: statusColor }} />
                        <div className="flex-1 p-3">
                          <button
                            className="w-full text-left"
                            onClick={() => {
                              if (isActive) {
                                setRoomId(room.id);
                                setPhase(room.status === "active" ? "chat" : "waiting");
                              } else {
                                handleViewTranscript(room.id);
                              }
                            }}
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
                                {isPending && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Pendente</span>
                                )}
                              </div>
                              {room.csat_score != null && (
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((v) => (
                                    <Star key={v} className={`h-2.5 w-2.5 ${v <= (room.csat_score ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
                                  ))}
                                </div>
                              )}
                            </div>
                            {room.last_message && (
                              <p className="text-xs text-muted-foreground italic line-clamp-1 mt-0.5">{room.last_message}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                              {formatDate(room.created_at)}
                              {room.closed_at && ` — ${formatDate(room.closed_at)}`}
                            </p>
                          </button>
                          {isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2 text-xs gap-1 rounded-lg active:scale-95"
                              onClick={() => handleReopenChat(room.id)}
                              disabled={loading}
                            >
                              Retomar conversa
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {phase === "history" && !(widgetConfig?.show_chat_history ?? true) && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
            <button
              className="w-full h-10 rounded-full text-sm font-medium text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              onClick={handleNewChat}
              disabled={loading}
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})` }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Novo Chat
            </button>
          </div>
        )}

        {/* ===== WAITING PHASE ===== */}
        {phase === "waiting" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Indeterminate progress bar */}
            <div className="h-0.5 w-full bg-muted overflow-hidden">
              <div className="h-full w-1/3 rounded-full animate-indeterminate" style={{ backgroundColor: primaryColor }} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
              <div className="relative">
                <MessageSquare className="h-12 w-12 relative z-10" style={{ color: primaryColor, opacity: 0.7 }} />
                {!allBusy && !outsideHours && (
                  <>
                    <span className="absolute inset-0 rounded-full animate-ripple" style={{ backgroundColor: `${primaryColor}20` }} />
                    <span className="absolute inset-0 rounded-full animate-ripple" style={{ backgroundColor: `${primaryColor}15`, animationDelay: "0.6s" }} />
                  </>
                )}
              </div>
              {outsideHours && (widgetConfig?.show_outside_hours_banner ?? true) ? (
                <div className="text-center space-y-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 max-w-xs animate-fade-in">
                  <p className="text-sm font-medium text-blue-800">
                    {widgetConfig?.outside_hours_title ?? "Estamos fora do horário de atendimento."}
                  </p>
                  <p className="text-xs text-blue-700">
                    {widgetConfig?.outside_hours_message ?? "Sua mensagem ficará registrada e responderemos assim que voltarmos."}
                  </p>
                </div>
              ) : allBusy && (widgetConfig?.show_all_busy_banner ?? true) ? (
                <div className="text-center space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 max-w-xs animate-fade-in">
                  <p className="text-sm font-medium text-amber-800">
                    {widgetConfig?.all_busy_title ?? "Todos os atendentes estão ocupados no momento."}
                  </p>
                  <p className="text-xs text-amber-700">
                    {widgetConfig?.all_busy_message ?? "Você está na fila e será atendido em breve. Por favor, aguarde."}
                  </p>
                </div>
              ) : (
                <div className="text-center animate-fade-in">
                  <p className="text-sm text-muted-foreground">
                    {widgetConfig?.waiting_message ?? "Aguardando atendimento"}
                    <span className="inline-block w-6 text-left">...</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Você será conectado em breve.</p>
                </div>
              )}
            </div>
            {/* Input during waiting */}
            <div className="border-t p-3">
            <div className="flex items-end gap-2 bg-muted/30 rounded-2xl border border-border/50 px-3 py-1">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                  }}
                  placeholder="Envie uma mensagem enquanto aguarda..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px] max-h-[100px] py-2 px-0 resize-none border-0"
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.startsWith("image/") || items[i].type.startsWith("application/")) {
                        const file = items[i].getAsFile();
                        if (file) { e.preventDefault(); handleFileSelect(file); return; }
                      }
                    }
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 disabled:opacity-30"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})`, color: "#fff" }}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== CHAT / TRANSCRIPT MESSAGES ===== */}
        {(phase === "chat" || phase === "csat" || phase === "closed" || phase === "viewTranscript") && (
          <div className="flex-1 overflow-y-auto p-4 min-h-0" ref={scrollRef}>
            {hasMoreMessages && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full text-xs mb-3 py-2 px-3 rounded-lg hover:bg-muted/50 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                style={{ color: primaryColor }}
              >
                {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "▲ Carregar anteriores"}
              </button>
            )}
            <div className="space-y-1">
              {messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                const grouped = shouldGroup(prevMsg, msg);
                const isLastInGroup = !nextMsg || !shouldGroup(msg, nextMsg);

                // Parse quoted replies
                const hasQuote = msg.content.startsWith("> ");
                let quoteText = "";
                let mainContent = msg.content;
                if (hasQuote) {
                  const lines = msg.content.split("\n");
                  const quoteLines: string[] = [];
                  let i = 0;
                  while (i < lines.length && lines[i].startsWith("> ")) {
                    quoteLines.push(lines[i].slice(2));
                    i++;
                  }
                  if (i < lines.length && lines[i].trim() === "") i++;
                  quoteText = quoteLines.join("\n");
                  mainContent = lines.slice(i).join("\n");
                }

              return msg.sender_type === "system" ? (
                  <div key={msg.id} className="flex justify-center my-3">
                    <p className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-center max-w-[85%]">
                      {mainContent || msg.content}
                    </p>
                  </div>
                ) : (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === "visitor" ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}
                  >
                    <div
                      className={`max-w-[75%] px-3.5 py-2 text-sm transition-colors ${
                        msg.sender_type === "visitor"
                          ? "text-white rounded-2xl rounded-br-md"
                          : "bg-muted/50 border border-border/40 rounded-2xl rounded-bl-md"
                      }`}
                      style={msg.sender_type === "visitor" ? { backgroundColor: primaryColor } : {}}
                    >
                      {msg.sender_type !== "visitor" && !grouped && (
                        <p className="text-[11px] font-medium mb-1 text-muted-foreground">{msg.sender_name}</p>
                      )}
                      {hasQuote && quoteText && (
                        <div className={`text-[11px] rounded-lg px-2 py-1 mb-1.5 border-l-2 ${
                          msg.sender_type === "visitor"
                            ? "bg-white/10 border-white/30 opacity-80"
                            : "bg-background/50 border-muted-foreground/30 text-muted-foreground"
                        }`}>
                          <span style={{ whiteSpace: 'pre-wrap' }}>{quoteText}</span>
                        </div>
                      )}
                      {msg.message_type === "file" && msg.metadata?.file_url
                        ? <>
                            {renderFileMessage(msg)}
                            {msg.content && msg.content !== msg.metadata.file_name && (
                              <p className="mt-1 whitespace-pre-wrap" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderTextWithLinks(msg.content, msg.sender_type === "visitor")}</p>
                            )}
                          </>
                        : <p className="whitespace-pre-wrap" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderTextWithLinks(mainContent || msg.content, msg.sender_type === "visitor")}</p>
                      }
                      {isLastInGroup && (
                        <p className="text-[10px] opacity-40 mt-1 text-right flex items-center justify-end gap-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator — wave dots */}
              {typingUser && phase === "chat" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 mt-2">
                  <span className="italic">{typingUser} digitando</span>
                  <span className="flex gap-[3px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-wave-dot" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-wave-dot" style={{ animationDelay: "200ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-wave-dot" style={{ animationDelay: "400ms" }} />
                  </span>
                </div>
              )}

              {phase === "viewTranscript" && messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem nesta conversa.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== CSAT PHASE ===== */}
      {phase === "csat" && (widgetConfig?.show_csat ?? true) && (
        <div className="p-5 space-y-4 border-t animate-fade-in">
          <p className="text-sm font-medium text-center">Avalie o atendimento</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setCsatScore(v)}
                className="focus:outline-none transition-transform duration-150 hover:scale-110 active:scale-125"
              >
                <Star className={`h-8 w-8 transition-colors ${v <= csatScore ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
          {csatScore > 0 && (
            <p className="text-2xl text-center animate-scale-in">{csatEmoji(csatScore)}</p>
          )}
          <Textarea
            placeholder="Comentário (opcional)"
            value={csatComment}
            onChange={(e) => setCsatComment(e.target.value)}
            maxLength={500}
            className="rounded-xl"
          />
          {csatComment.length > 0 && (
            <p className="text-[10px] text-muted-foreground text-right">{csatComment.length}/500</p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl active:scale-95"
              onClick={() => {
                if (isResolvedVisitor) handleBackToHistory();
                else setPhase("closed");
              }}
            >
              Pular
            </Button>
            <button
              className="flex-1 h-10 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              onClick={handleSubmitCsat}
              disabled={csatScore === 0}
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})` }}
            >
              Enviar Avaliação
            </button>
          </div>
        </div>
      )}

      {phase === "csat" && !(widgetConfig?.show_csat ?? true) && (
        <div className="p-5 text-center text-sm text-muted-foreground border-t animate-fade-in">
          <p>Obrigado! Esta conversa foi encerrada.</p>
          <button
            className="mt-3 w-full h-10 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
            onClick={() => { if (isResolvedVisitor) { handleBackToHistory(); } else { setPhase("closed"); } }}
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})` }}
          >
            Concluir
          </button>
        </div>
      )}

      {/* ===== CLOSED PHASE ===== */}
      {phase === "closed" && (
        <div className="p-6 flex flex-col items-center justify-center text-center border-t animate-fade-in gap-3">
          {/* Animated check */}
          <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" strokeDasharray="24" className="animate-check-draw" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Obrigado pelo feedback!<br/>Esta conversa foi encerrada.</p>
        </div>
      )}

      {/* ===== FILE PREVIEW BAR ===== */}
      {phase === "chat" && pendingFile && (
        <div className="border-t px-4 py-2 flex items-center gap-2 bg-muted/20 animate-slide-up">
          {pendingFile.type.startsWith("image/") ? (
            <img src={URL.createObjectURL(pendingFile)} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs truncate flex-1 text-muted-foreground">{pendingFile.name}</span>
          <button onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ===== INPUT BAR ===== */}
      {phase === "chat" && (
        <div className="border-t p-3">
          <div className="flex items-end gap-2 bg-muted/30 rounded-2xl border border-border/50 px-1 py-1">
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
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-95"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="h-4 w-4" />
              </button>
            )}
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                if (roomId && Date.now() - lastTypingBroadcast.current > 2000) {
                  lastTypingBroadcast.current = Date.now();
                  supabase.channel(`typing-${roomId}`).send({ type: "broadcast", event: "typing", payload: { name: formData.name || paramVisitorName || "Visitante" } }).catch(() => {});
                }
              }}
              placeholder="Digite sua mensagem..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              rows={1}
              disabled={uploading}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px] max-h-[100px] py-2 px-2 resize-none"
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.startsWith("image/") || items[i].type.startsWith("application/")) {
                    const file = items[i].getAsFile();
                    if (file) { e.preventDefault(); handleFileSelect(file); return; }
                  }
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !pendingFile) || uploading}
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 disabled:opacity-30"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})`, color: "#fff" }}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {phase === "viewTranscript" && (
        <div className="border-t p-3 space-y-2">
          {viewTranscriptResolutionStatus === "pending" && (
            <Button
              className="w-full gap-2 rounded-xl active:scale-95 text-white"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})` }}
              onClick={() => roomId && handleReopenChat(roomId)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Retomar conversa
            </Button>
          )}
          <Button variant="outline" className="w-full gap-2 rounded-xl active:scale-95" onClick={handleBackToHistory}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao histórico
          </Button>
        </div>
      )}
    </Card>
  );

  if (isEmbed) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      {widgetContent}
    </div>
  );
};

export default ChatWidget;
