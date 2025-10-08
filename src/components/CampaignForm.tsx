import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock } from "lucide-react";
import { calculateNextSendDates, formatDate, fromBrazilTime } from "@/utils/campaignUtils";

interface CampaignFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CampaignForm = ({ onSuccess, onCancel }: CampaignFormProps) => {
  const [campaignType, setCampaignType] = useState<'manual' | 'automatic'>('manual');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [cycleType, setCycleType] = useState<'weekly' | 'biweekly'>('weekly');
  const [attemptsTotal, setAttemptsTotal] = useState(3);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const getNextSendDates = () => {
    if (campaignType === 'manual' || !startDate || !startTime) return [];
    
    const dateTime = new Date(`${startDate}T${startTime}`);
    return calculateNextSendDates(dateTime, cycleType, attemptsTotal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const campaignData: any = {
        user_id: user.id,
        name,
        message,
        campaign_type: campaignType,
        status: 'draft',
      };

      if (campaignType === 'automatic') {
        if (!startDate || !startTime) {
          throw new Error("Data e hora de início são obrigatórias para campanhas automáticas");
        }

        // Treat the input as Brazil time and convert to UTC
        const dateTime = new Date(`${startDate}T${startTime}`);
        const utcDateTime = fromBrazilTime(dateTime);
        
        campaignData.start_date = utcDateTime.toISOString();
        campaignData.cycle_type = cycleType;
        campaignData.attempts_total = attemptsTotal;
        campaignData.attempt_current = 0;
        campaignData.next_send = utcDateTime.toISOString();
        campaignData.status = 'scheduled';
      }

      const { error } = await supabase.from("campaigns").insert(campaignData);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Campanha ${campaignType === 'automatic' ? 'agendada' : 'criada'} com sucesso.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const nextDates = getNextSendDates();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Nome da Campanha</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Pesquisa Q1 2024"
            required
          />
        </div>

        <div>
          <Label>Mensagem</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Como você avaliaria nosso serviço?"
            rows={4}
            required
          />
        </div>

        <div>
          <Label>Tipo de Campanha</Label>
          <RadioGroup value={campaignType} onValueChange={(v) => setCampaignType(v as 'manual' | 'automatic')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="font-normal cursor-pointer">
                Manual - Envio sob demanda
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="automatic" id="automatic" />
              <Label htmlFor="automatic" className="font-normal cursor-pointer">
                Automática - Agendamento com ciclos
              </Label>
            </div>
          </RadioGroup>
        </div>

        {campaignType === 'automatic' && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data do Primeiro Envio
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hora do Envio
                </Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Ciclo de Envio</Label>
              <Select value={cycleType} onValueChange={(v) => setCycleType(v as 'weekly' | 'biweekly')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal (a cada 7 dias)</SelectItem>
                  <SelectItem value="biweekly">Quinzenal (a cada 15 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Número de Tentativas</Label>
              <Select value={attemptsTotal.toString()} onValueChange={(v) => setAttemptsTotal(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'tentativa' : 'tentativas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {nextDates.length > 0 && (
              <div className="mt-4 p-3 bg-background rounded border">
                <p className="text-sm font-medium mb-2">Previsão dos Próximos Envios:</p>
                <ul className="space-y-1">
                  {nextDates.map((date, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {index + 1}ª tentativa: {formatDate(date)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Salvando..." : campaignType === 'automatic' ? "Agendar Campanha" : "Criar Campanha"}
        </Button>
      </div>
    </form>
  );
};
