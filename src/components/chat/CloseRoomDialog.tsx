import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle, Archive } from "lucide-react";
import { ChatTagSelector } from "@/components/chat/ChatTagSelector";

interface CloseRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resolutionStatus: "resolved" | "pending" | "archived", note?: string) => void;
  roomId?: string | null;
}

export function CloseRoomDialog({ open, onOpenChange, onConfirm, roomId }: CloseRoomDialogProps) {
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [showResolvedForm, setShowResolvedForm] = useState(false);

  const handleConfirm = async (status: "resolved" | "pending" | "archived") => {
    setClosing(true);
    await onConfirm(status, status === "resolved" ? (note.trim() || undefined) : undefined);
    setNote("");
    setShowResolvedForm(false);
    setClosing(false);
    onOpenChange(false);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setShowResolvedForm(false);
      setNote("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como encerrar esta conversa?</DialogTitle>
          <DialogDescription>
            Selecione o status de resolução.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showResolvedForm ? (
            <div className="flex flex-col gap-3">
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white justify-start h-12"
                onClick={() => setShowResolvedForm(true)}
                disabled={closing}
              >
                <CheckCircle2 className="h-4 w-4" />
                <div className="text-left">
                  <span className="font-medium">Resolvido</span>
                  <p className="text-[11px] opacity-80 font-normal">Adicionar nota e tags</p>
                </div>
              </Button>
              <Button
                className="w-full gap-2 bg-yellow-500 hover:bg-yellow-600 text-white justify-start h-12"
                onClick={() => handleConfirm("pending")}
                disabled={closing}
              >
                <AlertTriangle className="h-4 w-4" />
                <div className="text-left">
                  <span className="font-medium">Com pendência</span>
                  <p className="text-[11px] opacity-80 font-normal">Encerra sem nota</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 justify-start h-12"
                onClick={() => handleConfirm("archived")}
                disabled={closing}
              >
                <Archive className="h-4 w-4" />
                <div className="text-left">
                  <span className="font-medium">Arquivar</span>
                  <p className="text-[11px] text-muted-foreground font-normal">Encerra sem nota</p>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <Textarea
                placeholder="Observação de encerramento (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="resize-none"
                autoFocus
              />

              {roomId && <ChatTagSelector roomId={roomId} compact />}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowResolvedForm(false)}
                  disabled={closing}
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleConfirm("resolved")}
                  disabled={closing}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
