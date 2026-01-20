import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Route,
  FileText,
  Heart,
  TrendingDown,
  DollarSign,
  Users,
  BarChart3,
  Send,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Languages,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const [npsOpen, setNpsOpen] = useState(
    location.pathname.startsWith("/nps/") || 
    location.pathname === "/nps"
  );

  const isActive = (path: string) => location.pathname === path;
  const isNpsActive = location.pathname.startsWith("/nps");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: t("nav.logoutSuccess"),
      description: t("nav.logoutMessage"),
    });
    navigate("/auth");
  };

  const csItems = [
    { path: "/", icon: LayoutDashboard, label: t("cs.dashboard") },
    { path: "/cs-trails", icon: Route, label: t("cs.trails") },
    { path: "/csms", icon: Users, label: t("cs.csms") },
  ];

  const csReportItems = [
    { path: "/cs-trails-report", icon: FileText, label: t("cs.trailsReport") },
    { path: "/cs-health", icon: Heart, label: t("cs.healthScore") },
    { path: "/cs-churn", icon: TrendingDown, label: t("cs.churn") },
    { path: "/cs-financial", icon: DollarSign, label: t("cs.financial") },
  ];

  const npsItems = [
    { path: "/nps/dashboard", icon: BarChart3, label: t("nav.dashboard") },
    { path: "/nps/contacts", icon: Users, label: t("nav.contacts") },
    { path: "/nps/campaigns", icon: Send, label: t("nav.campaigns") },
    { path: "/nps/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="border-b px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold">Journey CS</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Customer Success Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("cs.title")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {csItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={isActive(item.path)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CS Reports */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("cs.reports")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {csReportItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={isActive(item.path)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* NPS Submenu */}
        <SidebarGroup>
          <Collapsible open={npsOpen} onOpenChange={setNpsOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1.5 flex items-center justify-between w-full">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>NPS</span>
                </span>
                {!collapsed && (
                  npsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {npsItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.path)}
                        isActive={isActive(item.path)}
                        tooltip={item.label}
                        className="pl-6"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Languages className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem onClick={() => setLanguage("en")}>
                {language === "en" && "✓ "}English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("pt-BR")}>
                {language === "pt-BR" && "✓ "}Português (BR)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
