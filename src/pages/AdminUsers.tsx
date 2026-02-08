import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldX, Users } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "attendant";
}

const AdminUsers = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
      fetchRoles();
    };
    init();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_roles")
      .select("*")
      .order("role");

    setRoles((data as UserRole[]) ?? []);
    setLoading(false);
  };

  const addRole = async (userId: string, role: "admin" | "attendant") => {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (error) {
      if (error.code === "23505") {
        toast({ title: t("chat.users.already_has_role"), variant: "destructive" });
      } else {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: t("chat.users.role_added") });
      fetchRoles();
    }
  };

  const removeRole = async (roleId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("chat.users.role_removed") });
      fetchRoles();
    }
  };

  const adminRoles = roles.filter((r) => r.role === "admin");
  const attendantRoles = roles.filter((r) => r.role === "attendant");

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("chat.users.title")}</h1>
          <p className="text-muted-foreground">{t("chat.users.subtitle")}</p>
        </div>

        {/* Add current user as admin if no admins exist */}
        {!loading && adminRoles.length === 0 && currentUserId && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-sm mb-3">{t("chat.users.no_admins")}</p>
              <Button size="sm" onClick={() => addRole(currentUserId, "admin")}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t("chat.users.make_me_admin")}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t("chat.users.admins")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {adminRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("chat.users.no_users")}</p>
              ) : (
                <div className="space-y-3">
                  {adminRoles.map((r) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">admin</Badge>
                        <span className="text-sm font-mono">{r.user_id.slice(0, 12)}...</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRole(r.id)}
                      >
                        <ShieldX className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                {t("chat.users.attendants")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendantRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("chat.users.no_users")}</p>
              ) : (
                <div className="space-y-3">
                  {attendantRoles.map((r) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">attendant</Badge>
                        <span className="text-sm font-mono">{r.user_id.slice(0, 12)}...</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRole(r.id)}
                      >
                        <ShieldX className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default AdminUsers;
