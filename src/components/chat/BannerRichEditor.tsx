import { useRef, useEffect, useCallback } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Paintbrush } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BannerRichEditorProps {
  initialHtml?: string;
  textAlign: "left" | "center" | "right";
  onChangeAlign: (align: "left" | "center" | "right") => void;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
}

const TEXT_COLORS = [
  "#FFFFFF", "#000000", "#EF4444", "#F97316", "#EAB308",
  "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
];

const BannerRichEditor = ({
  initialHtml,
  textAlign,
  onChangeAlign,
  onChange,
  placeholder = "Texto do banner...",
}: BannerRichEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      if (initialHtml) {
        editorRef.current.innerHTML = initialHtml;
      }
      initialized.current = true;
    }
  }, [initialHtml]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML, editorRef.current.textContent ?? "");
  }, [onChange]);

  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    handleInput();
  };

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap border rounded-md p-1 bg-muted/30">
        <Toggle
          size="sm"
          className="h-7 w-7 p-0"
          pressed={false}
          onPressedChange={() => execCmd("bold")}
          aria-label="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          className="h-7 w-7 p-0"
          pressed={false}
          onPressedChange={() => execCmd("italic")}
          aria-label="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          className="h-7 w-7 p-0"
          pressed={false}
          onPressedChange={() => execCmd("underline")}
          aria-label="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </Toggle>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md h-7 w-7 text-sm hover:bg-muted"
              aria-label="Text color"
            >
              <Paintbrush className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="bottom" align="start">
            <div className="grid grid-cols-5 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => execCmd("foreColor", color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Alignment */}
        <Toggle
          size="sm"
          className="h-7 w-7 p-0"
          pressed={textAlign === "left"}
          onPressedChange={() => onChangeAlign("left")}
          aria-label="Align left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          className="h-7 w-7 p-0"
          pressed={textAlign === "center"}
          onPressedChange={() => onChangeAlign("center")}
          aria-label="Align center"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          className="h-7 w-7 p-0"
          pressed={textAlign === "right"}
          onPressedChange={() => onChangeAlign("right")}
          aria-label="Align right"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Toggle>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const el = editorRef.current;
            if (!el) return;
            const lines = el.innerHTML.split(/<br\s*\/?>|<\/div>|<\/p>/).filter(Boolean);
            if (lines.length >= 2) {
              e.preventDefault();
            }
          }
        }}
        data-placeholder={placeholder}
        className="min-h-[2.5rem] max-h-[4.5rem] overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
        style={{ textAlign, lineHeight: "1.4" }}
      />
      <p className="text-[10px] text-muted-foreground">Até 2 linhas. Use Enter para quebrar linha.</p>
    </div>
  );
};

export default BannerRichEditor;
