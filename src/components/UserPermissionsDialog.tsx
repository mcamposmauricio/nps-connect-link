import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, ShieldCheck } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface Permission {
  module: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

const MODULES = [
  { key: "cs", labelKey: "team.module.cs" },
  { key: "nps", labelKey: "team.module.nps" },
  { key: "chat", labelKey: "team.module.chat" },
  { key: "contacts", labelKey: "team.module.contacts" },
  { key: "settings", labelKey: "team.module.settings" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
  onSaved: () => void;
}

export default function UserPermissionsDialog({ open, onOpenChange, profile, onSaved }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isAdminToggle, setIsAdminToggle] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && profile) {
      loadData();
    }
  }, [open, profile]);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.user_id);

    setIsAdminToggle(roles?.some((r) => r.role === "admin") ?? false);

    // Load permissions
    const { data: perms } = await supabase
      .from("user_permissions")
      .select("module, can_view, can_edit, can_delete, can_manage")
      .eq("user_id", profile.user_id);

    // Build full permissions array with defaults
    const permMap = new Map((perms ?? []).map((p) => [p.module, p]));
    const fullPerms = MODULES.map((m) => ({
      module: m.key,
      can_view: permMap.get(m.key)?.can_view ?? false,
      can_edit: permMap.get(m.key)?.can_edit ?? false,
      can_delete: permMap.get(m.key)?.can_delete ?? false,
      can_manage: permMap.get(m.key)?.can_manage ?? false,
    }));
    setPermissions(fullPerms);
    setLoading(false);
  };

  const togglePerm = (module: string, field: keyof Permission) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module !== module) return p;
        const updated = { ...p, [field]: !p[field] };
        // If manage is turned on, enable all
        if (field === "can_manage" && updated.can_manage) {
          updated.can_view = true;
          updated.can_edit = true;
          updated.can_delete = true;
        }
        // If view is turned off, disable all
        if (field === "can_view" && !updated.can_view) {
          updated.can_edit = false;
          updated.can_delete = false;
          updated.can_manage = false;
        }
        return updated;
      })
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      // Handle admin role
      const { data: currentRoles } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", profile.user_id)
        .eq("role", "admin");

      const hasAdmin = (currentRoles?.length ?? 0) > 0;

      if (isAdminToggle && !hasAdmin) {
        await supabase.from("user_roles").insert({
          user_id: profile.user_id,
          role: "admin" as const,
        });
      } else if (!isAdminToggle && hasAdmin && currentRoles) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", profile.user_id)
          .eq("role", "admin");
      }

      // Upsert permissions
      for (const perm of permissions) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("team.editPermissions")}</DialogTitle>
          <DialogDescription>{t("team.editPermissionsDesc")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
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
                <Label htmlFor="admin-toggle" className="font-medium">
                  {t("team.administrator")}
                </Label>
              </div>
              <Switch
                id="admin-toggle"
                checked={isAdminToggle}
                onCheckedChange={setIsAdminToggle}
              />
            </div>

            {isAdminToggle && (
              <Badge variant="secondary" className="text-xs">
                {t("team.adminFullAccess")}
              </Badge>
            )}

            <Separator />

            {/* Module permissions */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t("team.modulePermissions")}
              </p>

              {/* Header */}
              <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-1">
                <span className="col-span-1">{t("team.module")}</span>
                <span className="text-center">{t("team.perm.view")}</span>
                <span className="text-center">{t("team.perm.edit")}</span>
                <span className="text-center">{t("team.perm.delete")}</span>
                <span className="text-center">{t("team.perm.manage")}</span>
              </div>

              {MODULES.map((mod) => {
                const perm = permissions.find((p) => p.module === mod.key);
                if (!perm) return null;
                return (
                  <div
                    key={mod.key}
                    className="grid grid-cols-5 gap-2 items-center rounded-md border p-2"
                  >
                    <span className="text-sm font-medium col-span-1 truncate">
                      {t(mod.labelKey)}
                    </span>
                    <div className="flex justify-center">
                      <Switch
                        checked={isAdminToggle || perm.can_view}
                        onCheckedChange={() => togglePerm(mod.key, "can_view")}
                        disabled={isAdminToggle}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={isAdminToggle || perm.can_edit}
                        onCheckedChange={() => togglePerm(mod.key, "can_edit")}
                        disabled={isAdminToggle || !perm.can_view}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={isAdminToggle || perm.can_delete}
                        onCheckedChange={() => togglePerm(mod.key, "can_delete")}
                        disabled={isAdminToggle || !perm.can_view}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={isAdminToggle || perm.can_manage}
                        onCheckedChange={() => togglePerm(mod.key, "can_manage")}
                        disabled={isAdminToggle}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("team.cancel")}
              </Button>
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
