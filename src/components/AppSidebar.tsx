import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Route, Heart, TrendingDown, DollarSign, Users, BarChart3, Send, Settings,
  ChevronDown, ChevronRight, LogOut, Languages, Zap, Building2, MessageSquare, Headphones,
  TrendingUp, History, Flag, User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TeamAttendant {
  id: string;
  display_name: string;
  active_count: number;
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const { isAdmin, hasPermission } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const [npsOpen, setNpsOpen] = useState(location.pathname.startsWith("/nps/") || location.pathname === "/nps");
  const [chatOpen, setChatOpen] = useState(location.pathname.startsWith("/admin/"));
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamAttendants, setTeamAttendants] = useState<TeamAttendant[]>([]);

  const isActive = (path: string) => location.pathname === path;

  // Fetch team attendants with active chat counts
  useEffect(() => {
    if (!chatOpen) return;
    const fetchTeam = async () => {
      const { data: attendants } = await supabase
        .from("attendant_profiles")
        .select("id, display_name");
      if (!attendants) return;

      const { data: activeRooms } = await supabase
        .from("chat_rooms")
        .select("attendant_id")
        .eq("status", "active");

      const counts: Record<string, number> = {};
      (activeRooms ?? []).forEach((r: any) => {
        if (r.attendant_id) counts[r.attendant_id] = (counts[r.attendant_id] || 0) + 1;
      });

      setTeamAttendants(
        (attendants as any[]).map((a) => ({
          id: a.id,
          display_name: a.display_name,
          active_count: counts[a.id] || 0,
        }))
      );
    };
    fetchTeam();
  }, [chatOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: t("nav.logoutSuccess"), description: t("nav.logoutMessage") });
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
    { path: "/nps/nps-settings", icon: Settings, label: t("npsSettings.navLabel") },
  ];

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="border-b px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && <span className="text-lg font-semibold">Journey CS</span>}
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
                    <SidebarMenuButton onClick={() => navigate(item.path)} isActive={isActive(item.path)} tooltip={item.label}>
                      <item.icon className="h-4 w-4" /><span>{item.label}</span>
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
                    <SidebarMenuButton onClick={() => navigate(item.path)} isActive={isActive(item.path)} tooltip={item.label}>
                      <item.icon className="h-4 w-4" /><span>{item.label}</span>
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
                  <SidebarMenuButton onClick={() => navigate("/nps/contacts")} isActive={isActive("/nps/contacts")} tooltip={t("nav.companies")}>
                    <Building2 className="h-4 w-4" /><span>{t("nav.companies")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/nps/people")} isActive={isActive("/nps/people")} tooltip={t("nav.people")}>
                    <Users className="h-4 w-4" /><span>{t("nav.people")}</span>
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
                  <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /><span>NPS</span></span>
                  {!collapsed && (npsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {npsItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton onClick={() => navigate(item.path)} isActive={isActive(item.path)} tooltip={item.label} className="pl-6">
                          <item.icon className="h-4 w-4" /><span>{item.label}</span>
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
                  <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /><span>{t("chat.module")}</span></span>
                  {!collapsed && (chatOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => navigate("/admin/dashboard")} isActive={isActive("/admin/dashboard")} tooltip={t("chat.dashboard.title")} className="pl-6">
                        <LayoutDashboard className="h-4 w-4" /><span>Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => navigate("/admin/workspace")}
                        isActive={isActive("/admin/workspace") || location.pathname.startsWith("/admin/workspace/")}
                        tooltip={t("chat.workspace.title")}
                        className="pl-6"
                      >
                        <MessageSquare className="h-4 w-4" /><span>Workspace</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Team attendants sub-section */}
                    {teamAttendants.length > 0 && (
                      <SidebarMenuItem>
                        <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip="Equipe" className="pl-8">
                              <Users className="h-3.5 w-3.5" />
                              <span className="text-xs">Equipe</span>
                              {!collapsed && (
                                <span className="ml-auto">
                                  {teamOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </span>
                              )}
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            {teamAttendants.map((att) => (
                              <SidebarMenuButton
                                key={att.id}
                                onClick={() => navigate(`/admin/workspace?attendant=${att.id}`)}
                                isActive={location.search.includes(`attendant=${att.id}`)}
                                tooltip={att.display_name}
                                className="pl-10 text-xs"
                              >
                                <User className="h-3 w-3" />
                                <span className="truncate">{att.display_name}</span>
                                <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1">
                                  {att.active_count}
                                </Badge>
                              </SidebarMenuButton>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuItem>
                    )}

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => navigate("/admin/history")} isActive={isActive("/admin/history")} tooltip={t("chat.history.title")} className="pl-6">
                        <History className="h-4 w-4" /><span>{t("chat.history.title")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {hasPermission('chat', 'manage') && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton onClick={() => navigate("/admin/attendants")} isActive={isActive("/admin/attendants")} tooltip={t("chat.attendants.title")} className="pl-6">
                            <Headphones className="h-4 w-4" /><span>{t("chat.attendants.title")}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton onClick={() => navigate("/admin/banners")} isActive={isActive("/admin/banners")} tooltip={t("banners.title")} className="pl-6">
                            <Flag className="h-4 w-4" /><span>{t("banners.title")}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton onClick={() => navigate("/admin/gerencial")} isActive={isActive("/admin/gerencial")} tooltip={t("chat.gerencial.title")} className="pl-6">
                            <TrendingUp className="h-4 w-4" /><span>{t("chat.gerencial.title")}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() => navigate("/admin/settings")}
                            isActive={isActive("/admin/settings") || location.pathname.startsWith("/admin/settings/")}
                            tooltip={t("chat.settings.title")}
                            className="pl-6"
                          >
                            <Settings className="h-4 w-4" /><span>{t("chat.settings.title")}</span>
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
          {hasPermission('settings', 'view') && (
            <SidebarMenuButton onClick={() => navigate("/nps/settings")} isActive={isActive("/nps/settings")} tooltip={t("nav.config")} className="w-full justify-start">
              <Settings className="h-4 w-4" />{!collapsed && <span>{t("nav.config")}</span>}
            </SidebarMenuButton>
          )}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Languages className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuItem onClick={() => setLanguage("en")}>{language === "en" && "✓ "}English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("pt-BR")}>{language === "pt-BR" && "✓ "}Português (BR)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
