import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

interface PortalCSATFormProps {
  onSubmit: (score: number, comment: string) => Promise<void>;
}

const PortalCSATForm = ({ onSubmit }: PortalCSATFormProps) => {
  const { t } = useLanguage();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    await onSubmit(score, comment);
    setSubmitting(false);
  };

  return (
    <div className="mt-6 space-y-4 border-t pt-4">
      <p className="text-sm font-medium text-center">{t("chat.portal.rate_service")}</p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} onClick={() => setScore(v)} className="focus:outline-none transition-transform hover:scale-110">
            <Star className={`h-8 w-8 ${v <= score ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea
        placeholder={t("chat.portal.rate_comment")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button className="w-full" onClick={handleSubmit} disabled={score === 0 || submitting}>
        {t("chat.portal.submit_rating")}
      </Button>
    </div>
  );
};

export default PortalCSATForm;
