import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div>
        <h1 className="text-h1">{title}</h1>
        {subtitle && (
          <p className="text-[15px] text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
