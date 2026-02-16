const ChatMockup = () => (
  <div
    className="absolute pointer-events-none select-none"
    style={{ top: "10%", right: "-5%", opacity: 0.07, transform: "rotate(-12deg) scale(0.8)" }}
  >
    <div className="w-72 rounded-xl border border-white/20 bg-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/5">
        <div className="w-6 h-6 rounded-full bg-accent/40" />
        <div className="space-y-1">
          <div className="h-2 w-16 rounded bg-white/30" />
          <div className="h-1.5 w-10 rounded bg-white/15" />
        </div>
      </div>
      {/* Messages */}
      <div className="p-3 space-y-2.5">
        <div className="flex justify-start">
          <div className="rounded-lg rounded-tl-none bg-white/10 px-3 py-2 max-w-[70%]">
            <div className="h-2 w-28 rounded bg-white/25" />
            <div className="h-2 w-20 rounded bg-white/15 mt-1.5" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-lg rounded-tr-none bg-accent/20 px-3 py-2 max-w-[70%]">
            <div className="h-2 w-24 rounded bg-white/25" />
          </div>
        </div>
        <div className="flex justify-start">
          <div className="rounded-lg rounded-tl-none bg-white/10 px-3 py-2 max-w-[70%]">
            <div className="h-2 w-32 rounded bg-white/25" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-lg rounded-tr-none bg-accent/20 px-3 py-2 max-w-[70%]">
            <div className="h-2 w-20 rounded bg-white/25" />
            <div className="h-2 w-16 rounded bg-white/15 mt-1.5" />
          </div>
        </div>
      </div>
      {/* Input */}
      <div className="px-3 py-2 border-t border-white/10">
        <div className="h-7 rounded-full bg-white/5 border border-white/10" />
      </div>
    </div>
  </div>
);

const NPSMockup = () => (
  <div
    className="absolute pointer-events-none select-none"
    style={{ bottom: "15%", left: "-3%", opacity: 0.06, transform: "rotate(8deg) scale(0.75)" }}
  >
    <div className="w-64 rounded-xl border border-white/20 bg-white/10 p-4 space-y-3">
      <div className="h-2 w-20 rounded bg-white/25" />
      <div className="text-5xl font-bold text-white/30 text-center">72</div>
      <div className="text-[9px] text-white/20 text-center uppercase tracking-wider">NPS Score</div>
      {/* Scale bar */}
      <div className="flex h-3 rounded-full overflow-hidden">
        <div className="w-[30%] bg-red-400/30" />
        <div className="w-[30%] bg-yellow-400/30" />
        <div className="w-[40%] bg-accent/30" />
      </div>
      <div className="flex justify-between text-[8px] text-white/15">
        <span>0</span><span>6</span><span>8</span><span>10</span>
      </div>
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[["Detratores", "12%"], ["Neutros", "16%"], ["Promotores", "72%"]].map(([l, v]) => (
          <div key={l} className="text-center">
            <div className="text-[7px] text-white/15 uppercase">{l}</div>
            <div className="text-xs font-semibold text-white/25">{v}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CSDashboardMockup = () => (
  <div
    className="absolute pointer-events-none select-none"
    style={{ bottom: "5%", right: "10%", opacity: 0.07, transform: "rotate(-6deg) scale(0.9)" }}
  >
    <div className="w-80 rounded-xl border border-white/20 bg-white/10 p-3 space-y-3">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2">
        {["MRR", "Churn", "Health", "CSAT"].map((label) => (
          <div key={label} className="rounded-md border border-white/10 bg-white/5 p-1.5">
            <div className="text-[7px] text-white/15 uppercase">{label}</div>
            <div className="h-2.5 w-8 rounded bg-white/20 mt-1" />
          </div>
        ))}
      </div>
      {/* Mini area chart */}
      <div className="rounded-md border border-white/10 bg-white/5 p-2">
        <div className="h-1.5 w-16 rounded bg-white/15 mb-2" />
        <svg viewBox="0 0 200 40" className="w-full h-8">
          <path
            d="M0,35 Q25,30 50,25 T100,15 T150,20 T200,10 V40 H0 Z"
            fill="rgba(16,185,129,0.15)"
            stroke="rgba(16,185,129,0.3)"
            strokeWidth="1"
          />
        </svg>
      </div>
      {/* Mini table */}
      <div className="space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/10" />
            <div className="h-2 flex-1 rounded bg-white/10" />
            <div className="h-2 w-8 rounded bg-accent/15" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LandingBackgroundMockups = () => (
  <div className="absolute inset-0 z-0 overflow-hidden">
    <ChatMockup />
    <NPSMockup />
    <CSDashboardMockup />
  </div>
);

export default LandingBackgroundMockups;
