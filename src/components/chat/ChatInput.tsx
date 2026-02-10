import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Eye, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatInputProps {
  onSend: (content: string, isInternal?: boolean) => Promise<void>;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 4 * 24; // ~4 lines
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!value.trim() || sending) return;
    setSending(true);
    await onSend(value, isInternal);
    setValue("");
    setSending(false);
    // Refocus after send
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter to send, Shift+Enter for newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Ctrl/Cmd+Shift+I to toggle internal note
    if (e.key === "i" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setIsInternal((prev) => !prev);
    }
  };

  return (
    <div className="border-t p-3 space-y-2">
      {isInternal && (
        <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {t("chat.workspace.internal_note")}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <Button
          size="icon"
          variant={isInternal ? "default" : "ghost"}
          className="shrink-0 h-9 w-9"
          onClick={() => setIsInternal(!isInternal)}
          title={`${t("chat.workspace.toggle_internal")} (Ctrl+Shift+I)`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isInternal ? t("chat.workspace.internal_placeholder") : t("chat.workspace.message_placeholder")}
          onKeyDown={handleKeyDown}
          disabled={sending}
          rows={1}
          className="min-h-[36px] max-h-[96px] resize-none py-2"
        />
        <Button
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={handleSend}
          disabled={!value.trim() || sending}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
