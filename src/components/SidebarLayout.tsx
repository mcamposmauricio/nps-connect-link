import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface SidebarLayoutProps {
  children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const navigate = useNavigate();
  const { user, loading, userDataLoading, tenantId, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && !userDataLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!tenantId && !isAdmin) {
        navigate("/pending-approval");
      }
    }
  }, [user, loading, userDataLoading, tenantId, isAdmin, navigate]);

  if (loading || userDataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src="/logo-icon-dark.png" alt="Journey" className="h-12 w-12 animate-pulse" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-white/[0.06] flex items-center px-4 bg-sidebar">
            <SidebarTrigger className="text-foreground/50 hover:text-foreground transition-colors" />
          </header>
          <div className="flex-1 p-6 overflow-auto bg-background">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
