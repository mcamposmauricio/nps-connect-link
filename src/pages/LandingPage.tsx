import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingTimeline from "@/components/landing/LandingTimeline";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";

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
      background: "#1E2433",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#F2F4F8",
    }}
    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,89,0.5)")}
    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
  />
);

/* ─── Main page ───────────────────────────────────────────── */

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
          background: "rgba(15,17,21,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img src="/logo-dark.svg" alt="Journey" className="h-12 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(isLoggedIn ? "/cs-dashboard" : "/auth")}
              className="text-sm px-4 h-9 rounded-lg transition-colors duration-150"
              style={{
                color: "rgba(255,255,255,0.65)",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
            >
              {isLoggedIn ? "Go to Dashboard" : "Sign In"}
            </button>
            <button
              onClick={scrollToForm}
              className="text-sm px-4 h-9 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90"
              style={{ background: "#FF7A59", color: "#fff" }}
            >
              Request Early Access
            </button>
          </div>
        </div>
      </nav>

      {/* ── SECTION 2: HERO ───────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center text-center py-20 px-4 overflow-hidden"
        style={{ minHeight: "72vh" }}
      >
        {/* Glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "20%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 600,
            height: 400,
            background: "radial-gradient(ellipse, rgba(255,122,89,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-widest mb-8 animate-fade-in-up delay-0"
            style={{
              background: "rgba(255,122,89,0.1)",
              border: "1px solid rgba(255,122,89,0.2)",
              color: "rgba(255,122,89,0.85)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Early Access · Limited Spots
          </div>

          <h1
            className="font-medium text-white mb-6 animate-fade-in-up delay-100"
            style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.15, letterSpacing: "-0.02em" }}
          >
            Turn Customer Success into
            <br />
            <span style={{ color: "rgba(255,122,89,0.8)" }}>Predictable Revenue.</span>
          </h1>

          <p
            className="animate-fade-in-up delay-200"
            style={{
              fontSize: "clamp(15px, 2vw, 18px)",
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.55)",
              maxWidth: 560,
              margin: "0 auto 40px",
            }}
          >
            Monitor churn in real time. Automate NPS. Track customer health. Engage customers in-product. Manage
            journeys and revenue signals in one unified platform.
          </p>

          <div className="animate-fade-in-up delay-300 flex flex-col items-center gap-3">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium text-base transition-all duration-150 hover:opacity-90 hover:translate-y-[-1px]"
              style={{
                background: "#FF7A59",
                color: "#fff",
                boxShadow: "0 8px 32px rgba(255,122,89,0.25)",
              }}
            >
              Request Early Access
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Launching soon. Early access is limited.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: CORE MODULES ───────────────────────── */}
      <LandingFeatures />

      {/* ── SECTION 4: TIMELINE ───────────────────────────── */}
      <LandingTimeline />

      {/* ── SECTION 5: EARLY ACCESS FORM ─────────────────── */}
      <section id="early-access" className="py-14 px-4 relative overflow-hidden" style={{ background: "#0F1115" }}>
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 300,
            background: "radial-gradient(ellipse, rgba(61,165,244,0.05) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "#3DA5F4" }}>
              Early Access
            </p>
            <h2 className="text-[28px] font-medium text-white mb-3" style={{ lineHeight: 1.25 }}>
              Be the First to Access Journey
            </h2>
            <p className="text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
              We are onboarding a limited group of CS and Revenue teams who want to build predictable growth from
              customer data.
            </p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{
              background: "#171C28",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            }}
          >
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: "#2ED47A" }} />
                <h3 className="text-xl font-medium text-white mb-2">You're on the list!</h3>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  We'll reach out soon with your early access invite.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-5 text-sm px-4 py-2 rounded-lg transition-colors duration-150"
                  style={{ color: "#FF7A59", border: "1px solid rgba(255,122,89,0.3)", background: "transparent" }}
                >
                  Submit another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <LandingInput placeholder="Full Name *" value={form.name} onChange={(v) => handleChange("name", v)} />
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: "#FF5C5C" }}>
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <LandingInput
                    placeholder="Work Email *"
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
                    placeholder="Company Name *"
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
                    placeholder="Role / Position"
                    value={form.role}
                    onChange={(v) => handleChange("role", v)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-medium text-sm mt-1 transition-all duration-150 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#FF7A59", color: "#fff" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" /> Join Early Access
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Selected early users will have direct access to the founding team and influence the product roadmap.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: FINAL CTA ─────────────────────────── */}
      <section
        className="py-14 px-4 text-center"
        style={{
          background: "linear-gradient(135deg, #131722 0%, #0F1115 50%, #131722 100%)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <p className="font-medium text-white mb-6" style={{ fontSize: "clamp(20px, 3vw, 30px)", lineHeight: 1.4 }}>
            "Customer Experience is a Signal.
            <br />
            <span style={{ color: "rgba(255,122,89,0.75)" }}>Revenue is the Outcome."</span>
          </p>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium text-sm transition-all duration-150 hover:opacity-90"
            style={{ background: "#FF7A59", color: "#fff" }}
          >
            Request Early Access
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="py-10 px-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "#0F1115" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-dark.svg" alt="Journey" className="h-10 w-auto" />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Infrastructure for Revenue-Driven CS Teams
            </span>
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            © {new Date().getFullYear()} Journey. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
