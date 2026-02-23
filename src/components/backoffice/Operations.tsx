import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Play, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";

interface FunctionLog {
  name: string;
  status: "idle" | "running" | "success" | "error";
  result?: string;
  timestamp?: Date;
}

const EDGE_FUNCTIONS = [
  { name: "process-chat-auto-rules", label: "Processar regras automáticas do chat", description: "Executa regras de fechamento e notificação automática" },
  { name: "process-automatic-campaigns", label: "Processar campanhas automáticas", description: "Envia campanhas NPS agendadas" },
  { name: "check-nps-pending", label: "Verificar NPS pendentes", description: "Checa campanhas com envios pendentes" },
  { name: "send-nps-reminder", label: "Enviar lembretes NPS", description: "Reenvia lembretes para quem não respondeu" },
];

export default function Operations() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<FunctionLog[]>(
    EDGE_FUNCTIONS.map(f => ({ name: f.name, status: "idle" }))
  );

  const invokeFunction = async (name: string) => {
    setLogs(prev => prev.map(l => l.name === name ? { ...l, status: "running", result: undefined } : l));

    try {
      const { data, error } = await supabase.functions.invoke(name);

      if (error) throw error;

      setLogs(prev => prev.map(l =>
        l.name === name
          ? { ...l, status: "success", result: JSON.stringify(data, null, 2), timestamp: new Date() }
          : l
      ));
      toast({ title: `${name} executada com sucesso` });
    } catch (err: any) {
      setLogs(prev => prev.map(l =>
        l.name === name
          ? { ...l, status: "error", result: err.message || "Erro desconhecido", timestamp: new Date() }
          : l
      ));
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Executar Edge Functions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {EDGE_FUNCTIONS.map((fn, i) => {
            const log = logs[i];
            return (
              <div key={fn.name} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="font-medium text-sm">{fn.label}</p>
                      <p className="text-xs text-muted-foreground">{fn.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.timestamp && (
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    )}
                    <Badge variant={
                      log.status === "success" ? "default" :
                      log.status === "error" ? "destructive" :
                      "secondary"
                    } className="text-xs">
                      {log.status === "idle" ? "Pronto" :
                       log.status === "running" ? "Executando..." :
                       log.status === "success" ? "Sucesso" : "Erro"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => invokeFunction(fn.name)}
                      disabled={log.status === "running"}
                      className="gap-1"
                    >
                      <Play className="h-3 w-3" />Executar
                    </Button>
                  </div>
                </div>
                {log.result && (
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 whitespace-pre-wrap">
                    {log.result}
                  </pre>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
