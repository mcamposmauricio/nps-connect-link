import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Tag, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface Team {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  service_category_id: string | null;
}

const CategoriesTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categoryTeams, setCategoryTeams] = useState<{ category_id: string; team_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1" });

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cats }, { data: tms }, { data: comps }, { data: catTeams }] = await Promise.all([
      supabase.from("chat_service_categories").select("id, name, description, color").order("name"),
      supabase.from("chat_teams").select("id, name").order("name"),
      supabase.from("contacts").select("id, name, trade_name, service_category_id").eq("is_company", true).order("name"),
      supabase.from("chat_category_teams").select("category_id, team_id"),
    ]);
    setCategories((cats as Category[]) ?? []);
    setTeams(tms ?? []);
    setCompanies((comps as Company[]) ?? []);
    setCategoryTeams((catTeams as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openDialog = (cat?: Category) => {
    if (cat) {
      setEditingCat(cat);
      setForm({ name: cat.name, description: cat.description || "", color: cat.color });
    } else {
      setEditingCat(null);
      setForm({ name: "", description: "", color: "#6366f1" });
    }
    setDialogOpen(true);
  };

  const saveCategory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (editingCat) {
      await supabase.from("chat_service_categories").update({ name: form.name, description: form.description || null, color: form.color }).eq("id", editingCat.id);
    } else {
      await supabase.from("chat_service_categories").insert({ user_id: session.user.id, name: form.name, description: form.description || null, color: form.color } as any);
    }
    setDialogOpen(false);
    toast({ title: t("chat.settings.saved") });
    fetchAll();
  };

  const deleteCategory = async () => {
    if (!deleteId) return;
    // Remove from contacts first
    await supabase.from("contacts").update({ service_category_id: null } as any).eq("service_category_id", deleteId);
    await supabase.from("chat_service_categories").delete().eq("id", deleteId);
    setDeleteId(null);
    toast({ title: t("chat.settings.saved") });
    fetchAll();
  };

  const assignCompany = async (companyId: string, categoryId: string) => {
    await supabase.from("contacts").update({ service_category_id: categoryId } as any).eq("id", companyId);
    fetchAll();
  };

  const unassignCompany = async (companyId: string) => {
    await supabase.from("contacts").update({ service_category_id: null } as any).eq("id", companyId);
    fetchAll();
  };

  const addTeamToCategory = async (categoryId: string, teamId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    const { data: catData } = await supabase.from("chat_service_categories").select("tenant_id").eq("id", categoryId).single();
    await supabase.from("chat_category_teams").insert({ category_id: categoryId, team_id: teamId, tenant_id: (catData as any)?.tenant_id } as any);
    fetchAll();
  };

  const removeTeamFromCategory = async (categoryId: string, teamId: string) => {
    await supabase.from("chat_category_teams").delete().eq("category_id", categoryId).eq("team_id", teamId);
    fetchAll();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-1" /> {t("chat.categories.create")}
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t("chat.categories.noCategories")}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {categories.map((cat) => {
            const catCompanies = companies.filter(c => c.service_category_id === cat.id);
            const unassigned = companies.filter(c => !c.service_category_id);
            const catTeamIds = categoryTeams.filter(ct => ct.category_id === cat.id).map(ct => ct.team_id);
            const assignedTeams = teams.filter(t => catTeamIds.includes(t.id));
            const availableTeams = teams.filter(t => !catTeamIds.includes(t.id));

            return (
              <Card key={cat.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(cat)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(cat.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}

                  {/* Teams */}
                  <div>
                    <p className="text-xs font-medium mb-1.5">{t("chat.categories.responsibleTeams")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedTeams.map(team => (
                        <Badge key={team.id} variant="outline" className="text-xs gap-1">
                          {team.name}
                          <button onClick={() => removeTeamFromCategory(cat.id, team.id)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                      {availableTeams.length > 0 && (
                        <select className="text-xs border rounded px-1.5 py-0.5 bg-background" value="" onChange={(e) => { if (e.target.value) addTeamToCategory(cat.id, e.target.value); }}>
                          <option value="">+ {t("chat.categories.addTeam")}</option>
                          {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Companies */}
                  <div>
                    <p className="text-xs font-medium mb-1.5">{t("chat.categories.companies")} ({catCompanies.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {catCompanies.map(comp => (
                        <Badge key={comp.id} variant="secondary" className="text-xs gap-1">
                          {comp.trade_name || comp.name}
                          <button onClick={() => unassignCompany(comp.id)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                      {unassigned.length > 0 && (
                        <select className="text-xs border rounded px-1.5 py-0.5 bg-background" value="" onChange={(e) => { if (e.target.value) assignCompany(e.target.value, cat.id); }}>
                          <option value="">+ {t("chat.categories.addCompany")}</option>
                          {unassigned.map(c => <option key={c.id} value={c.id}>{c.trade_name || c.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? t("chat.categories.edit") : t("chat.categories.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("chat.categories.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("chat.categories.namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("chat.categories.description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("chat.categories.color")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-28" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveCategory} disabled={!form.name.trim()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.categories.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("chat.categories.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={deleteCategory}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesTab;
