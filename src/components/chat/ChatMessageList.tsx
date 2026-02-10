import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { FileMessage } from "@/components/chat/FileMessage";

interface ChatMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  is_internal: boolean;
  created_at: string;
  message_type?: string | null;
  metadata?: {
    file_url?: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
  } | null;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sentinelRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Nenhuma mensagem ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {messages.map((msg) => {
        const isFile = msg.message_type === "file" && msg.metadata?.file_url;
        const isOwn = msg.sender_type !== "visitor";

        return (
          <div
            key={msg.id}
            className={`flex ${msg.sender_type === "visitor" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                msg.is_internal
                  ? "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700"
                  : msg.sender_type === "visitor"
                  ? "bg-muted"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium opacity-70">
                  {msg.sender_name ?? msg.sender_type}
                </span>
                {msg.is_internal && (
                  <span className="text-[10px] font-medium text-yellow-600 dark:text-yellow-400">
                    (Nota interna)
                  </span>
                )}
              </div>

              {isFile ? (
                <FileMessage
                  metadata={msg.metadata as { file_url: string; file_name: string; file_type: string; file_size?: number }}
                  isOwn={isOwn}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              <p className="text-[10px] opacity-50 mt-1 text-right">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={sentinelRef} />
    </div>
  );
}
