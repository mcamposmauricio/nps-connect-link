import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Zap,
  BarChart3,
  MessageSquare,
  Route,
  Target,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Users,
  Clock,
  TrendingUp,
} from "lucide-react";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  company: z.string().trim().min(2, "Nome da empresa muito curto").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.string().trim().max(100).optional().or(z.literal("")),
});

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", role: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // UTM tracking
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
        phone: result.data.phone || null,
        role: result.data.role || null,
        ...tracking,
      });
      if (error) throw error;

      setSubmitted(true);
      setForm({ name: "", email: "", company: "", phone: "", role: "" });
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

  const scrollToHero = () => {
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    { icon: Target, titleKey: "landing.features.nps.title", descKey: "landing.features.nps.desc" },
    { icon: BarChart3, titleKey: "landing.features.cs.title", descKey: "landing.features.cs.desc" },
    { icon: MessageSquare, titleKey: "landing.features.chat.title", descKey: "landing.features.chat.desc" },
    { icon: Route, titleKey: "landing.features.trails.title", descKey: "landing.features.trails.desc" },
  ];

  const steps = [
    { num: "01", titleKey: "landing.howItWorks.step1.title", descKey: "landing.howItWorks.step1.desc" },
    { num: "02", titleKey: "landing.howItWorks.step2.title", descKey: "landing.howItWorks.step2.desc" },
    { num: "03", titleKey: "landing.howItWorks.step3.title", descKey: "landing.howItWorks.step3.desc" },
  ];

  const LeadForm = ({ id }: { id?: string }) => (
    <Card className="p-6 shadow-lg border-border/50" id={id}>
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
          <div>
            <Input
              placeholder={t("landing.form.phone")}
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>
          <div>
            <Input
              placeholder={t("landing.form.role")}
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
            />
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
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <Zap className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">Journey CS</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">{t("landing.nav.features")}</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">{t("landing.nav.howItWorks")}</a>
            <a href="#contact" className="hover:text-foreground transition-colors">{t("landing.nav.contact")}</a>
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
      <section id="hero" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
                {t("landing.hero.title")}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {t("landing.hero.subtitle")}
              </p>
              <div className="flex items-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>NPS</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>CS</span>
                </div>
              </div>
            </div>
            <LeadForm id="lead-form-hero" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            {t("landing.nav.features")}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {t("landing.hero.subtitle")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <Card key={f.titleKey} className="p-6 text-center hover:shadow-md transition-shadow">
                <f.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{t(f.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(f.descKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            {t("landing.howItWorks.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-2">{t(s.titleKey)}</h3>
                <p className="text-muted-foreground text-sm">{t(s.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <p className="text-3xl font-bold">{t("landing.social.companies")}</p>
            </div>
            <div>
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <p className="text-3xl font-bold">{t("landing.social.uptime")}</p>
            </div>
            <div>
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <p className="text-3xl font-bold">{t("landing.social.surveys")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">{t("landing.cta.title")}</h2>
          <p className="text-muted-foreground mb-8">{t("landing.cta.subtitle")}</p>
          <Button size="lg" onClick={scrollToHero}>
            {t("landing.form.submit")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
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
