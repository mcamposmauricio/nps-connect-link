import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BrandSettings {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface NPSWidgetPreviewProps {
  brandSettings: BrandSettings;
}

const NPSWidgetPreview = ({ brandSettings }: NPSWidgetPreviewProps) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(8);
  const [comment, setComment] = useState("");
  const [showSubmitted, setShowSubmitted] = useState(false);
  const { t } = useLanguage();

  const getScoreColor = (score: number) => {
    if (score <= 6) return "bg-red-500";
    if (score <= 8) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getScoreLabel = (score: number) => {
    if (score <= 6) return t("settings.widgetDetractor");
    if (score <= 8) return t("settings.widgetNeutral");
    return t("settings.widgetPromoter");
  };

  const handleSubmitPreview = () => {
    setShowSubmitted(true);
    setTimeout(() => {
      setShowSubmitted(false);
      setSelectedScore(8);
      setComment("");
    }, 2000);
  };

  if (showSubmitted) {
    return (
      <div className="relative bg-muted/50 rounded-lg p-8 min-h-[400px] flex items-end justify-end">
        <div className="absolute bottom-4 right-4 bg-background rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 text-center">
            <div 
              className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
              style={{ backgroundColor: brandSettings.primary_color }}
            >
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-lg font-bold mb-1">{t("settings.widgetThankYou")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("settings.widgetSuccessMessage")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-muted/50 rounded-lg p-8 min-h-[400px] flex items-end justify-end">
      {/* Simulated widget floating in corner */}
      <div className="absolute bottom-4 right-4 bg-background rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        {/* Header */}
        <div 
          className="p-3 text-white flex items-center justify-between"
          style={{ backgroundColor: brandSettings.primary_color }}
        >
          <div className="flex items-center gap-2">
            {brandSettings.logo_url && (
              <img 
                src={brandSettings.logo_url} 
                alt="Logo" 
                className="h-6 w-6 object-contain rounded"
              />
            )}
            <span className="font-medium text-sm">
              {brandSettings.company_name || t("settings.widgetDefaultTitle")}
            </span>
          </div>
          <button className="text-white/80 hover:text-white transition-colors cursor-default">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">
            {t("settings.widgetGreeting")}
          </p>
          
          <h3 className="text-sm font-medium mb-3">
            {t("settings.widgetQuestion")}
          </h3>

          {/* Score buttons */}
          <div className="grid grid-cols-11 gap-0.5 mb-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                onClick={() => setSelectedScore(score)}
                className={`
                  h-7 rounded text-xs font-medium transition-all
                  ${selectedScore === score 
                    ? `${getScoreColor(score)} text-white scale-105 shadow-md` 
                    : "bg-muted hover:bg-muted/80"
                  }
                `}
              >
                {score}
              </button>
            ))}
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
            <span>{t("settings.widgetUnlikely")}</span>
            <span>{t("settings.widgetLikely")}</span>
          </div>

          {selectedScore !== null && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="text-center">
                <span 
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white ${getScoreColor(selectedScore)}`}
                >
                  {getScoreLabel(selectedScore)}
                </span>
              </div>

              <Textarea
                placeholder={t("settings.widgetCommentPlaceholder")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />

              <Button 
                onClick={handleSubmitPreview}
                className="w-full text-sm h-9"
                style={{ backgroundColor: brandSettings.primary_color }}
              >
                {t("settings.widgetSubmit")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Background simulation hint */}
      <div className="absolute top-4 left-4 text-xs text-muted-foreground">
        {t("settings.widgetSimulationHint")}
      </div>
    </div>
  );
};

export default NPSWidgetPreview;
