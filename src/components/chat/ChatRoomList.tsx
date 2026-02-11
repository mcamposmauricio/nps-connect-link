import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Clock, AlertTriangle, Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatRoom {
  id: string;
  status: string;
  priority: string;
  created_at: string;
  started_at: string;
  visitor_id: string;
  attendant_id: string | null;
  visitor_name?: string;
  visitor_email?: string;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_type?: string;
  unread_count?: number;
}

interface ChatRoomListProps {
  rooms: ChatRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
  loading: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "<1min";
  if (diff < 60) return `${diff}min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

function getWaitingSlaColor(createdAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (minutes < 5) return "bg-green-500";
  if (minutes < 15) return "bg-yellow-500";
  return "bg-red-500";
}

function durationLabel(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

export function ChatRoomList({ rooms, selectedRoomId, onSelectRoom, loading }: ChatRoomListProps) {
  const { t } = useLanguage();

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "waiting": return "secondary";
      case "closed": return "outline";
      default: return "secondary";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "waiting": return <Clock className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="glass-card h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm">{t("chat.workspace.conversations")}</h3>
        <p className="text-xs text-muted-foreground">{rooms.length} {t("chat.workspace.total")}</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("chat.workspace.no_conversations")}</p>
          ) : (
            rooms.map((room) => {
              const unread = room.unread_count ?? 0;
              const isHighPriority = room.priority === "high" || room.priority === "urgent";

              return (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className={`w-full text-left p-3 rounded-md transition-colors text-sm ${
                    selectedRoomId === room.id
                      ? "bg-primary/10 border border-primary/20"
                      : unread > 0
                        ? "bg-accent/50 hover:bg-accent/70"
                        : "hover:bg-muted/50"
                  } ${isHighPriority ? "border-l-2 border-l-destructive" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      {isHighPriority && (
                        room.priority === "urgent"
                          ? <Flame className="h-3 w-3 text-destructive shrink-0" />
                          : <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />
                      )}
                      <span className={`font-medium text-xs flex-1 min-w-0 truncate ${unread > 0 ? "font-bold" : ""}`}>
                        {room.visitor_name || `#${room.id.slice(0, 8)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {unread > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                      <Badge variant={statusColor(room.status)} className="text-[10px] gap-1 shrink-0">
                        {room.status === "waiting" && (
                          <span className={`h-1.5 w-1.5 rounded-full ${getWaitingSlaColor(room.created_at)}`} />
                        )}
                        {statusIcon(room.status)}
                        {room.status}
                      </Badge>
                    </div>
                  </div>
                  {room.last_message && (
                    <p className={`text-xs text-muted-foreground truncate ${unread > 0 ? "font-medium text-foreground" : ""}`}>
                      {room.last_message_sender_type && room.last_message_sender_type !== "visitor"
                        ? "Você: "
                        : ""}
                      {room.last_message.slice(0, 60)}{room.last_message.length > 60 ? "..." : ""}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      {room.last_message_at ? timeAgo(room.last_message_at) : timeAgo(room.created_at)}
                    </p>
                    {room.status === "active" && room.started_at && (
                      <p className="text-[10px] text-muted-foreground">
                        ⏱ {durationLabel(room.started_at)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
