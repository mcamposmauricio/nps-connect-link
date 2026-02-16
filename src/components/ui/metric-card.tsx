import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  delta?: number | null;
  deltaInverted?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  delta,
  deltaInverted = false,
  className,
}: MetricCardProps) {
  const isPositive = delta != null && delta > 0;
  const deltaColor = deltaInverted
    ? isPositive ? "text-destructive" : "text-success"
    : isPositive ? "text-success" : "text-destructive";

  return (
    <div className={cn("rounded-lg border bg-card shadow-sm p-5 animate-fade-in", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {delta != null && delta !== 0 && (
              <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", deltaColor)}>
                {isPositive ? "↑" : "↓"} {Math.abs(delta)}%
              </span>
            )}
          </div>
        </div>
        <div className={cn("p-3 rounded-xl", iconBgColor)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}
