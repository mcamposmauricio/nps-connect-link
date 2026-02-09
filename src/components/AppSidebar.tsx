import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Route,
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
  Building2,
  MessageSquare,
  Headphones,
  TrendingUp,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
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
  const { isAdmin, hasPermission } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const [npsOpen, setNpsOpen] = useState(
    location.pathname.startsWith("/nps/") || 
    location.pathname === "/nps"
  );

  const [chatOpen, setChatOpen] = useState(
    location.pathname.startsWith("/admin/")
  );

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: t("nav.logoutSuccess"),
      description: t("nav.logoutMessage"),
    });
    navigate("/auth");
  };

  const csItems = [
    { path: "/", icon: LayoutDashboard, label: t("nav.overview") },
    { path: "/cs-trails", icon: Route, label: t("nav.journeys") },
  ];

  const csReportItems = [
    { path: "/cs-health", icon: Heart, label: t("nav.health") },
    { path: "/cs-churn", icon: TrendingDown, label: t("nav.risk") },
    { path: "/cs-financial", icon: DollarSign, label: t("nav.revenue") },
  ];

  const npsItems = [
    { path: "/nps/dashboard", icon: BarChart3, label: t("nav.metrics") },
    { path: "/nps/campaigns", icon: Send, label: t("nav.surveys") },
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
        {hasPermission('cs', 'view') && (
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
        )}

        {/* CS Reports */}
        {hasPermission('cs', 'view') && (
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
        )}

        {/* Cadastros */}
        {hasPermission('contacts', 'view') && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.registry")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/nps/contacts")}
                    isActive={isActive("/nps/contacts")}
                    tooltip={t("nav.companies")}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>{t("nav.companies")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/nps/people")}
                    isActive={isActive("/nps/people")}
                    tooltip={t("nav.people")}
                  >
                    <Users className="h-4 w-4" />
                    <span>{t("nav.people")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* NPS Submenu */}
        {hasPermission('nps', 'view') && (
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
        )}

        {/* Chat Module Submenu */}
        {hasPermission('chat', 'view') && (
          <SidebarGroup>
            <Collapsible open={chatOpen} onOpenChange={setChatOpen}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1.5 flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{t("chat.module")}</span>
                  </span>
                  {!collapsed && (
                    chatOpen ? (
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
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => navigate("/admin/dashboard")}
                        isActive={isActive("/admin/dashboard")}
                        tooltip={t("chat.dashboard.title")}
                        className="pl-6"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => navigate("/admin/workspace")}
                        isActive={isActive("/admin/workspace") || location.pathname.startsWith("/admin/workspace/")}
                        tooltip={t("chat.workspace.title")}
                        className="pl-6"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Workspace</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {hasPermission('chat', 'manage') && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() => navigate("/admin/attendants")}
                            isActive={isActive("/admin/attendants")}
                            tooltip={t("chat.attendants.title")}
                            className="pl-6"
                          >
                            <Headphones className="h-4 w-4" />
                            <span>{t("chat.attendants.title")}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() => navigate("/admin/gerencial")}
                            isActive={isActive("/admin/gerencial")}
                            tooltip={t("chat.gerencial.title")}
                            className="pl-6"
                          >
                            <TrendingUp className="h-4 w-4" />
                            <span>{t("chat.gerencial.title")}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() => navigate("/admin/history")}
                            isActive={isActive("/admin/history")}
                            tooltip={t("chat.history.title")}
                            className="pl-6"
                          >
                            <History className="h-4 w-4" />
                            <span>{t("chat.history.title")}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() => navigate("/admin/settings")}
                            isActive={isActive("/admin/settings") || location.pathname.startsWith("/admin/settings/")}
                            tooltip={t("chat.settings.title")}
                            className="pl-6"
                          >
                            <Settings className="h-4 w-4" />
                            <span>{t("chat.settings.title")}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-2">
          {/* Settings button */}
          <SidebarMenuButton
            onClick={() => navigate("/nps/settings")}
            isActive={isActive("/nps/settings")}
            tooltip={t("nav.config")}
            className="w-full justify-start"
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>{t("nav.config")}</span>}
          </SidebarMenuButton>
          
          {/* Language and logout buttons */}
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
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
