import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LandingBackgroundMockups from "@/components/LandingBackgroundMockups";
import LandingFeatures from "@/components/landing/LandingFeatures";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  company: z.string().trim().min(2, "Nome da empresa muito curto").max(100)
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
    utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "",
    referrer: "", landing_page: "", user_agent: ""
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
      user_agent: navigator.userAgent || ""
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
        name: result.data.name, email: result.data.email, company: result.data.company,
        phone: null, role: null, ...tracking
      });
      if (error) throw error;
      setSubmitted(true);
      setForm({ name: "", email: "", company: "" });
      toast({ title: t("landing.form.success"), description: t("landing.form.successDesc") });
    } catch {
      toast({ title: t("auth.error"), description: "Erro ao enviar formulário. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-hero flex flex-col relative overflow-hidden">
      <LandingBackgroundMockups />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/logo-dark.svg" alt="Journey" className="h-8 w-auto" />
          </div>
          <div className="flex items-stretch gap-2">
            <button
              onClick={() => document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center rounded-md text-white px-4 text-sm font-medium h-9 bg-[#1d8753]">

              {t("landing.nav.earlyAccess")}
            </button>
            <button
              onClick={() => navigate(isLoggedIn ? "/cs-dashboard" : "/auth")}
              className="inline-flex items-center justify-center rounded-md border border-white/20 text-white px-4 text-sm font-medium h-9 bg-[#1e1d87]">

              {isLoggedIn ? t("landing.nav.goToDashboard") : t("landing.nav.login")}
            </button>
          </div>
        </div>
      </nav>

      {/* Features Section */}
      <LandingFeatures />

      {/* Hero centralizado */}
      <section className="relative z-10 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <Badge className="bg-accent/20 text-accent border-accent/30 text-sm px-3 py-1 animate-fade-in-up delay-0">
            {t("landing.hero.badge")}
          </Badge>

          {/* Form */}
          <div id="lead-form" className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl animate-fade-in-up delay-300 text-left">
            {submitted ?
            <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{t("landing.form.success")}</h3>
                <p className="text-white/60 text-sm">{t("landing.form.successDesc")}</p>
                <Button variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10" onClick={() => setSubmitted(false)}>
                  {t("landing.form.submit")}
                </Button>
              </div> :

            <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-semibold text-white">{t("landing.form.title")}</h3>
                <div>
                  <Input
                  placeholder={t("landing.form.name")}
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-accent" />

                  {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Input
                  type="email"
                  placeholder={t("landing.form.email")}
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-accent" />

                  {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Input
                  placeholder={t("landing.form.company")}
                  value={form.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  required
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-accent" />

                  {errors.company && <p className="text-destructive text-xs mt-1">{errors.company}</p>}
                </div>
                <Button type="submit" className="w-full bg-accent text-white hover:bg-accent/90" disabled={loading}>
                  {loading ?
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("landing.form.submitting")}</> :

                <>{t("landing.form.submit")}<ArrowRight className="ml-2 h-4 w-4" /></>
                }
                </Button>
              </form>
            }
          </div>
        </div>
      </section>
    </div>);

};

export default LandingPage;