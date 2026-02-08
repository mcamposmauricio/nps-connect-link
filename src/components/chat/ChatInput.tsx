import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Eye } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatInputProps {
  onSend: (content: string, isInternal?: boolean) => Promise<void>;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!value.trim()) return;
    setSending(true);
    await onSend(value, isInternal);
    setValue("");
    setSending(false);
  };

  return (
    <div className="border-t p-3 space-y-2">
      {isInternal && (
        <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {t("chat.workspace.internal_note")}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="icon"
          variant={isInternal ? "default" : "ghost"}
          className="shrink-0"
          onClick={() => setIsInternal(!isInternal)}
          title={t("chat.workspace.toggle_internal")}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isInternal ? t("chat.workspace.internal_placeholder") : t("chat.workspace.message_placeholder")}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={sending}
        />
        <Button size="icon" onClick={handleSend} disabled={!value.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
