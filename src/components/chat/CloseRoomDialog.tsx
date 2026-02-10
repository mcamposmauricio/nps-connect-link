import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface CloseRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resolutionStatus: "resolved" | "pending", note?: string) => void;
}

export function CloseRoomDialog({ open, onOpenChange, onConfirm }: CloseRoomDialogProps) {
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);

  const handleConfirm = async (status: "resolved" | "pending") => {
    setClosing(true);
    await onConfirm(status, note.trim() || undefined);
    setNote("");
    setClosing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como encerrar esta conversa?</DialogTitle>
          <DialogDescription>
            Selecione o status de resolução antes de fechar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Observação de encerramento (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="resize-none"
          />

          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleConfirm("resolved")}
              disabled={closing}
            >
              <CheckCircle2 className="h-4 w-4" />
              Resolvido
            </Button>
            <Button
              className="flex-1 gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={() => handleConfirm("pending")}
              disabled={closing}
            >
              <AlertTriangle className="h-4 w-4" />
              Com pendência
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
