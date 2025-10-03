import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, CheckCircle } from "lucide-react";

const NPSResponse = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (selectedScore === null) {
      toast({
        title: "Selecione uma nota",
        description: "Por favor, escolha uma nota de 0 a 10.",
        variant: "destructive",
      });
      return;
    }

    if (!token) return;

    setSubmitting(true);

    try {
      const [campaignId, contactId] = token.split("-");

      const { error } = await supabase.from("responses").insert({
        campaign_id: campaignId,
        contact_id: contactId,
        score: selectedScore,
        comment: comment || null,
        token,
      });

      if (error) throw error;

      setSubmitted(true);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar sua resposta.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-accent to-purple-600 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Obrigado!</h1>
          <p className="text-muted-foreground">Sua resposta foi registrada com sucesso.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-accent to-purple-600 p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex items-center justify-center mb-8">
          <BarChart3 className="h-12 w-12 text-primary mr-3" />
          <h1 className="text-3xl font-bold">Pesquisa de Satisfação</h1>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Em uma escala de 0 a 10, qual a probabilidade de você recomendar nossos serviços?
          </h2>

          <div className="grid grid-cols-11 gap-2 mb-2">
            {Array.from({ length: 11 }, (_, i) => i).map((score) => (
              <button
                key={score}
                onClick={() => setSelectedScore(score)}
                className={`aspect-square rounded-lg border-2 font-semibold text-lg transition-all ${
                  selectedScore === score
                    ? score >= 9
                      ? "bg-success text-white border-success shadow-lg scale-110"
                      : score >= 7
                      ? "bg-warning text-white border-warning shadow-lg scale-110"
                      : "bg-destructive text-white border-destructive shadow-lg scale-110"
                    : "border-border hover:border-primary hover:scale-105"
                }`}
              >
                {score}
              </button>
            ))}
          </div>

          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Muito improvável</span>
            <span>Muito provável</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Comentários adicionais (opcional)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte-nos mais sobre sua experiência..."
            rows={4}
          />
        </div>

        <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar Resposta"}
        </Button>
      </Card>
    </div>
  );
};

export default NPSResponse;
