import { useState } from "react";
import { MessageSquare, X, Clock, Users, Loader2 } from "lucide-react";

interface WidgetPreviewProps {
  position: "left" | "right";
  primaryColor: string;
  companyName: string;
  showEmailField?: boolean;
  showPhoneField?: boolean;
  formIntroText?: string;
  showOutsideHoursBanner?: boolean;
  outsideHoursTitle?: string;
  outsideHoursMessage?: string;
  showAllBusyBanner?: boolean;
  allBusyTitle?: string;
  allBusyMessage?: string;
  waitingMessage?: string;
}

type PreviewTab = "form" | "outside_hours" | "all_busy" | "waiting";

const WidgetPreview = ({
  position,
  primaryColor,
  companyName,
  showEmailField = true,
  showPhoneField = true,
  formIntroText = "Preencha seus dados para iniciar o atendimento.",
  showOutsideHoursBanner = true,
  outsideHoursTitle = "Estamos fora do horário de atendimento.",
  outsideHoursMessage = "Sua mensagem ficará registrada e responderemos assim que voltarmos.",
  showAllBusyBanner = true,
  allBusyTitle = "Todos os atendentes estão ocupados no momento.",
  allBusyMessage = "Você está na fila e será atendido em breve. Por favor, aguarde.",
  waitingMessage = "Aguardando atendimento...",
}: WidgetPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("form");

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: "form", label: "Formulário" },
    { id: "outside_hours", label: "Fora do horário" },
    { id: "all_busy", label: "Ocupados" },
    { id: "waiting", label: "Aguardando" },
  ];

  return (
    <div className="space-y-3">
      {/* Preview tab selector */}
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setPreviewTab(tab.id); setIsOpen(true); }}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
              previewTab === tab.id && isOpen
                ? "border-transparent text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            style={previewTab === tab.id && isOpen ? { backgroundColor: primaryColor } : {}}
          >
            {tab.label}
          </button>
        ))}
        {isOpen && (
          <button
            onClick={() => setIsOpen(false)}
            className="text-[10px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Fechar
          </button>
        )}
      </div>

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
              className="p-3 flex items-center gap-2 shrink-0"
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

            {/* Content by tab */}
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* FORM TAB */}
              {previewTab === "form" && (
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
              )}

              {/* OUTSIDE HOURS TAB */}
              {previewTab === "outside_hours" && (
                <div className="flex-1 p-3 flex flex-col items-center justify-center text-center space-y-2">
                  {showOutsideHoursBanner ? (
                    <>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <Clock className="h-4 w-4" style={{ color: primaryColor }} />
                      </div>
                      <p className="text-[10px] font-semibold leading-tight">{outsideHoursTitle}</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">{outsideHoursMessage}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold text-muted-foreground">Banner desativado</p>
                      <p className="text-[9px] text-muted-foreground">O formulário será exibido mesmo fora do horário.</p>
                    </>
                  )}
                </div>
              )}

              {/* ALL BUSY TAB */}
              {previewTab === "all_busy" && (
                <div className="flex-1 p-3 flex flex-col items-center justify-center text-center space-y-2">
                  {showAllBusyBanner ? (
                    <>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <Users className="h-4 w-4" style={{ color: primaryColor }} />
                      </div>
                      <p className="text-[10px] font-semibold leading-tight">{allBusyTitle}</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">{allBusyMessage}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold text-muted-foreground">Banner desativado</p>
                      <p className="text-[9px] text-muted-foreground">O chat permanece disponível mesmo com todos ocupados.</p>
                    </>
                  )}
                </div>
              )}

              {/* WAITING TAB */}
              {previewTab === "waiting" && (
                <div className="flex-1 p-3 flex flex-col items-center justify-center text-center space-y-2">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: primaryColor }} />
                  <p className="text-[10px] text-muted-foreground">{waitingMessage}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetPreview;
