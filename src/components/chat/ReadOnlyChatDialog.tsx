import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Eye, MessageSquare } from "lucide-react";
import { useChatMessages } from "@/hooks/useChatRealtime";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReadOnlyChatDialogProps {
  roomId: string | null;
  visitorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReadOnlyChatDialog({ roomId, visitorName, open, onOpenChange }: ReadOnlyChatDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { messages, loading } = useChatMessages(open ? roomId : null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendNote = async () => {
    if (!note.trim() || !roomId || !user) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_type: "attendant",
      sender_id: user.id,
      sender_name: user.email?.split("@")[0] ?? "Atendente",
      content: note,
      is_internal: true,
    });
    setNote("");
    setSending(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {visitorName}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 my-4">
          <ChatMessageList messages={messages} loading={loading} />
        </ScrollArea>

        {/* Internal note only */}
        <div className="border-t pt-3 space-y-2">
          <div className="text-xs text-yellow-600 flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {t("chat.workspace.internal_note")}
          </div>
          <div className="flex gap-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("chat.workspace.internal_placeholder")}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendNote()}
              disabled={sending}
            />
            <Button size="icon" onClick={handleSendNote} disabled={!note.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
