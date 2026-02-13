const Bar = ({ h, delay }: { h: string; delay: string }) => (
  <div
    className="w-3 rounded-t bg-primary/70 animate-fade-in-up"
    style={{ height: h, animationDelay: delay }}
  />
);

const KpiCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-background p-2">
    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

const DashboardMockup = () => (
  <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-fade-in-up animate-float delay-400">
    {/* Browser bar */}
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/60">
      <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
      <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
      <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
      <span className="ml-2 text-[10px] text-muted-foreground">app.journeycs.io</span>
    </div>

    <div className="flex">
      {/* Mini sidebar */}
      <div className="hidden sm:flex flex-col gap-2 w-16 border-r border-border bg-muted/30 p-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-2 rounded-full ${i === 1 ? "bg-primary/50 w-full" : "bg-border w-3/4"}`} />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 p-3 space-y-3">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2">
          <KpiCard label="NPS" value="72" />
          <KpiCard label="Clientes" value="148" />
          <KpiCard label="CSAT" value="4.6" />
        </div>

        {/* Mini chart */}
        <div className="rounded-md border border-border bg-background p-2">
          <p className="text-[9px] text-muted-foreground mb-2">Respostas / mês</p>
          <div className="flex items-end gap-1 h-12">
            <Bar h="40%" delay="500ms" />
            <Bar h="65%" delay="550ms" />
            <Bar h="50%" delay="600ms" />
            <Bar h="80%" delay="650ms" />
            <Bar h="70%" delay="700ms" />
            <Bar h="90%" delay="750ms" />
            <Bar h="60%" delay="800ms" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default DashboardMockup;
