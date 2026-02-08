import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Pencil, Copy, UserPlus } from "lucide-react";
import UserPermissionsDialog from "@/components/UserPermissionsDialog";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface UserRole {
  user_id: string;
  role: string;
}

const TeamSettingsTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: profilesData }, { data: rolesData }] = await Promise.all([
      supabase.from("user_profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles((profilesData as UserProfile[]) ?? []);
    setRoles((rolesData as UserRole[]) ?? []);
    setLoading(false);
  };

  const getUserRoles = (userId: string) => {
    return roles.filter((r) => r.user_id === userId).map((r) => r.role);
  };

  const getRoleBadge = (userId: string) => {
    const userRoles = getUserRoles(userId);
    if (userRoles.includes("admin")) {
      return <Badge variant="default"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    if (userRoles.includes("attendant")) {
      return <Badge variant="secondary">{t("team.role.attendant")}</Badge>;
    }
    return <Badge variant="outline">{t("team.role.user")}</Badge>;
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/auth`;
    navigator.clipboard.writeText(link);
    toast({ title: t("team.linkCopied") });
  };

  const handleEditPermissions = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setDialogOpen(true);
  };

  const initials = (profile: UserProfile) => {
    if (profile.display_name) return profile.display_name.slice(0, 2).toUpperCase();
    return profile.email.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("team.title")}</CardTitle>
              <CardDescription>{t("team.subtitle")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyInviteLink}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t("team.inviteUser")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("team.noUsers")}
            </p>
          ) : (
            <div className="space-y-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url ?? undefined} />
                      <AvatarFallback>{initials(profile)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {profile.display_name || profile.email.split("@")[0]}
                        </span>
                        {getRoleBadge(profile.user_id)}
                        {!profile.is_active && (
                          <Badge variant="destructive" className="text-xs">
                            {t("team.inactive")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditPermissions(profile)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {t("team.editPermissions")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserPermissionsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={selectedProfile}
        onSaved={loadData}
      />
    </>
  );
};

export default TeamSettingsTab;
