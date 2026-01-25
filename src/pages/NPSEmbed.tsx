import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, X, Loader2 } from "lucide-react";

interface BrandSettings {
  company_name: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface PendingData {
  has_pending: boolean;
  campaign_id?: string;
  token?: string;
  contact_name?: string;
  message?: string;
  brand_settings?: BrandSettings | null;
  reason?: string;
}

const NPSEmbed = () => {
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get("api_key");
  const externalId = searchParams.get("external_id");

  const [loading, setLoading] = useState(true);
  const [pendingData, setPendingData] = useState<PendingData | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey && externalId) {
      checkPendingNPS();
    } else {
      setLoading(false);
      setError("Missing api_key or external_id");
    }
  }, [apiKey, externalId]);

  const checkPendingNPS = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-nps-pending", {
        body: { api_key: apiKey, external_id: externalId }
      });

      if (error) throw error;
      setPendingData(data);
    } catch (err: any) {
      console.error("Error checking NPS:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedScore === null || !pendingData?.token) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-embedded-response", {
        body: {
          api_key: apiKey,
          token: pendingData.token,
          score: selectedScore,
          comment: comment.trim() || null
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setSubmitted(true);

      // Notify parent window
      window.parent?.postMessage({ type: "nps-complete", score: selectedScore }, "*");
    } catch (err: any) {
      console.error("Error submitting response:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    window.parent?.postMessage({ type: "nps-dismiss" }, "*");
  };

  const getScoreColor = (score: number) => {
    if (score <= 6) return "bg-red-500 hover:bg-red-600";
    if (score <= 8) return "bg-yellow-500 hover:bg-yellow-600";
    return "bg-green-500 hover:bg-green-600";
  };

  const getScoreLabel = (score: number) => {
    if (score <= 6) return "Detrator";
    if (score <= 8) return "Neutro";
    return "Promotor";
  };

  // Apply brand colors
  const brandColors = pendingData?.brand_settings;
  const primaryColor = brandColors?.primary_color || "#8B5CF6";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (dismissed || !pendingData?.has_pending) {
    return null;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="text-center text-muted-foreground">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Obrigado!</h2>
          <p className="text-muted-foreground">
            Sua avaliação foi registrada com sucesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div 
          className="p-4 text-white flex items-center justify-between"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3">
            {brandColors?.logo_url && (
              <img 
                src={brandColors.logo_url} 
                alt="Logo" 
                className="h-8 w-8 object-contain rounded"
              />
            )}
            <span className="font-semibold">
              {brandColors?.company_name || brandColors?.brand_name || "Pesquisa NPS"}
            </span>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {pendingData.contact_name && (
            <p className="text-sm text-muted-foreground mb-2">
              Olá, {pendingData.contact_name.split(" ")[0]}!
            </p>
          )}
          
          <h3 className="text-lg font-medium mb-4">
            {pendingData.message || "Em uma escala de 0 a 10, o quanto você recomendaria nossa empresa?"}
          </h3>

          {/* Score buttons */}
          <div className="grid grid-cols-11 gap-1 mb-4">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                onClick={() => setSelectedScore(score)}
                className={`
                  h-10 rounded-lg font-medium text-sm transition-all
                  ${selectedScore === score 
                    ? `${getScoreColor(score)} text-white scale-110 shadow-lg` 
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }
                `}
              >
                {score}
              </button>
            ))}
          </div>

          <div className="flex justify-between text-xs text-muted-foreground mb-4">
            <span>Nada provável</span>
            <span>Muito provável</span>
          </div>

          {selectedScore !== null && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="text-center">
                <span 
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${getScoreColor(selectedScore)}`}
                >
                  {getScoreLabel(selectedScore)}
                </span>
              </div>

              <Textarea
                placeholder="Conte-nos mais sobre sua experiência (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />

              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Avaliação"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NPSEmbed;
