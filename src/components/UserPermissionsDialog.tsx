import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, ShieldCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SPECIALTIES = ["implementacao", "onboarding", "acompanhamento", "churn"];

interface UserProfile {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  phone?: string | null;
  department?: string | null;
  specialty?: string[] | null;
}

interface Permission {
  module: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

// ─── Permission Tree Definition ───────────────────────────────────────────────
// Each node represents a permission group. Children are sub-permissions.
// "actions" controls which toggles are shown for that row.

type Action = "view" | "edit" | "delete" | "manage";

interface PermNode {
  key: string;
  labelKey: string;
  actions: Action[];
  children?: PermNode[];
}

const PERMISSION_TREE: PermNode[] = [
  {
    key: "cs",
    labelKey: "team.module.cs",
    actions: ["view", "edit", "delete", "manage"],
    children: [
      { key: "cs.kanban",           labelKey: "team.submodule.cs.kanban",           actions: ["view", "edit"] },
      { key: "cs.trails",           labelKey: "team.submodule.cs.trails",           actions: ["view", "edit", "delete"] },
      { key: "cs.reports.health",   labelKey: "team.submodule.cs.reports.health",   actions: ["view"] },
      { key: "cs.reports.churn",    labelKey: "team.submodule.cs.reports.churn",    actions: ["view"] },
      { key: "cs.reports.financial",labelKey: "team.submodule.cs.reports.financial",actions: ["view"] },
    ],
  },
  {
    key: "nps",
    labelKey: "team.module.nps",
    actions: ["view", "edit", "delete", "manage"],
    children: [
      { key: "nps.dashboard",  labelKey: "team.submodule.nps.dashboard",  actions: ["view"] },
      { key: "nps.campaigns",  labelKey: "team.submodule.nps.campaigns",  actions: ["view", "edit", "delete"] },
      { key: "nps.settings",   labelKey: "team.submodule.nps.settings",   actions: ["view", "manage"] },
    ],
  },
  {
    key: "chat",
    labelKey: "team.module.chat",
    actions: ["view", "edit", "delete", "manage"],
    children: [
      { key: "chat.workspace",            labelKey: "team.submodule.chat.workspace",            actions: ["view"] },
      { key: "chat.history",              labelKey: "team.submodule.chat.history",              actions: ["view"] },
      { key: "chat.banners",              labelKey: "team.submodule.chat.banners",              actions: ["view", "edit", "delete", "manage"] },
      { key: "chat.reports",              labelKey: "team.submodule.chat.reports",              actions: ["view"] },
      { key: "chat.settings.general",     labelKey: "team.submodule.chat.settings.general",     actions: ["view", "manage"] },
      { key: "chat.settings.widget",      labelKey: "team.submodule.chat.settings.widget",      actions: ["view", "manage"] },
      { key: "chat.settings.macros",      labelKey: "team.submodule.chat.settings.macros",      actions: ["view", "edit", "delete"] },
      { key: "chat.settings.attendants",  labelKey: "team.submodule.chat.settings.attendants",  actions: ["view", "manage"] },
      { key: "chat.settings.teams",       labelKey: "team.submodule.chat.settings.teams",       actions: ["view", "manage"] },
      { key: "chat.settings.categories",  labelKey: "team.submodule.chat.settings.categories",  actions: ["view", "manage"] },
      { key: "chat.settings.apikeys",     labelKey: "team.submodule.chat.settings.apikeys",     actions: ["view", "manage"] },
    ],
  },
  {
    key: "contacts",
    labelKey: "team.module.contacts",
    actions: ["view", "edit", "delete"],
    children: [
      { key: "contacts.companies", labelKey: "team.submodule.contacts.companies", actions: ["view", "edit", "delete"] },
      { key: "contacts.people",    labelKey: "team.submodule.contacts.people",    actions: ["view", "edit", "delete"] },
    ],
  },
  {
    key: "settings",
    labelKey: "team.module.settings",
    actions: ["view", "manage"],
    children: [
      { key: "settings.team",         labelKey: "team.submodule.settings.team",         actions: ["view", "manage"] },
      { key: "settings.organization", labelKey: "team.submodule.settings.organization", actions: ["view", "manage"] },
      { key: "settings.apikeys",      labelKey: "team.submodule.settings.apikeys",      actions: ["view", "manage"] },
    ],
  },
  {
    key: "help",
    labelKey: "team.module.help",
    actions: ["view", "edit", "delete", "manage"],
    children: [
      { key: "help.articles",    labelKey: "team.submodule.help.articles",    actions: ["view", "edit", "delete", "manage"] },
      { key: "help.collections", labelKey: "team.submodule.help.collections", actions: ["view", "edit", "delete"] },
      { key: "help.settings",    labelKey: "team.submodule.help.settings",    actions: ["view", "manage"] },
      { key: "help.analytics",   labelKey: "team.submodule.help.analytics",   actions: ["view"] },
      { key: "help.import",      labelKey: "team.submodule.help.import",      actions: ["manage"] },
    ],
  },
];

// All unique module keys (parent + children)
const ALL_MODULE_KEYS: string[] = [];
PERMISSION_TREE.forEach((g) => {
  ALL_MODULE_KEYS.push(g.key);
  g.children?.forEach((c) => ALL_MODULE_KEYS.push(c.key));
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
  onSaved: () => void;
}

// ─── Tiny PermRow component ────────────────────────────────────────────────────
function PermRow({
  node,
  perm,
  isAdminToggle,
  onToggle,
  isChild,
}: {
  node: PermNode;
  perm: Permission;
  isAdminToggle: boolean;
  onToggle: (module: string, field: keyof Permission) => void;
  isChild?: boolean;
}) {
  const { t } = useLanguage();
  const ALL_ACTIONS: Action[] = ["view", "edit", "delete", "manage"];
  const fieldMap: Record<Action, keyof Permission> = {
    view: "can_view",
    edit: "can_edit",
    delete: "can_delete",
    manage: "can_manage",
  };

  const isDisabled = (action: Action): boolean => {
    if (isAdminToggle) return true;
    if (action === "edit" || action === "delete") return !perm.can_view;
    return false;
  };

  const isChecked = (action: Action): boolean => {
    if (isAdminToggle) return true;
    return perm[fieldMap[action]] as boolean;
  };

  return (
    <div className={cn(
      "grid items-center gap-2 py-2 px-3 rounded-md",
      isChild ? "grid-cols-[1fr_auto_auto_auto_auto] ml-4 border-l-2 border-sidebar-border bg-muted/20" : "grid-cols-[1fr_auto_auto_auto_auto] border rounded-md"
    )}>
      <span className={cn("text-sm", isChild ? "text-muted-foreground" : "font-medium")}>
        {isChild && <span className="mr-1 text-muted-foreground/40">└</span>}
        {t(node.labelKey)}
      </span>
      {ALL_ACTIONS.map((action) => {
        const isRelevant = node.actions.includes(action);
        return (
          <div key={action} className="flex justify-center w-10">
            {isRelevant ? (
              <Switch
                checked={isChecked(action)}
                onCheckedChange={() => onToggle(node.key, fieldMap[action])}
                disabled={isDisabled(action)}
                className="scale-75"
              />
            ) : (
              <div className="w-9 h-5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────
export default function UserPermissionsDialog({ open, onOpenChange, profile, onSaved }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isAdminToggle, setIsAdminToggle] = useState(false);
  const [permissions, setPermissions] = useState<Map<string, Permission>>(new Map());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // CS fields
  const [csPhone, setCsPhone] = useState("");
  const [csDepartment, setCsDepartment] = useState("");
  const [csSpecialty, setCsSpecialty] = useState<string[]>([]);

  useEffect(() => {
    if (open && profile) loadData();
  }, [open, profile]);

  const loadData = async () => {
    if (!profile || !profile.user_id) return;
    setLoading(true);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.user_id);
    setIsAdminToggle(roles?.some((r) => r.role === "admin") ?? false);

    const { data: perms } = await supabase
      .from("user_permissions")
      .select("module, can_view, can_edit, can_delete, can_manage")
      .eq("user_id", profile.user_id);

    const permMap = new Map<string, Permission>();
    // Initialize all known modules with defaults
    ALL_MODULE_KEYS.forEach((key) => {
      permMap.set(key, { module: key, can_view: false, can_edit: false, can_delete: false, can_manage: false });
    });
    // Overlay with actual data from DB
    (perms ?? []).forEach((p) => {
      permMap.set(p.module, {
        module: p.module,
        can_view: p.can_view ?? false,
        can_edit: p.can_edit ?? false,
        can_delete: p.can_delete ?? false,
        can_manage: p.can_manage ?? false,
      });
    });
    setPermissions(permMap);

    setCsPhone(profile.phone || "");
    setCsDepartment(profile.department || "");
    setCsSpecialty(profile.specialty || []);
    setLoading(false);
  };

  const togglePerm = (module: string, field: keyof Permission) => {
    setPermissions((prev) => {
      const next = new Map(prev);
      const cur = next.get(module) ?? { module, can_view: false, can_edit: false, can_delete: false, can_manage: false };
      const updated = { ...cur, [field]: !cur[field] };

      // Logic: enabling manage → enable view/edit/delete
      if (field === "can_manage" && updated.can_manage) {
        updated.can_view = true;
        updated.can_edit = true;
        updated.can_delete = true;
      }
      // Logic: disabling view → disable edit/delete/manage
      if (field === "can_view" && !updated.can_view) {
        updated.can_edit = false;
        updated.can_delete = false;
        updated.can_manage = false;
      }

      next.set(module, updated);
      return next;
    });
  };

  // Enable/disable all children of a parent group
  const toggleGroupAll = (group: PermNode, enable: boolean) => {
    setPermissions((prev) => {
      const next = new Map(prev);
      const keysToSet = [group.key, ...(group.children ?? []).map((c) => c.key)];
      keysToSet.forEach((key) => {
        const cur = next.get(key) ?? { module: key, can_view: false, can_edit: false, can_delete: false, can_manage: false };
        if (enable) {
          next.set(key, { ...cur, can_view: true });
        } else {
          next.set(key, { ...cur, can_view: false, can_edit: false, can_delete: false, can_manage: false });
        }
      });
      return next;
    });
  };

  const toggleCsSpecialty = (spec: string) => {
    setCsSpecialty((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleSave = async () => {
    if (!profile || !profile.user_id) return;
    setSaving(true);

    try {
      // Admin role
      const { data: currentRoles } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", profile.user_id)
        .eq("role", "admin");

      const hasAdmin = (currentRoles?.length ?? 0) > 0;
      if (isAdminToggle && !hasAdmin) {
        await supabase.from("user_roles").insert({ user_id: profile.user_id, role: "admin" as const });
      } else if (!isAdminToggle && hasAdmin) {
        await supabase.from("user_roles").delete().eq("user_id", profile.user_id).eq("role", "admin");
      }

      // Upsert all permissions (including sub-permissions)
      const permsArray = Array.from(permissions.values());
      for (const perm of permsArray) {
        await supabase.from("user_permissions").upsert(
          {
            user_id: profile.user_id,
            module: perm.module,
            can_view: perm.can_view,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
            can_manage: perm.can_manage,
          },
          { onConflict: "user_id,module" }
        );
      }

      // Update CS fields on user_profiles
      await supabase
        .from("user_profiles")
        .update({ phone: csPhone || null, department: csDepartment || null, specialty: csSpecialty } as any)
        .eq("id", profile.id);

      // Sync with csms table — always create/update CSM so user can be enabled as attendant
      const { data: existingCsm } = await supabase
        .from("csms")
        .select("id")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (existingCsm) {
        await supabase.from("csms").update({
          phone: csPhone || null,
          department: csDepartment || null,
          specialty: csSpecialty,
          name: profile.display_name || profile.email.split("@")[0],
          email: profile.email,
        }).eq("id", existingCsm.id);
      } else {
        await supabase.from("csms").insert({
          user_id: profile.user_id,
          name: profile.display_name || profile.email.split("@")[0],
          email: profile.email,
          phone: csPhone || null,
          department: csDepartment || null,
          specialty: csSpecialty,
        });
      }

      toast({ title: t("team.saveSuccess") });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("team.saveError"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() ?? "?";

  const ALL_ACTIONS: Action[] = ["view", "edit", "delete", "manage"];

  // Check if a group has any permission active (for the group's "all enabled" indicator)
  const groupHasAnyView = (group: PermNode): boolean => {
    const parent = permissions.get(group.key);
    if (parent?.can_view) return true;
    return (group.children ?? []).some((c) => permissions.get(c.key)?.can_view);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("team.editPermissions")}</DialogTitle>
          <DialogDescription>{t("team.editPermissionsDesc")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* User info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile?.display_name || profile?.email}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <Separator />

            {/* Admin toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <Label htmlFor="admin-toggle" className="font-medium">{t("team.administrator")}</Label>
              </div>
              <Switch id="admin-toggle" checked={isAdminToggle} onCheckedChange={setIsAdminToggle} />
            </div>
            {isAdminToggle && (
              <Badge variant="secondary" className="text-xs">{t("team.adminFullAccess")}</Badge>
            )}

            <Separator />

            {/* CS Fields */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{t("team.csInfo")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("cs.csms.phone")}</Label>
                  <Input value={csPhone} onChange={(e) => setCsPhone(e.target.value)} placeholder={t("cs.csms.phonePlaceholder")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("cs.csms.department")}</Label>
                  <Input value={csDepartment} onChange={(e) => setCsDepartment(e.target.value)} placeholder={t("cs.csms.departmentPlaceholder")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("cs.csms.specialties")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALTIES.map((spec) => (
                    <div key={spec} className="flex items-center space-x-2">
                      <Checkbox id={`cs-${spec}`} checked={csSpecialty.includes(spec)} onCheckedChange={() => toggleCsSpecialty(spec)} />
                      <label htmlFor={`cs-${spec}`} className="text-sm cursor-pointer">{t(`cs.status.${spec}`)}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Module Permissions — Accordion */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t("team.modulePermissions")}</p>

              {/* Column header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 pb-1">
                <span>{t("team.module")}</span>
                {ALL_ACTIONS.map((a) => (
                  <span key={a} className="text-center w-10">{t(`team.perm.${a}`)}</span>
                ))}
              </div>

              <Accordion type="multiple" defaultValue={PERMISSION_TREE.map((g) => g.key)} className="space-y-1">
                {PERMISSION_TREE.map((group) => {
                  const parentPerm = permissions.get(group.key) ?? { module: group.key, can_view: false, can_edit: false, can_delete: false, can_manage: false };
                  const anyActive = groupHasAnyView(group);

                  return (
                    <AccordionItem key={group.key} value={group.key} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center">
                        {/* Toggle all button */}
                        <button
                          type="button"
                          onClick={() => !isAdminToggle && toggleGroupAll(group, !anyActive)}
                          disabled={isAdminToggle}
                          className={cn(
                            "px-2 py-1 text-[10px] font-medium rounded-sm m-1.5 transition-colors shrink-0",
                            anyActive || isAdminToggle
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          )}
                        >
                          {t("team.perm.enableAll")}
                        </button>

                        {/* Parent perm row inside trigger */}
                        <AccordionTrigger className="flex-1 px-2 py-2 hover:no-underline [&>svg]:ml-auto">
                          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center flex-1 mr-2">
                            <span className="text-sm font-semibold text-left">{t(group.labelKey)}</span>
                            {ALL_ACTIONS.map((action) => {
                              const isRelevant = group.actions.includes(action);
                              const fieldMap: Record<Action, keyof Permission> = { view: "can_view", edit: "can_edit", delete: "can_delete", manage: "can_manage" };
                              const isDisabled = isAdminToggle || (action !== "view" && action !== "manage" && !parentPerm.can_view);
                              return (
                                <div key={action} className="flex justify-center w-10">
                                  {isRelevant ? (
                                    <Switch
                                      checked={isAdminToggle || (parentPerm[fieldMap[action]] as boolean)}
                                      onCheckedChange={() => togglePerm(group.key, fieldMap[action])}
                                      onClick={(e) => e.stopPropagation()}
                                      disabled={isDisabled}
                                      className="scale-75"
                                    />
                                  ) : (
                                    <div className="w-9 h-5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </AccordionTrigger>
                      </div>

                      <AccordionContent className="pb-2 px-2">
                        <div className="space-y-1 pt-1">
                          {(group.children ?? []).map((child) => {
                            const childPerm = permissions.get(child.key) ?? { module: child.key, can_view: false, can_edit: false, can_delete: false, can_manage: false };
                            return (
                              <PermRow
                                key={child.key}
                                node={child}
                                perm={childPerm}
                                isAdminToggle={isAdminToggle}
                                onToggle={togglePerm}
                                isChild
                              />
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("team.cancel")}</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("team.save")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
