import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Eye, Loader2, Paperclip, X, FileText, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface Macro {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
}

interface ChatInputProps {
  onSend: (
    content: string,
    isInternal?: boolean,
    metadata?: { file_url: string; file_name: string; file_type: string; file_size: number }
  ) => Promise<void>;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch macros on mount
  useEffect(() => {
    supabase
      .from("chat_macros")
      .select("id, title, content, shortcut")
      .then(({ data }) => {
        if (data) setMacros(data as Macro[]);
      });
  }, []);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 4 * 24;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Limite: 10MB");
      return;
    }
    setPendingFile(file);
    if (IMAGE_TYPES.includes(file.type)) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const clearFile = () => {
    setPendingFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async (file: File): Promise<{ file_url: string; file_name: string; file_type: string; file_size: number } | null> => {
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
    if ((!value.trim() && !pendingFile) || sending || uploading) return;
    setSending(true);

    let metadata: { file_url: string; file_name: string; file_type: string; file_size: number } | undefined;

    if (pendingFile) {
      setUploading(true);
      const result = await uploadFile(pendingFile);
      setUploading(false);
      if (!result) {
        setSending(false);
        return;
      }
      metadata = result;
    }

    const content = value.trim() || metadata?.file_name || "";
    await onSend(content, isInternal, metadata);
    setValue("");
    clearFile();
    setSending(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "i" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setIsInternal((prev) => !prev);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    // Open macros dropdown when "/" is typed at start
    if (v === "/" && macros.length > 0) {
      setMacrosOpen(true);
    } else if (!v.startsWith("/")) {
      setMacrosOpen(false);
    }
  };

  const handleSelectMacro = (macro: Macro) => {
    setValue(macro.content);
    setMacrosOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="border-t p-3 space-y-2" onDrop={handleDrop} onDragOver={handleDragOver}>
      {isInternal && (
        <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {t("chat.workspace.internal_note")}
        </div>
      )}

      {pendingFile && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
          {filePreviewUrl ? (
            <img src={filePreviewUrl} alt={pendingFile.name} className="h-12 w-12 rounded object-cover" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{pendingFile.name}</p>
            <p className="text-[10px] text-muted-foreground">{(pendingFile.size / 1024).toFixed(0)} KB</p>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={clearFile}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Macros dropdown */}
      {macrosOpen && macros.length > 0 && (
        <div className="rounded-md border bg-popover shadow-md max-h-48 overflow-auto">
          <Command>
            <CommandInput placeholder="Buscar macro..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty className="text-xs p-2">Nenhuma macro encontrada</CommandEmpty>
              <CommandGroup>
                {macros.map((macro) => (
                  <CommandItem
                    key={macro.id}
                    onSelect={() => handleSelectMacro(macro)}
                    className="text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Zap className="h-3 w-3 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{macro.title}</span>
                        {macro.shortcut && (
                          <span className="ml-1 text-muted-foreground">/{macro.shortcut}</span>
                        )}
                        <p className="text-muted-foreground truncate text-[10px]">{macro.content.slice(0, 60)}</p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
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

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 h-9 w-9"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar arquivo"
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Popover open={false}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 h-9 w-9"
              onClick={() => {
                setValue("/");
                setMacrosOpen(true);
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
              title="Macros (digite /)"
            >
              <Zap className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </Popover>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
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
          disabled={(!value.trim() && !pendingFile) || sending || uploading}
        >
          {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
