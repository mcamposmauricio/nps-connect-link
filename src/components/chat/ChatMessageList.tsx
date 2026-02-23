import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { FileMessage } from "@/components/chat/FileMessage";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  onReply?: (msg: ChatMessage) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

// Detect URLs and render them as clickable links
function renderTextWithLinks(text: string, isOwn: boolean) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return <span>{text}</span>;

  return (
    <>
      {parts.map((part, i) => {
        if (urlRegex.test(part)) {
          // Reset lastIndex since we reuse the regex
          urlRegex.lastIndex = 0;
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline break-all ${isOwn ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:text-primary/80"}`}
            >
              {part}
            </a>
          );
        }
        urlRegex.lastIndex = 0;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ChatMessageList({ messages, loading, onReply, hasMore, loadingMore, onLoadMore }: ChatMessageListProps) {
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

  let lastDay = "";

  return (
    <div className="space-y-3 p-4">
      {hasMore && onLoadMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs py-1.5 px-4 border rounded-md hover:bg-muted/50 disabled:opacity-50 flex items-center gap-1 text-muted-foreground"
          >
            {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "▲ Carregar anteriores"}
          </button>
        </div>
      )}
      {messages.map((msg) => {
        const isFile = msg.message_type === "file" && msg.metadata?.file_url;
        const isOwn = msg.sender_type !== "visitor";
        const msgDay = msg.created_at.slice(0, 10);
        let showDaySeparator = false;
        if (msgDay !== lastDay) {
          showDaySeparator = true;
          lastDay = msgDay;
        }

        // Check if content has a quoted reply
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

        // For file messages, check if there's actual text content beyond the file name
        const hasTextWithFile = isFile && mainContent.trim() && mainContent.trim() !== msg.metadata?.file_name;

        return (
          <div key={msg.id}>
            {showDaySeparator && (
              <div className="flex items-center justify-center my-4">
                <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {getDayLabel(msg.created_at)}
                </span>
              </div>
            )}
            <div
              className={`flex ${msg.sender_type === "visitor" ? "justify-start" : "justify-end"} group`}
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

                {hasQuote && quoteText && (
                  <div className={`text-[11px] rounded px-2 py-1 mb-1 border-l-2 ${
                    msg.sender_type === "visitor"
                      ? "bg-background/50 border-muted-foreground/30 text-muted-foreground"
                      : "bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground/70"
                  }`}>
                    {quoteText}
                  </div>
                )}

                {isFile ? (
                  <>
                    <FileMessage
                      metadata={msg.metadata as { file_url: string; file_name: string; file_type: string; file_size?: number }}
                      isOwn={isOwn}
                    />
                    {hasTextWithFile && (
                      <p className="whitespace-pre-wrap mt-2">{renderTextWithLinks(hasQuote ? mainContent : mainContent, isOwn)}</p>
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{renderTextWithLinks(hasQuote ? mainContent : msg.content, isOwn)}</p>
                )}

                <p className="text-[10px] opacity-50 mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* Reply button for visitor messages */}
              {msg.sender_type === "visitor" && onReply && !msg.is_internal && (
                <button
                  onClick={() => onReply(msg)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1 text-[10px] text-muted-foreground hover:text-foreground px-1"
                  title="Responder"
                >
                  ↩
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div ref={sentinelRef} />
    </div>
  );
}
