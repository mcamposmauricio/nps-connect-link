import { useEffect, useState, useRef } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarDataProvider } from "@/contexts/SidebarDataContext";
import { supabase } from "@/integrations/supabase/client";

export default function SidebarLayout() {
  const navigate = useNavigate();
  const { user, loading, userDataLoading, tenantId, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem("sidebar-open") !== "false"
  );

  useEffect(() => {
    if (!loading && !userDataLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!tenantId && !isAdmin) {
        navigate("/pending-approval");
      }
    }
  }, [user, loading, userDataLoading, tenantId, isAdmin, navigate]);

  // Polling for time-based auto rules (every 5 min) — runs globally while any admin is logged in
  useEffect(() => {
    if (!user) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        await supabase.functions.invoke("process-chat-auto-rules");
      } catch {
        // silent – edge function may not be deployed yet
      }
      if (!cancelled) {
        timeoutId = setTimeout(poll, 300_000); // 5 minutes
      }
    };

    timeoutId = setTimeout(poll, 15_000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user]);

  if (loading || userDataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src="/logo-icon-dark.svg" alt="Journey" className="h-[480px] w-[480px] animate-pulse" />
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
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <header className="h-14 border-b border-sidebar-border flex items-center px-4 bg-sidebar">
              <SidebarTrigger className="text-foreground/50 hover:text-foreground transition-colors" />
            </header>
            <div className="flex-1 p-6 overflow-auto bg-background">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SidebarDataProvider>
  );
}
