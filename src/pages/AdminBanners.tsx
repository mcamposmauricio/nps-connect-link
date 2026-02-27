import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Edit, Trash2, Users, Eye, ThumbsUp, ThumbsDown, Search, Copy, Info, AlertTriangle, CheckCircle, Megaphone, Sparkles, CalendarIcon, Bell, Palette, Link2, Calendar as CalendarSectionIcon, Target, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import BannerPreview from "@/components/chat/BannerPreview";
import BannerRichEditor from "@/components/chat/BannerRichEditor";

type BannerType = "info" | "warning" | "success" | "promo" | "update";

interface Banner {
  id: string;
  title: string;
  content: string;
  content_html: string | null;
  text_align: string;
  bg_color: string;
  text_color: string;
  link_url: string | null;
  link_label: string | null;
  has_voting: boolean;
  is_active: boolean;
  created_at: string;
  banner_type: BannerType;
  starts_at: string | null;
  expires_at: string | null;
  priority: number;
  target_all: boolean;
  max_views: number | null;
}

interface Assignment {
  id: string;
  contact_id: string;
  is_active: boolean;
  views_count: number;
  vote: string | null;
  dismissed_at: string | null;
  contact_name?: string;
  contact_email?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
}

const TYPE_DEFAULT_COLORS: Record<BannerType, { bg: string; text: string }> = {
  info: { bg: "#3B82F6", text: "#FFFFFF" },
  warning: { bg: "#F59E0B", text: "#FFFFFF" },
  success: { bg: "#10B981", text: "#FFFFFF" },
  promo: { bg: "#8B5CF6", text: "#FFFFFF" },
  update: { bg: "#06B6D4", text: "#FFFFFF" },
};

const BG_COLOR_PRESETS = [
  "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4",
  "#EF4444", "#EC4899", "#F97316", "#1E293B", "#6B7280",
];

const TEXT_COLOR_PRESETS = [
  "#FFFFFF", "#000000", "#F8FAFC", "#1E293B", "#FEF3C7",
  "#ECFDF5", "#EFF6FF", "#F5F3FF", "#ECFEFF", "#FEE2E2",
];

const BANNER_TYPES: { value: BannerType; label: string; icon: typeof Info; bgClass: string; borderClass: string }[] = [
  { value: "info", label: "Informação", icon: Info, bgClass: "bg-blue-500/15", borderClass: "border-blue-500/50" },
  { value: "warning", label: "Alerta", icon: AlertTriangle, bgClass: "bg-amber-500/15", borderClass: "border-amber-500/50" },
  { value: "success", label: "Sucesso", icon: CheckCircle, bgClass: "bg-emerald-500/15", borderClass: "border-emerald-500/50" },
  { value: "promo", label: "Promoção", icon: Megaphone, bgClass: "bg-purple-500/15", borderClass: "border-purple-500/50" },
  { value: "update", label: "Atualização", icon: Sparkles, bgClass: "bg-cyan-500/15", borderClass: "border-cyan-500/50" },
];

const getBannerStatus = (banner: Banner): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } => {
  if (!banner.is_active) return { label: "Inativo", variant: "secondary" };
  const now = new Date();
  if (banner.starts_at && new Date(banner.starts_at) > now) return { label: "Agendado", variant: "outline" };
  if (banner.expires_at && new Date(banner.expires_at) <= now) return { label: "Expirado", variant: "destructive" };
  return { label: "Ativo", variant: "default" };
};

const AdminBanners = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerDialog, setBannerDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, { total: number; views: number; upVotes: number; downVotes: number }>>({});

  const defaultForm = {
    title: "",
    content: "",
    content_html: "",
    text_align: "left" as "left" | "center" | "right",
    bg_color: "#3B82F6",
    text_color: "#FFFFFF",
    link_url: "",
    link_label: "",
    has_voting: false,
    is_active: true,
    banner_type: "info" as BannerType,
    starts_at: null as Date | null,
    expires_at: null as Date | null,
    priority: 5,
    target_all: false,
    max_views: null as number | null,
  };

  const [form, setForm] = useState(defaultForm);

  const fetchBanners = useCallback(async () => {
    const { data } = await supabase
      .from("chat_banners")
      .select("*")
      .order("priority", { ascending: false });
    setBanners((data as any) ?? []);

    if (data && data.length > 0) {
      const { data: allAssignments } = await supabase
        .from("chat_banner_assignments")
        .select("banner_id, views_count, vote");

      const counts: Record<string, { total: number; views: number; upVotes: number; downVotes: number }> = {};
      (allAssignments ?? []).forEach((a: any) => {
        if (!counts[a.banner_id]) counts[a.banner_id] = { total: 0, views: 0, upVotes: 0, downVotes: 0 };
        counts[a.banner_id].total++;
        counts[a.banner_id].views += a.views_count ?? 0;
        if (a.vote === "up") counts[a.banner_id].upVotes++;
        if (a.vote === "down") counts[a.banner_id].downVotes++;
      });
      setAssignmentCounts(counts);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const openBannerDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setForm({
        title: banner.title,
        content: banner.content,
        content_html: banner.content_html ?? "",
        text_align: (banner.text_align as "left" | "center" | "right") || "left",
        bg_color: banner.bg_color,
        text_color: banner.text_color,
        link_url: banner.link_url ?? "",
        link_label: banner.link_label ?? "",
        has_voting: banner.has_voting,
        is_active: banner.is_active,
        banner_type: (banner.banner_type as BannerType) || "info",
        starts_at: banner.starts_at ? new Date(banner.starts_at) : null,
        expires_at: banner.expires_at ? new Date(banner.expires_at) : null,
        priority: banner.priority ?? 5,
        target_all: banner.target_all ?? false,
        max_views: banner.max_views ?? null,
      });
    } else {
      setEditingBanner(null);
      setForm({ ...defaultForm });
    }
    setBannerDialog(true);
  };

  const duplicateBanner = (banner: Banner) => {
    setEditingBanner(null);
    setForm({
      title: banner.title + " (cópia)",
      content: banner.content,
      content_html: banner.content_html ?? "",
      text_align: (banner.text_align as "left" | "center" | "right") || "left",
      bg_color: banner.bg_color,
      text_color: banner.text_color,
      link_url: banner.link_url ?? "",
      link_label: banner.link_label ?? "",
      has_voting: banner.has_voting,
      is_active: false,
      banner_type: (banner.banner_type as BannerType) || "info",
      starts_at: null,
      expires_at: null,
      priority: banner.priority ?? 5,
      target_all: banner.target_all ?? false,
      max_views: banner.max_views ?? null,
    });
    setBannerDialog(true);
  };

  const saveBanner = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      title: form.title,
      content: form.content,
      content_html: form.content_html || null,
      text_align: form.text_align,
      bg_color: form.bg_color,
      text_color: form.text_color,
      link_url: form.link_url || null,
      link_label: form.link_label || null,
      has_voting: form.has_voting,
      is_active: form.is_active,
      banner_type: form.banner_type,
      starts_at: form.starts_at?.toISOString() ?? null,
      expires_at: form.expires_at?.toISOString() ?? null,
      priority: form.priority,
      target_all: form.target_all,
      max_views: form.max_views,
    };

    if (editingBanner) {
      await supabase.from("chat_banners").update(payload as any).eq("id", editingBanner.id);
    } else {
      await supabase.from("chat_banners").insert({ ...payload, user_id: session.user.id } as any);
    }

    setBannerDialog(false);
    toast({ title: t("common.save") });
    fetchBanners();
  };

  const deleteBanner = async (id: string) => {
    await supabase.from("chat_banner_assignments").delete().eq("banner_id", id);
    await supabase.from("chat_banners").delete().eq("id", id);
    toast({ title: t("common.delete") });
    fetchBanners();
  };

  const openAssignDialog = async (banner: Banner) => {
    setSelectedBanner(banner);

    const [{ data: assignData }, { data: contactsData }] = await Promise.all([
      supabase.from("chat_banner_assignments").select("*").eq("banner_id", banner.id),
      supabase.from("contacts").select("id, name, email").eq("is_company", true).order("name"),
    ]);

    const enriched = (assignData ?? []).map((a: any) => {
      const contact = (contactsData ?? []).find((c) => c.id === a.contact_id);
      return { ...a, contact_name: contact?.name ?? "—", contact_email: contact?.email ?? "—" };
    });

    setAssignments(enriched);
    setContacts((contactsData ?? []) as Contact[]);
    setSelectedContacts(new Set());
    setContactSearch("");
    setAssignDialog(true);
  };

  const assignContacts = async () => {
    if (!selectedBanner || selectedContacts.size === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const existingContactIds = new Set(assignments.map((a) => a.contact_id));
    const newContactIds = [...selectedContacts].filter((id) => !existingContactIds.has(id));

    if (newContactIds.length === 0) {
      toast({ title: "Todos os contatos selecionados já estão atribuídos" });
      return;
    }

    const { data: bannerData } = await supabase
      .from("chat_banners")
      .select("tenant_id")
      .eq("id", selectedBanner.id)
      .single();

    const rows = newContactIds.map((contact_id) => ({
      banner_id: selectedBanner.id,
      contact_id,
      tenant_id: (bannerData as any)?.tenant_id,
    }));

    await supabase.from("chat_banner_assignments").insert(rows as any);
    toast({ title: `${newContactIds.length} contatos atribuídos` });
    openAssignDialog(selectedBanner);
    fetchBanners();
  };

  const removeAssignment = async (id: string) => {
    await supabase.from("chat_banner_assignments").delete().eq("id", id);
    if (selectedBanner) openAssignDialog(selectedBanner);
    fetchBanners();
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(contactSearch.toLowerCase())
  );

  const getTypeConfig = (type: string) => BANNER_TYPES.find((t) => t.value === type) ?? BANNER_TYPES[0];

  return (
    <>
      <div className="space-y-6">
        <PageHeader title={t("banners.title")} subtitle={t("banners.subtitle")}>
          <Button onClick={() => openBannerDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t("banners.create")}
          </Button>
        </PageHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : banners.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-lg">{t("banners.noBanners")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("banners.emptyDescription")}</p>
              </div>
              <Button onClick={() => openBannerDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t("banners.createFirst")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => {
              const counts = assignmentCounts[banner.id] ?? { total: 0, views: 0, upVotes: 0, downVotes: 0 };
              const typeConfig = getTypeConfig(banner.banner_type);
              const TypeIcon = typeConfig.icon;
              const status = getBannerStatus(banner);
              const totalVotes = counts.upVotes + counts.downVotes;
              const favorability = totalVotes > 0 ? Math.round((counts.upVotes / totalVotes) * 100) : null;

              return (
                <Card key={banner.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Type icon + color stripe */}
                      <div
                        className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: banner.bg_color }}
                      >
                        <TypeIcon className="h-5 w-5" style={{ color: banner.text_color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{banner.title}</h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {banner.target_all && (
                            <Badge variant="outline" className="text-xs">{t("banners.allClients")}</Badge>
                          )}
                          <Badge variant="outline" className="text-xs capitalize">{typeConfig.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{banner.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {!banner.target_all && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {counts.total} {t("banners.clients")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {counts.views} views
                          </span>
                          {banner.has_voting && favorability !== null && (
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {favorability}% ({totalVotes})
                            </span>
                          )}
                          {banner.has_voting && favorability === null && (
                            <>
                              <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{counts.upVotes}</span>
                              <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3" />{counts.downVotes}</span>
                            </>
                          )}
                          {(banner.starts_at || banner.expires_at) && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {banner.starts_at ? format(new Date(banner.starts_at), "dd/MM") : "—"}
                              {" → "}
                              {banner.expires_at ? format(new Date(banner.expires_at), "dd/MM") : "∞"}
                            </span>
                          )}
                          <span className="text-muted-foreground/50">P{banner.priority}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!banner.target_all && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAssignDialog(banner)} title={t("banners.assignments")}>
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateBanner(banner)} title={t("banners.duplicate")}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBannerDialog(banner)} title={t("banners.edit")}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("banners.confirmDelete")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("banners.confirmDeleteDesc")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteBanner(banner.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Banner Create/Edit Dialog */}
      <Dialog open={bannerDialog} onOpenChange={setBannerDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{editingBanner ? t("banners.edit") : t("banners.create")}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[1fr,320px] gap-0">
            {/* Form column — scrollable */}
            <div className="overflow-y-auto px-6 py-4 space-y-4">

              {/* Mobile preview collapsible */}
              {isMobile && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <BannerPreview
                      content={form.content}
                      contentHtml={form.content_html || undefined}
                      textAlign={form.text_align}
                      bgColor={form.bg_color}
                      textColor={form.text_color}
                      linkUrl={form.link_url || undefined}
                      linkLabel={form.link_label || undefined}
                      hasVoting={form.has_voting}
                      bannerType={form.banner_type}
                      startsAt={form.starts_at?.toISOString()}
                      expiresAt={form.expires_at?.toISOString()}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Section 1: Type + Title */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionIdentification")}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("banners.typeLabel")}</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {BANNER_TYPES.map((bt) => {
                      const Icon = bt.icon;
                      const isSelected = form.banner_type === bt.value;
                      return (
                        <button
                          key={bt.value}
                          type="button"
                          onClick={() => {
                            const colors = TYPE_DEFAULT_COLORS[bt.value];
                            setForm({ ...form, banner_type: bt.value, bg_color: colors.bg, text_color: colors.text });
                          }}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all",
                            isSelected
                              ? cn(bt.bgClass, bt.borderClass, "ring-1 ring-offset-1 ring-offset-background", bt.borderClass.replace("border-", "ring-"))
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <Icon className={cn("h-4 w-4", isSelected ? "opacity-100" : "opacity-50")} style={isSelected ? { color: TYPE_DEFAULT_COLORS[bt.value].bg } : undefined} />
                          <span className="truncate">{bt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("banners.titleLabel")} <span className="text-destructive">*</span></Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título interno do banner" />
                </div>
              </div>

              {/* Section 2: Content */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionContent")}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("banners.contentLabel")} <span className="text-destructive">*</span></Label>
                  <BannerRichEditor
                    initialHtml={form.content_html || undefined}
                    textAlign={form.text_align}
                    onChangeAlign={(align) => setForm({ ...form, text_align: align })}
                    onChange={(html, text) => setForm({ ...form, content_html: html, content: text })}
                    placeholder="Texto visível no widget (emojis OK)"
                  />
                </div>
              </div>

              {/* Section 3: Appearance — Color Palettes */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionAppearance")}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t("banners.bgColor")}</Label>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-md border border-border flex-shrink-0" style={{ backgroundColor: form.bg_color }} />
                      <Input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="flex-1 h-8 text-xs font-mono" />
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {BG_COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "w-full aspect-square rounded-md border-2 transition-transform hover:scale-110",
                            form.bg_color.toLowerCase() === color.toLowerCase() ? "border-foreground ring-1 ring-foreground scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setForm({ ...form, bg_color: color })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t("banners.textColor")}</Label>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-md border border-border flex-shrink-0" style={{ backgroundColor: form.text_color }} />
                      <Input value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="flex-1 h-8 text-xs font-mono" />
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {TEXT_COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "w-full aspect-square rounded-md border-2 transition-transform hover:scale-110",
                            form.text_color.toLowerCase() === color.toLowerCase() ? "border-foreground ring-1 ring-foreground scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setForm({ ...form, text_color: color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Link + Voting */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionInteraction")}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("banners.linkUrl")}</Label>
                  <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("banners.linkLabel")}</Label>
                  <Input value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="Saiba mais" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.has_voting} onCheckedChange={(v) => setForm({ ...form, has_voting: v })} />
                  <Label className="text-sm">{t("banners.enableVoting")}</Label>
                </div>
              </div>

              {/* Section 5: Scheduling */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarSectionIcon className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionSchedule")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("banners.startsAt")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !form.starts_at && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {form.starts_at ? format(form.starts_at, "dd/MM/yyyy") : "Imediato"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.starts_at ?? undefined} onSelect={(d) => setForm({ ...form, starts_at: d ?? null })} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("banners.expiresAt")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !form.expires_at && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {form.expires_at ? format(form.expires_at, "dd/MM/yyyy") : "Sem limite"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.expires_at ?? undefined} onSelect={(d) => setForm({ ...form, expires_at: d ?? null })} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("banners.priority")}</Label>
                    <Select value={String(form.priority)} onValueChange={(v) => setForm({ ...form, priority: Number(v) })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} {n === 10 ? "(máx)" : n === 1 ? "(mín)" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("banners.maxViews")}</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-9"
                      value={form.max_views ?? ""}
                      onChange={(e) => setForm({ ...form, max_views: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Segmentation */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionSegmentation")}
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox checked={form.target_all} onCheckedChange={(v) => setForm({ ...form, target_all: !!v })} />
                  <Label className="text-sm">{t("banners.targetAll")}</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label className="text-sm">{t("banners.activeLabel")}</Label>
                </div>
              </div>
            </div>

            {/* Preview column — sticky, desktop only */}
            {!isMobile && (
              <div className="hidden md:block border-l border-border bg-muted/10 px-4 py-4 overflow-y-auto">
                <div className="sticky top-0 space-y-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Preview</Label>
                  <BannerPreview
                    content={form.content}
                    contentHtml={form.content_html || undefined}
                    textAlign={form.text_align}
                    bgColor={form.bg_color}
                    textColor={form.text_color}
                    linkUrl={form.link_url || undefined}
                    linkLabel={form.link_label || undefined}
                    hasVoting={form.has_voting}
                    bannerType={form.banner_type}
                    startsAt={form.starts_at?.toISOString()}
                    expiresAt={form.expires_at?.toISOString()}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setBannerDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveBanner} disabled={!form.title || !form.content}>
              {editingBanner ? "Salvar Alterações" : "Criar Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("banners.assignments")} — {selectedBanner?.title}</DialogTitle>
          </DialogHeader>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("banners.addClients")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder={t("banners.searchClient")} className="pl-9" />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredContacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(c.id)}
                      onChange={(e) => {
                        const next = new Set(selectedContacts);
                        e.target.checked ? next.add(c.id) : next.delete(c.id);
                        setSelectedContacts(next);
                      }}
                      className="rounded"
                    />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{c.email}</span>
                  </label>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="text-center py-4 text-sm text-muted-foreground">{t("banners.noClients")}</p>
                )}
              </div>
              <Button size="sm" onClick={assignContacts} disabled={selectedContacts.size === 0}>
                <Plus className="h-4 w-4 mr-1" />
                {t("banners.assign")} ({selectedContacts.size})
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("banners.currentAssignments")} ({assignments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("banners.noAssignments")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("banners.client")}</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>{t("banners.vote")}</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{a.contact_name}</p>
                            <p className="text-xs text-muted-foreground">{a.contact_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{a.views_count}</TableCell>
                        <TableCell>
                          {a.vote === "up" ? (
                            <ThumbsUp className="h-4 w-4 text-emerald-500" />
                          ) : a.vote === "down" ? (
                            <ThumbsDown className="h-4 w-4 text-destructive" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAssignment(a.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminBanners;
