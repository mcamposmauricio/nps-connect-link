import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, CheckCircle } from "lucide-react";

interface BrandSettings {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const NPSResponse = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    company_name: null,
    logo_url: null,
    primary_color: "#8B5CF6",
    secondary_color: "#EC4899",
    accent_color: "#10B981",
  });

  useEffect(() => {
    fetchBrandSettings();
  }, []);

  const fetchBrandSettings = async () => {
    try {
      if (!token) return;
      const [campaignId] = token.split("-");
      
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("user_id")
        .eq("id", campaignId)
        .single();

      if (campaign) {
        const { data: settings } = await supabase
          .from("brand_settings")
          .select("*")
          .eq("user_id", campaign.user_id)
          .maybeSingle();

        if (settings) {
          setBrandSettings(settings);
        }
      }
    } catch (error) {
      console.error("Error fetching brand settings:", error);
    }
  };

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
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: `linear-gradient(135deg, ${brandSettings.primary_color}, ${brandSettings.secondary_color})`
        }}
      >
        <Card className="w-full max-w-md p-8 text-center bg-background/95 backdrop-blur">
          {brandSettings.logo_url && (
            <img
              src={brandSettings.logo_url}
              alt="Logo"
              className="max-h-16 object-contain mx-auto mb-4"
            />
          )}
          <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: brandSettings.accent_color }} />
          <h1 className="text-2xl font-bold mb-2">Obrigado!</h1>
          <p className="text-muted-foreground">Sua resposta foi registrada com sucesso.</p>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${brandSettings.primary_color}, ${brandSettings.secondary_color})`
      }}
    >
      <Card className="w-full max-w-2xl p-8 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-center mb-8">
          {brandSettings.logo_url ? (
            <img
              src={brandSettings.logo_url}
              alt="Logo"
              className="max-h-12 object-contain mr-3"
            />
          ) : (
            <BarChart3 className="h-12 w-12 mr-3" style={{ color: brandSettings.primary_color }} />
          )}
          <h1 className="text-3xl font-bold">
            {brandSettings.company_name || "Pesquisa de Satisfação"}
          </h1>
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
                className="aspect-square rounded-lg border-2 font-semibold text-lg transition-all hover:scale-105"
                style={{
                  borderColor: selectedScore === score ? brandSettings.primary_color : 'hsl(var(--border))',
                  backgroundColor: selectedScore === score 
                    ? (score >= 9 ? brandSettings.accent_color : score >= 7 ? brandSettings.secondary_color : '#ef4444')
                    : 'transparent',
                  color: selectedScore === score ? 'white' : 'inherit',
                  transform: selectedScore === score ? 'scale(1.1)' : 'scale(1)',
                }}
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

        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          disabled={submitting}
          style={{ backgroundColor: brandSettings.primary_color }}
        >
          {submitting ? "Enviando..." : "Enviar Resposta"}
        </Button>
      </Card>
    </div>
  );
};

export default NPSResponse;
