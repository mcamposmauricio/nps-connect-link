import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Building2,
  MessageSquare,
  Headphones,
  TrendingUp,
  History,
  Flag,
  User,
  Inbox,
  Moon,
  Sun,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TeamAttendant {
  id: string;
  display_name: string;
  active_count: number;
  user_id: string;
  status: string | null;
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const { user, isAdmin, hasPermission, userDataLoading } = useAuth();
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";

  const [npsOpen, setNpsOpen] = useState(
    () => localStorage.getItem("sidebar-nps-open") !== "false"
  );
  const [chatOpen, setChatOpen] = useState(
    () => localStorage.getItem("sidebar-chat-open") !== "false"
  );
  const [reportsOpen, setReportsOpen] = useState(
    () => localStorage.getItem("sidebar-reports-open") !== "false"
  );
  const [workspaceOpen, setWorkspaceOpen] = useState(
    () => localStorage.getItem("sidebar-workspace-open") !== "false"
  );

  const handleNpsOpen = (open: boolean) => {
    setNpsOpen(open);
    localStorage.setItem("sidebar-nps-open", String(open));
  };
  const handleChatOpen = (open: boolean) => {
    setChatOpen(open);
    localStorage.setItem("sidebar-chat-open", String(open));
  };
  const handleReportsOpen = (open: boolean) => {
    setReportsOpen(open);
    localStorage.setItem("sidebar-reports-open", String(open));
  };
  const handleWorkspaceOpen = (open: boolean) => {
    setWorkspaceOpen(open);
    localStorage.setItem("sidebar-workspace-open", String(open));
  };

  const showCS = hasPermission("cs", "view") || hasPermission("cs.kanban", "view") || hasPermission("cs.trails", "view");
  const showCSReports = hasPermission("cs.reports.health", "view") || hasPermission("cs.reports.churn", "view") || hasPermission("cs.reports.financial", "view");
  const showChatReports = hasPermission("chat.reports", "view");
  const showReports = showCSReports || showChatReports;
  const showChat = hasPermission("chat", "view") || hasPermission("chat.workspace", "view") || hasPermission("chat.history", "view");
  const showNPS = hasPermission("nps", "view") || hasPermission("nps.dashboard", "view") || hasPermission("nps.campaigns", "view");
  const showContacts = hasPermission("contacts", "view") || hasPermission("contacts.companies", "view") || hasPermission("contacts.people", "view");
  const [teamAttendants, setTeamAttendants] = useState<TeamAttendant[]>([]);

  const isActive = (path: string) => location.pathname === path;

  const myAttendant = teamAttendants.find((a) => a.user_id === user?.id);
  const totalActiveChats = teamAttendants.reduce((sum, a) => sum + a.active_count, 0);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;
    const { data: myProfile } = await supabase
      .from("attendant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let attendants: any[] = [];
    if (isAdmin) {
      const { data } = await supabase.from("attendant_profiles").select("id, display_name, user_id, status");
      attendants = data ?? [];
    } else if (myProfile) {
      const { data: myTeams } = await supabase
        .from("chat_team_members")
        .select("team_id")
        .eq("attendant_id", myProfile.id);
      if (myTeams && myTeams.length > 0) {
        const teamIds = myTeams.map((t: any) => t.team_id);
        const { data: teamMembers } = await supabase
          .from("chat_team_members")
          .select("attendant_id")
          .in("team_id", teamIds);
        const uniqueIds = [...new Set((teamMembers ?? []).map((m: any) => m.attendant_id))];
        if (uniqueIds.length > 0) {
          const { data } = await supabase
            .from("attendant_profiles")
            .select("id, display_name, user_id, status")
            .in("id", uniqueIds);
          attendants = data ?? [];
        }
      } else {
        const { data } = await supabase
          .from("attendant_profiles")
          .select("id, display_name, user_id, status")
          .eq("user_id", user.id);
        attendants = data ?? [];
      }
    }

    const { data: activeRooms } = await supabase
      .from("chat_rooms")
      .select("attendant_id")
      .in("status", ["active", "waiting"]);
    const counts: Record<string, number> = {};
    (activeRooms ?? []).forEach((r: any) => {
      if (r.attendant_id) counts[r.attendant_id] = (counts[r.attendant_id] || 0) + 1;
    });

    const sorted = attendants
      .map((a: any) => ({
        id: a.id,
        display_name: a.display_name,
        user_id: a.user_id,
        active_count: counts[a.id] || 0,
        status: a.status ?? null,
      }))
      .sort((a, b) => {
        if (a.user_id === user.id) return -1;
        if (b.user_id === user.id) return 1;
        return a.display_name.localeCompare(b.display_name);
      });
    setTeamAttendants(sorted);
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (!chatOpen) return;
    fetchCounts();
    const roomsChannel = supabase
      .channel("sidebar-chat-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms" }, () => fetchCounts())
      .subscribe();
    const attendantsChannel = supabase
      .channel("sidebar-attendants")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "attendant_profiles" }, () => fetchCounts())
      .subscribe();
    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(attendantsChannel);
    };
  }, [chatOpen, fetchCounts]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: t("nav.logoutSuccess"), description: t("nav.logoutMessage") });
    navigate("/auth");
  };

  const csItems = [
    { path: "/cs-dashboard", icon: LayoutDashboard, label: t("nav.overview") },
    { path: "/cs-trails", icon: Route, label: t("nav.journeys") },
  ];

  const npsItems = [
    { path: "/nps/dashboard", icon: BarChart3, label: t("nav.metrics") },
    { path: "/nps/campaigns", icon: Send, label: t("nav.surveys") },
    { path: "/nps/nps-settings", icon: Settings, label: t("npsSettings.navLabel") },
  ];

  // Active item style — subtle bg + Metric Blue left border
  const activeItemCls =
    "bg-sidebar-accent border-l-[3px] border-accent pl-[calc(theme(spacing.3)-3px)] text-foreground";
  const groupLabelCls = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-2 py-1.5";

  const logoSrc = theme === "dark" ? "/logo-dark.svg" : "/logo-light.svg";
  const iconSrc = theme === "dark" ? "/logo-icon-dark.svg" : "/logo-icon-light.svg";

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-6">
        <button
        onClick={() => {
            if (isAdmin) navigate("/admin/dashboard");
            else if (showCS) navigate("/cs-dashboard");
            else if (showNPS) navigate("/nps/dashboard");
            else if (showChat) navigate("/admin/dashboard");
            else navigate("/nps/dashboard");
          }}
          className="flex items-center justify-center gap-3 min-w-0 w-full"
        >
          {collapsed ? (
            <img src={iconSrc} alt="Journey" className="h-20 w-20 object-contain flex-shrink-0" />
          ) : (
            <img src={logoSrc} alt="Journey" className="h-20 w-auto object-contain max-w-[200px]" />
          )}
        </button>
      </SidebarHeader>

      <SidebarContent>
        {userDataLoading ? (
          <div className="p-3 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Customer Success */}
            {showCS && (
              <SidebarGroup>
                <SidebarGroupLabel className={groupLabelCls}>{t("cs.title")}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {hasPermission("cs.kanban", "view") && (
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => navigate("/cs-dashboard")} isActive={isActive("/cs-dashboard")} tooltip={t("nav.overview")} className={cn(isActive("/cs-dashboard") ? activeItemCls : "hover:bg-sidebar-accent")}>
                          <LayoutDashboard className="h-4 w-4" /><span>{t("nav.overview")}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {hasPermission("cs.trails", "view") && (
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => navigate("/cs-trails")} isActive={isActive("/cs-trails")} tooltip={t("nav.journeys")} className={cn(isActive("/cs-trails") ? activeItemCls : "hover:bg-sidebar-accent")}>
                          <Route className="h-4 w-4" /><span>{t("nav.journeys")}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* NPS */}
            {showNPS && (
              <SidebarGroup>
                <Collapsible open={npsOpen} onOpenChange={handleNpsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className={`${groupLabelCls} cursor-pointer hover:text-foreground/70 flex items-center justify-between w-full transition-colors`}>
                      <span className="flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /><span>NPS</span></span>
                      {!collapsed && (npsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent onClick={(e) => e.stopPropagation()}>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {hasPermission("nps.dashboard", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/nps/dashboard")} isActive={isActive("/nps/dashboard")} tooltip={t("nav.metrics")} className={cn("pl-6", isActive("/nps/dashboard") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <BarChart3 className="h-4 w-4" /><span>{t("nav.metrics")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("nps.campaigns", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/nps/campaigns")} isActive={isActive("/nps/campaigns")} tooltip={t("nav.surveys")} className={cn("pl-6", isActive("/nps/campaigns") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Send className="h-4 w-4" /><span>{t("nav.surveys")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("nps.settings", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/nps/nps-settings")} isActive={isActive("/nps/nps-settings")} tooltip={t("npsSettings.navLabel")} className={cn("pl-6", isActive("/nps/nps-settings") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Settings className="h-4 w-4" /><span>{t("npsSettings.navLabel")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Chat */}
            {showChat && (
              <SidebarGroup>
                <Collapsible open={chatOpen} onOpenChange={handleChatOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className={`${groupLabelCls} cursor-pointer hover:text-foreground/70 flex items-center justify-between w-full transition-colors`}>
                      <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /><span>{t("chat.module")}</span></span>
                      {!collapsed && (chatOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent onClick={(e) => e.stopPropagation()}>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton onClick={() => navigate("/admin/dashboard")} isActive={isActive("/admin/dashboard")} tooltip={t("chat.dashboard.title")} className={cn("pl-6", isActive("/admin/dashboard") ? activeItemCls : "hover:bg-sidebar-accent")}>
                            <LayoutDashboard className="h-4 w-4" /><span>Dashboard</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>

                        {/* Workspace */}
                        {hasPermission("chat.workspace", "view") && (
                          <SidebarMenuItem>
                            <Collapsible open={workspaceOpen} onOpenChange={handleWorkspaceOpen}>
                              <div className="flex items-center pl-6" onClick={(e) => e.stopPropagation()}>
                                <SidebarMenuButton
                                  onClick={(e) => { e.stopPropagation(); navigate("/admin/workspace"); }}
                                  isActive={location.pathname === "/admin/workspace"}
                                  tooltip={t("chat.workspace.station")}
                                  className={cn("flex-1", location.pathname === "/admin/workspace" ? activeItemCls : "hover:bg-sidebar-accent")}
                                >
                                  <Inbox className="h-4 w-4" />
                                  <span>{t("chat.workspace.station")}</span>
                                  <Badge variant="accent" className="ml-auto text-[9px] h-4 px-1">{totalActiveChats}</Badge>
                                </SidebarMenuButton>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); handleWorkspaceOpen(!workspaceOpen); }}>
                                  {workspaceOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </Button>
                              </div>
                              <CollapsibleContent onClick={(e) => e.stopPropagation()}>
                                {teamAttendants.map((att) => (
                                  <SidebarMenuItem key={att.id}>
                                    <SidebarMenuButton
                                      onClick={(e) => { e.stopPropagation(); att.user_id === user?.id ? navigate("/admin/workspace") : navigate(`/admin/workspace?attendant=${att.id}`); }}
                                      isActive={att.user_id === user?.id ? location.pathname === "/admin/workspace" && !location.search.includes("attendant=") : location.search.includes(`attendant=${att.id}`)}
                                      tooltip={att.display_name}
                                      className="pl-10 text-xs hover:bg-sidebar-accent"
                                    >
                                      <User className="h-3.5 w-3.5" />
                                      <span className="truncate">{att.user_id === user?.id ? `${t("chat.workspace.you")} ${att.display_name}` : att.display_name}</span>
                                      <Badge variant="accent" className="ml-auto text-[9px] h-4 px-1">{att.active_count}</Badge>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          </SidebarMenuItem>
                        )}

                        {hasPermission("chat.history", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/admin/history")} isActive={isActive("/admin/history")} tooltip={t("chat.history.title")} className={cn("pl-6", isActive("/admin/history") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <History className="h-4 w-4" /><span>{t("chat.history.title")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}

                        {hasPermission("chat.banners", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/admin/banners")} isActive={isActive("/admin/banners")} tooltip={t("banners.title")} className={cn("pl-6", isActive("/admin/banners") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Flag className="h-4 w-4" /><span>{t("banners.title")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}

                        {(hasPermission("chat.settings.general", "view") || hasPermission("chat.settings.widget", "view") || hasPermission("chat.settings.macros", "view") || hasPermission("chat.settings.attendants", "view") || hasPermission("chat.settings.teams", "view") || hasPermission("chat.settings.categories", "view") || hasPermission("chat.settings.apikeys", "view") || hasPermission("chat", "manage")) && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/admin/settings")} isActive={isActive("/admin/settings") || location.pathname.startsWith("/admin/settings/")} tooltip={t("chat.settings.title")} className={cn("pl-6", isActive("/admin/settings") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Settings className="h-4 w-4" /><span>{t("chat.settings.title")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Reports */}
            {showReports && (
              <SidebarGroup>
                <Collapsible open={reportsOpen} onOpenChange={handleReportsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel
                      className={`${groupLabelCls} cursor-pointer hover:text-foreground/70 flex items-center justify-between w-full transition-colors`}
                    >
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>{t("cs.reports")}</span>
                      </span>
                      {!collapsed &&
                        (reportsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent onClick={(e) => e.stopPropagation()}>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {hasPermission("cs.reports.health", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/cs-health")} isActive={isActive("/cs-health")} tooltip={t("nav.health")} className={cn("pl-6", isActive("/cs-health") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Heart className="h-4 w-4" /><span>{t("nav.health")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("cs.reports.churn", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/cs-churn")} isActive={isActive("/cs-churn")} tooltip={t("nav.risk")} className={cn("pl-6", isActive("/cs-churn") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <TrendingDown className="h-4 w-4" /><span>{t("nav.risk")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("cs.reports.financial", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/cs-financial")} isActive={isActive("/cs-financial")} tooltip={t("nav.revenue")} className={cn("pl-6", isActive("/cs-financial") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <DollarSign className="h-4 w-4" /><span>{t("nav.revenue")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("chat.reports", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/admin/gerencial")} isActive={isActive("/admin/gerencial")} tooltip={t("chat.gerencial.title")} className={cn("pl-6", isActive("/admin/gerencial") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <TrendingUp className="h-4 w-4" /><span>{t("chat.gerencial.title")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Cadastros */}
            {showContacts && (
              <SidebarGroup>
                <SidebarGroupLabel className={groupLabelCls}>{t("nav.registry")}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {hasPermission("contacts.companies", "view") && (
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => navigate("/nps/contacts")} isActive={isActive("/nps/contacts")} tooltip={t("nav.companies")} className={cn(isActive("/nps/contacts") ? activeItemCls : "hover:bg-sidebar-accent")}>
                          <Building2 className="h-4 w-4" /><span>{t("nav.companies")}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {hasPermission("contacts.people", "view") && (
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => navigate("/nps/people")} isActive={isActive("/nps/people")} tooltip={t("nav.people")} className={cn(isActive("/nps/people") ? activeItemCls : "hover:bg-sidebar-accent")}>
                          <Users className="h-4 w-4" /><span>{t("nav.people")}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/[0.06] p-3">
        <div className="flex flex-col gap-1">
          <SidebarMenuButton
            onClick={() => navigate("/profile")}
            isActive={isActive("/profile")}
            tooltip={t("profile.title")}
            className={cn("w-full justify-start", isActive("/profile") ? activeItemCls : "hover:bg-sidebar-accent")}
          >
            <User className="h-4 w-4" />
            {!collapsed && <span>{t("profile.title")}</span>}
            {!collapsed && myAttendant && (
              <span className={cn(
                "ml-auto h-2 w-2 rounded-full shrink-0",
                myAttendant.status === "online" ? "bg-green-500" :
                myAttendant.status === "busy" ? "bg-amber-400" : "bg-muted-foreground/30"
              )} />
            )}
          </SidebarMenuButton>
          {hasPermission("settings", "view") && (
            <SidebarMenuButton
              onClick={() => navigate("/nps/settings")}
              isActive={isActive("/nps/settings")}
              tooltip={t("nav.config")}
              className={cn(
                "w-full justify-start",
                isActive("/nps/settings") ? activeItemCls : "hover:bg-sidebar-accent",
              )}
            >
              <Settings className="h-4 w-4" />
              {!collapsed && <span>{t("nav.config")}</span>}
            </SidebarMenuButton>
          )}
          <div className="flex items-center gap-1 mt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/50 hover:text-foreground">
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
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 text-foreground/50 hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-foreground/50 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
