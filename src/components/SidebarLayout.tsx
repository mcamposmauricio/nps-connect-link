import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarDataProvider } from "@/contexts/SidebarDataContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SidebarLayout() {
  const navigate = useNavigate();
  const { user, loading, userDataLoading, tenantId, isAdmin, isImpersonating, impersonatedTenantName, clearImpersonation, availableTenants, selectTenant, needsTenantSelection } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem("sidebar-open") !== "false"
  );
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("journey-theme") !== "light"
  );

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("journey-theme", next ? "dark" : "light");
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !userDataLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!tenantId && !isAdmin && !needsTenantSelection) {
        navigate("/pending-approval");
      }
    }
  }, [user, loading, userDataLoading, tenantId, isAdmin, navigate, needsTenantSelection]);

  // Polling for time-based auto rules (every 5 min)
  useEffect(() => {
    if (!user) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        await supabase.functions.invoke("process-chat-auto-rules");
      } catch {
        // silent
      }
      if (!cancelled) {
        timeoutId = setTimeout(poll, 300_000);
      }
    };

    timeoutId = setTimeout(poll, 15_000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user]);

  const themeClass = isDark ? "dark" : "";

  if (loading || userDataLoading) {
    return (
      <div className={`${themeClass} min-h-screen flex flex-col items-center justify-center bg-background gap-4`}>
        <img src={isDark ? "/logo-icon-light.svg" : "/logo-icon-dark.svg"} alt="Journey" className="h-16 w-16 animate-pulse" />
      </div>
    );
  }

  // Tenant selection screen
  if (needsTenantSelection) {
    return (
      <div className={`${themeClass} min-h-screen flex items-center justify-center bg-background p-4`}>
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <img src={isDark ? "/logo-light.svg" : "/logo-dark.svg"} alt="Journey" className="h-10 w-auto mx-auto mb-6" />
            <h1 className="text-xl font-semibold text-foreground">Selecione sua plataforma</h1>
            <p className="text-sm text-muted-foreground mt-1">Você tem acesso a múltiplas plataformas</p>
          </div>
          <div className="space-y-3">
            {availableTenants.map(t => (
              <Card
                key={t.tenantId}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => selectTenant(t.tenantId)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t.tenantName}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarDataProvider>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={(open) => {
          setSidebarOpen(open);
          localStorage.setItem("sidebar-open", String(open));
        }}
      >
        <div className={`${themeClass} min-h-screen flex w-full bg-background text-foreground`}>
          <AppSidebar isDark={isDark} onToggleTheme={toggleTheme} />
          <main className="flex-1 flex flex-col">
            {/* Impersonation banner */}
            {isImpersonating && (
              <div className="h-10 bg-amber-500/90 text-amber-950 flex items-center justify-center gap-2 text-sm font-medium px-4 shrink-0">
                <Eye className="h-4 w-4" />
                <span>Visualizando: {impersonatedTenantName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 ml-2 text-amber-950 hover:bg-amber-600/50 hover:text-amber-950"
                  onClick={() => {
                    clearImpersonation();
                    navigate("/backoffice");
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Sair
                </Button>
              </div>
            )}

            {/* Multi-tenant switcher banner */}
            {availableTenants.length > 1 && !isImpersonating && (
              <div className="h-8 bg-muted/50 border-b flex items-center justify-center gap-2 text-xs text-muted-foreground px-4 shrink-0">
                <Building2 className="h-3 w-3" />
                <span>Plataforma: <strong className="text-foreground">{availableTenants.find(t => t.tenantId === tenantId)?.tenantName}</strong></span>
                {availableTenants.filter(t => t.tenantId !== tenantId).map(t => (
                  <Button key={t.tenantId} variant="ghost" size="sm" className="h-5 px-2 text-xs" onClick={() => selectTenant(t.tenantId)}>
                    Trocar para {t.tenantName}
                  </Button>
                ))}
              </div>
            )}

            <header className="h-14 border-b border-sidebar-border flex items-center px-4 bg-sidebar">
              <SidebarTrigger className="text-foreground/50 hover:text-foreground transition-colors" />
            </header>
            <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto bg-background">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SidebarDataProvider>
  );
}
