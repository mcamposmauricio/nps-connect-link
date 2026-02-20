import { useState } from "react";
import { MessageSquare, X } from "lucide-react";

interface WidgetPreviewProps {
  position: "left" | "right";
  primaryColor: string;
  companyName: string;
  showEmailField?: boolean;
  showPhoneField?: boolean;
  formIntroText?: string;
}

const WidgetPreview = ({
  position,
  primaryColor,
  companyName,
  showEmailField = true,
  showPhoneField = true,
  formIntroText = "Preencha seus dados para iniciar o atendimento.",
}: WidgetPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full h-[400px] bg-muted/50 rounded-lg border overflow-hidden">
      {/* Mock browser bar */}
      <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
            www.seusite.com.br
          </div>
        </div>
      </div>

      {/* Mock page content */}
      <div className="p-6 space-y-3">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
        <div className="h-20 w-full bg-muted rounded mt-4" />
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>

      {/* Widget FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute bottom-4 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
          style={{
            ...(position === "right" ? { right: "16px" } : { left: "16px" }),
            width: "48px",
            height: "48px",
            backgroundColor: primaryColor,
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {/* Widget Panel */}
      {isOpen && (
        <div
          className="absolute bottom-4 w-[260px] bg-background rounded-xl shadow-2xl border overflow-hidden flex flex-col"
          style={{
            ...(position === "right" ? { right: "16px" } : { left: "16px" }),
            height: "320px",
          }}
        >
          {/* Header */}
          <div
            className="p-3 flex items-center gap-2"
            style={{ backgroundColor: primaryColor, color: "#fff" }}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-semibold flex-1 truncate">{companyName || "Suporte"}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded-full hover:bg-white/20"
              style={{ color: "#fff" }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Mock form */}
          <div className="flex-1 p-3 space-y-2 overflow-hidden">
            <p className="text-[10px] text-muted-foreground">{formIntroText}</p>
            <div className="h-6 w-full bg-muted rounded border text-[9px] px-2 flex items-center text-muted-foreground">
              Nome *
            </div>
            {showEmailField && (
              <div className="h-6 w-full bg-muted rounded border text-[9px] px-2 flex items-center text-muted-foreground">
                Email
              </div>
            )}
            {showPhoneField && (
              <div className="h-6 w-full bg-muted rounded border text-[9px] px-2 flex items-center text-muted-foreground">
                Telefone
              </div>
            )}
            <div
              className="h-7 w-full rounded flex items-center justify-center text-[10px] text-white font-medium mt-1"
              style={{ backgroundColor: primaryColor }}
            >
              Iniciar Conversa
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetPreview;

