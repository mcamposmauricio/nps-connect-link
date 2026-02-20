import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Edit, Trash2, Users, Eye, ThumbsUp, ThumbsDown, Search } from "lucide-react";
import BannerPreview from "@/components/chat/BannerPreview";
import BannerRichEditor from "@/components/chat/BannerRichEditor";

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
}

interface Assignment {
  id: string;
  contact_id: string;
  is_active: boolean;
  views_count: number;
  vote: string | null;
  contact_name?: string;
  contact_email?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
}

const AdminBanners = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
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

  const [form, setForm] = useState({
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
  });

  const fetchBanners = useCallback(async () => {
    const { data } = await supabase
      .from("chat_banners")
      .select("*")
      .order("created_at", { ascending: false });
    setBanners((data as any) ?? []);

    // Fetch assignment counts
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
      });
    } else {
      setEditingBanner(null);
      setForm({
        title: "",
        content: "",
        content_html: "",
        text_align: "left",
        bg_color: "#3B82F6",
        text_color: "#FFFFFF",
        link_url: "",
        link_label: "",
        has_voting: false,
        is_active: true,
      });
    }
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
      return {
        ...a,
        contact_name: contact?.name ?? "—",
        contact_email: contact?.email ?? "—",
      };
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

    const rows = newContactIds.map((contact_id) => ({
      banner_id: selectedBanner.id,
      contact_id,
      tenant_id: null, // trigger will set it
    }));

    // We need tenant_id — get it from banner
    const { data: bannerData } = await supabase
      .from("chat_banners")
      .select("tenant_id")
      .eq("id", selectedBanner.id)
      .single();

    const withTenant = rows.map((r) => ({ ...r, tenant_id: (bannerData as any)?.tenant_id }));

    await supabase.from("chat_banner_assignments").insert(withTenant as any);
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
      c.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("banners.title")}</h1>
            <p className="text-muted-foreground">{t("banners.subtitle")}</p>
          </div>
          <Button onClick={() => openBannerDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t("banners.create")}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : banners.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("banners.noBanners")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {banners.map((banner) => {
              const counts = assignmentCounts[banner.id] ?? { total: 0, views: 0, upVotes: 0, downVotes: 0 };
              return (
                <Card key={banner.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Color swatch */}
                      <div
                        className="w-12 h-12 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: banner.bg_color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{banner.title}</h3>
                          <Badge variant={banner.is_active ? "default" : "secondary"}>
                            {banner.is_active ? t("banners.active") : t("banners.inactive")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{banner.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {counts.total} {t("banners.clients")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {counts.views} views
                          </span>
                          {banner.has_voting && (
                            <>
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                {counts.upVotes}
                              </span>
                              <span className="flex items-center gap-1">
                                <ThumbsDown className="h-3 w-3" />
                                {counts.downVotes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAssignDialog(banner)}>
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBannerDialog(banner)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteBanner(banner.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? t("banners.edit") : t("banners.create")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("banners.titleLabel")}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título interno do banner" />
              </div>
              <div className="space-y-2">
                <Label>{t("banners.contentLabel")}</Label>
                <BannerRichEditor
                  initialHtml={form.content_html || undefined}
                  textAlign={form.text_align}
                  onChangeAlign={(align) => setForm({ ...form, text_align: align })}
                  onChange={(html, text) => setForm({ ...form, content_html: html, content: text })}
                  placeholder="Texto visível no widget (emojis OK)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("banners.bgColor")}</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                    <Input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("banners.textColor")}</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                    <Input value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="flex-1" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("banners.linkUrl")}</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>{t("banners.linkLabel")}</Label>
                <Input value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="Saiba mais" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.has_voting} onCheckedChange={(v) => setForm({ ...form, has_voting: v })} />
                <Label>{t("banners.enableVoting")}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>{t("banners.activeLabel")}</Label>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview</Label>
              <BannerPreview
                content={form.content}
                contentHtml={form.content_html || undefined}
                textAlign={form.text_align}
                bgColor={form.bg_color}
                textColor={form.text_color}
                linkUrl={form.link_url || undefined}
                linkLabel={form.link_label || undefined}
                hasVoting={form.has_voting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveBanner} disabled={!form.title || !form.content}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("banners.assignments")} — {selectedBanner?.title}</DialogTitle>
          </DialogHeader>

          {/* Add contacts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("banners.addClients")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder={t("banners.searchClient")}
                  className="pl-9"
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredContacts.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                  >
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

          {/* Current assignments */}
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
                            <ThumbsUp className="h-4 w-4 text-green-500" />
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
