import { MessageSquare, Target, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ChatMockupVisible = () => (
  <div className="w-full rounded-lg border border-white/10 bg-white/5 overflow-hidden mt-4">
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/5">
      <div className="w-5 h-5 rounded-full bg-accent/40" />
      <div className="h-2 w-14 rounded bg-white/30" />
    </div>
    <div className="p-3 space-y-2">
      <div className="flex justify-start">
        <div className="rounded-lg rounded-tl-none bg-white/10 px-3 py-1.5 max-w-[75%]">
          <div className="h-1.5 w-24 rounded bg-white/30" />
          <div className="h-1.5 w-16 rounded bg-white/20 mt-1" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="rounded-lg rounded-tr-none bg-accent/25 px-3 py-1.5 max-w-[75%]">
          <div className="h-1.5 w-20 rounded bg-white/30" />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="rounded-lg rounded-tl-none bg-white/10 px-3 py-1.5 max-w-[75%]">
          <div className="h-1.5 w-28 rounded bg-white/30" />
        </div>
      </div>
    </div>
    <div className="px-3 py-2 border-t border-white/10">
      <div className="h-6 rounded-full bg-white/5 border border-white/10" />
    </div>
  </div>
);

const NPSMockupVisible = () => (
  <div className="w-full rounded-lg border border-white/10 bg-white/5 p-4 mt-4 space-y-2">
    <div className="text-3xl font-bold text-accent text-center">72</div>
    <div className="text-[10px] text-white/40 text-center uppercase tracking-wider">NPS Score</div>
    <div className="flex h-2.5 rounded-full overflow-hidden">
      <div className="w-[15%] bg-destructive/40" />
      <div className="w-[20%] bg-warning/40" />
      <div className="w-[65%] bg-accent/40" />
    </div>
    <div className="flex justify-between text-[9px] text-white/30">
      <span>Detratores</span><span>Neutros</span><span>Promotores</span>
    </div>
    <div className="grid grid-cols-3 gap-2 pt-1">
      {[["12%", "text-destructive/60"], ["16%", "text-warning/60"], ["72%", "text-accent/60"]].map(([v, c], i) => (
        <div key={i} className="text-center">
          <div className={`text-sm font-semibold ${c}`}>{v}</div>
        </div>
      ))}
    </div>
  </div>
);

const CSMockupVisible = () => (
  <div className="w-full rounded-lg border border-white/10 bg-white/5 p-3 mt-4 space-y-2.5">
    <div className="grid grid-cols-2 gap-2">
      {[["MRR", "R$ 142k"], ["Churn", "2.1%"], ["Health", "78%"], ["CSAT", "4.6"]].map(([label, val]) => (
        <div key={label} className="rounded-md border border-white/10 bg-white/5 p-2">
          <div className="text-[8px] text-white/30 uppercase">{label}</div>
          <div className="text-xs font-semibold text-white/60">{val}</div>
        </div>
      ))}
    </div>
    <svg viewBox="0 0 200 40" className="w-full h-8">
      <path
        d="M0,35 Q25,30 50,25 T100,15 T150,20 T200,10 V40 H0 Z"
        fill="hsl(160 84% 39% / 0.15)"
        stroke="hsl(160 84% 39% / 0.3)"
        strokeWidth="1"
      />
    </svg>
  </div>
);

const features = [
  {
    key: "chat",
    icon: MessageSquare,
    titleKey: "landing.features.chat.title",
    descKey: "landing.features.chat.desc",
    Mockup: ChatMockupVisible,
  },
  {
    key: "nps",
    icon: Target,
    titleKey: "landing.features.nps.title",
    descKey: "landing.features.nps.desc",
    Mockup: NPSMockupVisible,
  },
  {
    key: "cs",
    icon: BarChart3,
    titleKey: "landing.features.cs.title",
    descKey: "landing.features.cs.desc",
    Mockup: CSMockupVisible,
  },
];

const LandingFeatures = () => {
  const { t } = useLanguage();

  return (
    <section className="relative z-10 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            {t("landing.features.title")}
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto">
            {t("landing.features.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ key, icon: Icon, titleKey, descKey, Mockup }, i) => (
            <div
              key={key}
              className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 animate-fade-in-up delay-${(i + 1) * 100}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-white">{t(titleKey)}</h3>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">{t(descKey)}</p>
              <Mockup />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
