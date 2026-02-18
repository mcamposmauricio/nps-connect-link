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
        // Authenticated but no tenant = no valid invite, block access
        navigate("/pending-approval");
      }
    }
  }, [user, loading, userDataLoading, tenantId, isAdmin, navigate]);

  if (loading || userDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 bg-card">
            <SidebarTrigger />
          </header>
          <div className="flex-1 p-6 overflow-auto bg-background">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
