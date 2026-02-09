import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatRoom {
  id: string;
  status: string;
  created_at: string;
  visitor_id: string;
  attendant_id: string | null;
}

interface ChatRoomListProps {
  rooms: ChatRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
  loading: boolean;
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
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`w-full text-left p-3 rounded-md transition-colors text-sm ${
                  selectedRoomId === room.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium font-mono text-xs">#{room.id.slice(0, 8)}</span>
                  <Badge variant={statusColor(room.status)} className="text-[10px] gap-1">
                    {statusIcon(room.status)}
                    {room.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(room.created_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
