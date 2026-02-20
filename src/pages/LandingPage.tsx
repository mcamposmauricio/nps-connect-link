import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LandingTimeline from "@/components/landing/LandingTimeline";
import { LandingFeatureRows } from "@/components/landing/LandingFeatures";
import LandingKanban from "@/components/landing/LandingKanban";
import { ArrowRight, CheckCircle2, Loader2, MessageSquare, Target, MessageCircle, BarChart3 } from "lucide-react";
import { z } from "zod";

/* ─── Language system ─────────────────────────────────────── */

type Lang = "en" | "pt-BR";

const initLang = (): Lang => {
  const saved = localStorage.getItem("landing_lang");
  if (saved === "en" || saved === "pt-BR") return saved;
  return navigator.language.startsWith("pt") ? "pt-BR" : "en";
};

const texts = {
  en: {
    navSignIn: "Sign In",
    navDashboard: "Go to Dashboard",
    navCta: "Get Started Now!",
    heroBadge: "Early Access · Limited Spots",
    heroH1a: "Experience as fuel for",
    heroH1b: "recurring revenue",
    heroSub:
      "The CX platform that organizes journey insights and empowers your team to ensure your customer's success!",
    heroCta: "Get Started Now!",
    heroSubCta: "Launching soon. Early access is limited.",
    featuresLabel: "Core Modules",
    featuresH2a: "Everything your CS team needs.",
    featuresH2b: "In one unified platform.",
    featuresSub:
      "From real-time conversations to automated NPS and executive dashboards — Journey unifies your customer intelligence.",
    feature1Title: "In-Product Conversations",
    feature1Desc:
      "Engage customers directly inside your product. Resolve friction faster and create retention opportunities in real time.",
    feature2Title: "NPS Connected to Revenue",
    feature2Desc:
      "Automated NPS flows connected to health score and churn prediction. Turn feedback into action.",
    feature3Title: "Revenue & Health Signals",
    feature3Desc:
      "Churn, MRR impact, CSAT and engagement in one executive view. No more scattered dashboards.",
    timelineLabel: "CRM + Timeline",
    timelineH2: "Track every interaction.\nEvery signal.\nEvery opportunity.",
    timelineSub:
      "From first onboarding to renewal — every touchpoint, health change, and revenue signal captured in one unified timeline.",
    kanbanLabel: "Customer Journey",
    kanbanH2: "Visualize every customer journey stage.",
    kanbanSub: "Move accounts based on signals — not assumptions.",
    formLabel: "Early Access",
    formH2: "Be the First to Access Journey",
    formSub:
      "We are onboarding a limited group of CS and Revenue teams who want to build predictable growth from customer data.",
    fieldName: "Full Name *",
    fieldEmail: "Work Email *",
    fieldCompany: "Company Name *",
    fieldRole: "Role / Position",
    formCta: "Join Early Access",
    formFootnote:
      "Selected early users will have direct access to the founding team and influence the product roadmap.",
    successTitle: "You're on the list!",
    successSub: "We'll reach out soon with your early access invite.",
    successBtn: "Submit another",
    quote: '"Customer Experience is a Signal.',
    quoteSpan: 'Revenue is the Outcome."',
    footerTagline: "Infrastructure for Revenue-Driven CS Teams",
    footerRights: "All rights reserved.",
    langToggle: "PT",
  },
  "pt-BR": {
    navSignIn: "Entrar",
    navDashboard: "Ir ao Dashboard",
    navCta: "Clique e Conheça!",
    heroBadge: "Acesso Antecipado · Vagas Limitadas",
    heroH1a: "Experiência como combustível para",
    heroH1b: "receita recorrente",
    heroSub:
      "A plataforma de CX que organiza insights de jornada e suporta o seu time a garantir o sucesso do seu cliente!",
    heroCta: "Clique e Conheça!",
    heroSubCta: "Em breve. Vagas de acesso antecipado limitadas.",
    featuresLabel: "Módulos Principais",
    featuresH2a: "Tudo que seu time de CS precisa.",
    featuresH2b: "Em uma plataforma unificada.",
    featuresSub:
      "De conversas em tempo real a NPS automatizado e dashboards executivos — o Journey unifica sua inteligência de clientes.",
    feature1Title: "Conversas no Produto",
    feature1Desc:
      "Engaje clientes diretamente dentro do seu produto. Resolva fricções mais rápido e crie oportunidades de retenção em tempo real.",
    feature2Title: "NPS Conectado à Receita",
    feature2Desc:
      "Fluxos de NPS automatizados conectados ao health score e previsão de churn. Transforme feedback em ação.",
    feature3Title: "Sinais de Receita e Health",
    feature3Desc:
      "Churn, impacto no MRR, CSAT e engajamento em uma visão executiva. Sem mais dashboards espalhados.",
    timelineLabel: "CRM + Timeline",
    timelineH2: "Rastreie cada interação.\nCada sinal.\nCada oportunidade.",
    timelineSub:
      "Do primeiro onboarding à renovação — cada touchpoint, mudança de health e sinal de receita capturado em uma timeline unificada.",
    kanbanLabel: "Jornada do Cliente",
    kanbanH2: "Visualize cada etapa da jornada do cliente.",
    kanbanSub: "Mova contas com base em sinais — não em suposições.",
    formLabel: "Acesso Antecipado",
    formH2: "Seja um dos Primeiros a Usar o Journey",
    formSub:
      "Estamos abrindo para um grupo limitado de times de CS e Receita que querem construir crescimento previsível a partir de dados de clientes.",
    fieldName: "Nome Completo *",
    fieldEmail: "Email Corporativo *",
    fieldCompany: "Nome da Empresa *",
    fieldRole: "Cargo / Função",
    formCta: "Entrar para o Acesso Antecipado",
    formFootnote:
      "Usuários selecionados terão acesso direto ao time fundador e influência no roadmap do produto.",
    successTitle: "Você está na lista!",
    successSub: "Entraremos em contato em breve com seu convite de acesso antecipado.",
    successBtn: "Enviar outro",
    quote: '"Experiência do Cliente é um Sinal.',
    quoteSpan: 'Receita é o Resultado."',
    footerTagline: "Infraestrutura para times de CS orientados a Receita",
    footerRights: "Todos os direitos reservados.",
    langToggle: "EN",
  },
};

const leadSchema = z.object({
  name: z.string().trim().min(2, "Name too short").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  company: z.string().trim().min(2, "Company name too short").max(100),
  role: z.string().trim().max(100).optional(),
});

/* ─── Reusable primitives ─────────────────────────────────── */

const LandingInput = ({
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors duration-150"
    style={{
      background: "#1A1F2E",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#F2F4F8",
    }}
    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,89,0.4)")}
    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
  />
);

/* ─── Main page ───────────────────────────────────────────── */

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lang, setLang] = useState<Lang>(initLang);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "" });
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

  const t = texts[lang];

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
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "pt-BR" : "en";
    setLang(next);
    localStorage.setItem("landing_lang", next);
  };

  const handleChange = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  const scrollToForm = () => document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = leadSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fe[err.path[0] as string] = err.message;
      });
      setErrors(fe);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: result.data.name,
        email: result.data.email,
        company: result.data.company,
        role: result.data.role || null,
        phone: null,
        ...tracking,
      });
      if (error) throw error;
      setSubmitted(true);
      setForm({ name: "", email: "", company: "", role: "" });
    } catch {
      toast({ title: "Error", description: "Could not submit. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0F1115", fontFamily: "Manrope, sans-serif" }}>
      {/* ── SECTION 1: NAVBAR ─────────────────────────────── */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "rgba(15,17,21,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img src="/logo-dark.svg" alt="Journey" className="h-12 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            {/* Cross-link to Chat LP */}
            <Link
              to="/"
              className="hidden md:inline-flex text-sm transition-colors duration-150"
              style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FF7A59")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
            >
              In-App Chat
            </Link>

            {/* Lang toggle */}
            <button
              onClick={toggleLang}
              className="text-xs font-medium uppercase tracking-widest px-3 h-8 rounded-lg transition-colors duration-150"
              style={{
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              {t.langToggle}
            </button>

            {/* Divider */}
            <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 16 }}>|</span>

            <button
              onClick={() => navigate(isLoggedIn ? "/cs-dashboard" : "/auth")}
              className="text-sm px-4 h-9 rounded-lg transition-colors duration-150"
              style={{
                color: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            >
              {isLoggedIn ? t.navDashboard : t.navSignIn}
            </button>
            <button
              onClick={scrollToForm}
              className="text-sm px-4 h-9 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90"
              style={{ background: "#FF7A59", color: "#fff" }}
            >
              {t.navCta}
            </button>
          </div>
        </div>
      </nav>

      {/* ── SECTION 2: HERO ───────────────────────────────── */}
      <section
        className="relative py-12 px-4 overflow-hidden"
        style={{ minHeight: "72vh", display: "flex", alignItems: "center" }}
      >
        {/* Glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "30%",
            left: "30%",
            transform: "translate(-50%,-50%)",
            width: 600,
            height: 400,
            background: "radial-gradient(ellipse, rgba(255,122,89,0.05) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="flex flex-col items-start text-left">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-widest mb-8 animate-fade-in-up delay-0"
              style={{
                background: "rgba(255,122,89,0.08)",
                border: "1px solid rgba(255,122,89,0.15)",
                color: "rgba(255,122,89,0.8)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {t.heroBadge}
            </div>

            <h1
              className="font-medium text-white mb-6 animate-fade-in-up delay-100"
              style={{ fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 1.18, letterSpacing: "-0.025em" }}
            >
              {t.heroH1a}
              <br />
              <span style={{ color: "rgba(255,122,89,0.85)" }}>{t.heroH1b}</span>
            </h1>

            <p
              className="animate-fade-in-up delay-200 mb-10"
              style={{
                fontSize: "clamp(14px, 1.6vw, 16px)",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.5)",
                maxWidth: 480,
              }}
            >
              {t.heroSub}
            </p>

            <div className="animate-fade-in-up delay-300 flex flex-col items-start gap-3">
              <button
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg font-medium text-base transition-all duration-150 hover:opacity-90 hover:translate-y-[-1px]"
                style={{
                  background: "#FF7A59",
                  color: "#fff",
                  boxShadow: "0 8px 28px rgba(255,122,89,0.22)",
                }}
              >
                {t.heroCta}
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
                {t.heroSubCta}
              </p>
            </div>
          </div>

          {/* Right: 4-Pillar Dashboard Cards */}
          <div
            className="animate-fade-in-up delay-200 rounded-2xl p-5 grid grid-cols-2 gap-3"
            style={{
              background: "#131722",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
            }}
          >
            {[
              { icon: MessageSquare, label: "In-Product Conversations", metric: "142 active", delta: "+12%", color: "#FF7A59" },
              { icon: Target, label: "NPS Connected to Revenue", metric: "NPS 72", delta: "+4pts", color: "#3498DB" },
              { icon: MessageCircle, label: "Revenue Feedback", metric: "1,247 responses", delta: "+8%", color: "#2ECC71" },
              { icon: BarChart3, label: "Revenue & Health Signals", metric: "$142k MRR", delta: "+3.2%", color: "#F5B546" },
            ].map(({ icon: Icon, label, metric, delta, color }) => (
              <div
                key={label}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  background: "#171C28",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}14` }}
                >
                  <Icon style={{ color }} className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium leading-tight mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {label}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-white">{metric}</span>
                    <span className="text-[10px] font-medium" style={{ color: "#2ECC71" }}>{delta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── SECTION 3: FEATURE ROWS ───────────────────────── */}
      <LandingFeatureRows t={t} />

      {/* ── SECTION 4: TIMELINE ───────────────────────────── */}
      <LandingTimeline t={t} />

      {/* ── SECTION 4B: KANBAN ────────────────────────────── */}
      <LandingKanban t={t} />

      {/* ── SECTION 5: EARLY ACCESS FORM ─────────────────── */}
      <section id="early-access" className="py-10 px-4 relative overflow-hidden" style={{ background: "#0F1115" }}>
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 280,
            background: "radial-gradient(ellipse, rgba(61,165,244,0.04) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "#3DA5F4" }}>
              {t.formLabel}
            </p>
            <h2 className="text-[26px] font-medium text-white mb-3" style={{ lineHeight: 1.25, letterSpacing: "-0.02em" }}>
              {t.formH2}
            </h2>
            <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t.formSub}
            </p>
          </div>

          <div
            className="rounded-xl p-8"
            style={{
              background: "#131722",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: "#2ED47A" }} />
                <h3 className="text-xl font-medium text-white mb-2">{t.successTitle}</h3>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {t.successSub}
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-5 text-sm px-4 py-2 rounded-lg transition-colors duration-150"
                  style={{ color: "#FF7A59", border: "1px solid rgba(255,122,89,0.25)", background: "transparent" }}
                >
                  {t.successBtn}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <LandingInput placeholder={t.fieldName} value={form.name} onChange={(v) => handleChange("name", v)} />
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: "#FF5C5C" }}>
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <LandingInput
                    placeholder={t.fieldEmail}
                    type="email"
                    value={form.email}
                    onChange={(v) => handleChange("email", v)}
                  />
                  {errors.email && (
                    <p className="text-xs mt-1" style={{ color: "#FF5C5C" }}>
                      {errors.email}
                    </p>
                  )}
                </div>
                <div>
                  <LandingInput
                    placeholder={t.fieldCompany}
                    value={form.company}
                    onChange={(v) => handleChange("company", v)}
                  />
                  {errors.company && (
                    <p className="text-xs mt-1" style={{ color: "#FF5C5C" }}>
                      {errors.company}
                    </p>
                  )}
                </div>
                <div>
                  <LandingInput
                    placeholder={t.fieldRole}
                    value={form.role}
                    onChange={(v) => handleChange("role", v)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-lg font-medium text-sm mt-1 transition-all duration-150 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#FF7A59", color: "#fff" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" /> {t.formCta}
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {t.formFootnote}
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="py-7 px-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "#0F1115" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-dark.svg" alt="Journey" className="h-10 w-auto" />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
              {t.footerTagline}
            </span>
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
            © {new Date().getFullYear()} Journey. {t.footerRights}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
