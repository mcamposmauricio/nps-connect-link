import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardMockup from "@/components/DashboardMockup";
import {
  Zap,
  MessageSquare,
  Target,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  company: z.string().trim().min(2, "Nome da empresa muito curto").max(100),
});

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [tracking, setTracking] = useState({
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    referrer: "",
    landing_page: "",
    user_agent: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTracking({
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      utm_term: params.get("utm_term") || "",
      referrer: document.referrer || "",
      landing_page: window.location.pathname + window.location.search,
      user_agent: navigator.userAgent || "",
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: result.data.name,
        email: result.data.email,
        company: result.data.company,
        phone: null,
        role: null,
        ...tracking,
      });
      if (error) throw error;

      setSubmitted(true);
      setForm({ name: "", email: "", company: "" });
      toast({
        title: t("landing.form.success"),
        description: t("landing.form.successDesc"),
      });
    } catch {
      toast({
        title: t("auth.error"),
        description: "Erro ao enviar formulário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <Zap className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">Journey CS</span>
          </div>
          <Button
            onClick={() => navigate(isLoggedIn ? "/cs-dashboard" : "/auth")}
            variant={isLoggedIn ? "default" : "outline"}
          >
            {isLoggedIn ? t("landing.nav.goToDashboard") : t("landing.nav.login")}
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 relative overflow-hidden flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: messaging + form */}
            <div className="space-y-6">
              <Badge variant="secondary" className="text-sm px-3 py-1 animate-fade-in-up delay-0">
                {t("landing.hero.badge")}
              </Badge>

              <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight animate-fade-in-up delay-100">
                {t("landing.hero.title")}
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg animate-fade-in-up delay-200">
                {t("landing.hero.subtitle")}
              </p>

              {/* Coming soon badges */}
              <div className="flex flex-wrap gap-3 pt-2 animate-fade-in-up delay-300">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">NPS</span>
                  <Badge variant="outline" className="text-xs ml-1 animate-pulse-soft">
                    {t("landing.comingSoon")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Chat in-app</span>
                  <Badge variant="outline" className="text-xs ml-1 animate-pulse-soft">
                    {t("landing.comingSoon")}
                  </Badge>
                </div>
              </div>

              {/* Form */}
              <Card className="p-6 shadow-lg border-border/50 animate-fade-in-up delay-500">
                {submitted ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t("landing.form.success")}</h3>
                    <p className="text-muted-foreground text-sm">{t("landing.form.successDesc")}</p>
                    <Button variant="outline" className="mt-4" onClick={() => setSubmitted(false)}>
                      {t("landing.form.submit")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-semibold">{t("landing.form.title")}</h3>
                    <div>
                      <Input
                        placeholder={t("landing.form.name")}
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                      />
                      {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder={t("landing.form.email")}
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                      />
                      {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Input
                        placeholder={t("landing.form.company")}
                        value={form.company}
                        onChange={(e) => handleChange("company", e.target.value)}
                        required
                      />
                      {errors.company && <p className="text-destructive text-xs mt-1">{errors.company}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("landing.form.submitting")}
                        </>
                      ) : (
                        <>
                          {t("landing.form.submit")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </Card>
            </div>

            {/* Right: Dashboard mockup */}
            <div className="hidden lg:block">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Journey CS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Journey CS. {t("landing.footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
