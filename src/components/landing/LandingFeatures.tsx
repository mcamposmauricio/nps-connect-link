import { MessageSquare, Target, BarChart3 } from "lucide-react";

const ChatMockup = () => (
  <div className="w-full rounded-xl overflow-hidden mt-5" style={{ background: "#1E2433", border: "1px solid rgba(255,255,255,0.06)" }}>
    {/* Header */}
    <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold" style={{ background: "rgba(255,122,89,0.2)", color: "#FF7A59" }}>J</div>
      <div className="flex-1">
        <div className="h-2 w-16 rounded" style={{ background: "rgba(255,255,255,0.2)" }} />
        <div className="h-1.5 w-10 rounded mt-1" style={{ background: "rgba(255,255,255,0.1)" }} />
      </div>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2ED47A" }} />
    </div>
    {/* Messages */}
    <div className="p-3 space-y-2.5">
      <div className="flex justify-start">
        <div className="rounded-lg rounded-tl-none px-3 py-2 max-w-[78%]" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-1.5 w-28 rounded" style={{ background: "rgba(255,255,255,0.22)" }} />
          <div className="h-1.5 w-20 rounded mt-1.5" style={{ background: "rgba(255,255,255,0.14)" }} />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="rounded-lg rounded-tr-none px-3 py-2 max-w-[78%]" style={{ background: "rgba(255,122,89,0.18)" }}>
          <div className="h-1.5 w-24 rounded" style={{ background: "rgba(255,255,255,0.22)" }} />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="rounded-lg rounded-tl-none px-3 py-2 max-w-[78%]" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-1.5 w-32 rounded" style={{ background: "rgba(255,255,255,0.22)" }} />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="rounded-lg rounded-tr-none px-3 py-2 max-w-[78%]" style={{ background: "rgba(255,122,89,0.18)" }}>
          <div className="h-1.5 w-16 rounded" style={{ background: "rgba(255,255,255,0.22)" }} />
          <div className="h-1.5 w-20 rounded mt-1.5" style={{ background: "rgba(255,255,255,0.14)" }} />
        </div>
      </div>
    </div>
    <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="h-7 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
    </div>
  </div>
);

const NPSMockup = () => (
  <div className="w-full rounded-xl mt-5 p-4 space-y-3" style={{ background: "#1E2433", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>NPS Score</div>
        <div className="text-4xl font-semibold" style={{ color: "#FF7A59" }}>72</div>
      </div>
      <div className="text-right">
        <div className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Responses</div>
        <div className="text-lg font-medium text-white">1,247</div>
      </div>
    </div>
    {/* Score bar */}
    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
      <div className="rounded-l-full" style={{ width: "15%", background: "#FF5C5C88" }} />
      <div style={{ width: "20%", background: "#F5B54688" }} />
      <div className="rounded-r-full" style={{ width: "65%", background: "#2ED47A88" }} />
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        ["Detractors", "15%", "#FF5C5C"],
        ["Passives", "20%", "#F5B546"],
        ["Promoters", "65%", "#2ED47A"],
      ].map(([label, pct, color]) => (
        <div key={label} className="text-center rounded-lg py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="text-sm font-semibold" style={{ color }}>{pct}</div>
          <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</div>
        </div>
      ))}
    </div>
  </div>
);

const DashboardMockup = () => (
  <div className="w-full rounded-xl mt-5 p-3 space-y-3" style={{ background: "#1E2433", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="grid grid-cols-2 gap-2">
      {[
        ["MRR", "$142k", "#3DA5F4"],
        ["Churn", "2.1%", "#FF5C5C"],
        ["Health", "78%", "#2ED47A"],
        ["CSAT", "4.6 / 5", "#F5B546"],
      ].map(([label, val, color]) => (
        <div key={label} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</div>
          <div className="text-sm font-semibold" style={{ color }}>{val}</div>
        </div>
      ))}
    </div>
    <svg viewBox="0 0 200 36" className="w-full h-8">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3DA5F4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3DA5F4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,32 Q30,28 60,22 T120,14 T170,16 T200,8 V36 H0 Z" fill="url(#chartGrad)" />
      <path d="M0,32 Q30,28 60,22 T120,14 T170,16 T200,8" fill="none" stroke="#3DA5F4" strokeWidth="1.5" />
    </svg>
  </div>
);

const features = [
  {
    key: "chat",
    icon: MessageSquare,
    iconColor: "#FF7A59",
    title: "In-Product Conversations",
    desc: "Engage customers directly inside your product. Resolve friction faster and create retention opportunities in real time.",
    Mockup: ChatMockup,
  },
  {
    key: "nps",
    icon: Target,
    iconColor: "#3DA5F4",
    title: "NPS Connected to Revenue",
    desc: "Automated NPS flows connected to health score and churn prediction. Turn feedback into action.",
    Mockup: NPSMockup,
  },
  {
    key: "dashboard",
    icon: BarChart3,
    iconColor: "#2ED47A",
    title: "Revenue & Health Signals",
    desc: "Churn, MRR impact, CSAT and engagement in one executive view. No more scattered dashboards.",
    Mockup: DashboardMockup,
  },
];

const LandingFeatures = () => (
  <section className="py-24" style={{ background: "#0F1115" }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-14 animate-fade-in-up">
        <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "#2ED47A" }}>
          Core Modules
        </p>
        <h2 className="text-[28px] font-medium text-white mb-3" style={{ lineHeight: 1.25 }}>
          Everything your CS team needs.<br />In one unified platform.
        </h2>
        <p className="text-base" style={{ color: "rgba(255,255,255,0.5)", maxWidth: 520, margin: "0 auto" }}>
          From real-time conversations to automated NPS and executive dashboards — Journey unifies your customer intelligence.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {features.map(({ key, icon: Icon, iconColor, title, desc, Mockup }, i) => (
          <div
            key={key}
            className={`rounded-2xl p-6 flex flex-col animate-fade-in-up delay-${(i + 1) * 100}`}
            style={{
              background: "#171C28",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${iconColor}18` }}
              >
                <Icon style={{ color: iconColor }} className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-medium text-white">{title}</h3>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{desc}</p>
            <Mockup />
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default LandingFeatures;
