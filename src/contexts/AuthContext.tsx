import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserPermission {
  module: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isChatEnabled: boolean;
  loading: boolean;
  userDataLoading: boolean;
  tenantId: string | null;
  permissions: UserPermission[];
  hasPermission: (module: string, action: 'view' | 'edit' | 'delete' | 'manage') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(false);

  const hasPermission = useCallback(
    (module: string, action: 'view' | 'edit' | 'delete' | 'manage'): boolean => {
      if (isAdmin) return true;
      const perm = permissions.find((p) => p.module === module);
      if (!perm) return false;
      if (perm.can_manage) return true;
      switch (action) {
        case 'view': return perm.can_view;
        case 'edit': return perm.can_edit;
        case 'delete': return perm.can_delete;
        case 'manage': return perm.can_manage;
        default: return false;
      }
    },
    [isAdmin, permissions]
  );

  const loadUserData = useCallback(async (currentUser: User) => {
    setUserDataLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id);

    const adminStatus = roles?.some((r) => r.role === "admin") ?? false;
    setIsAdmin(adminStatus);

    const { data: csm } = await supabase
      .from("csms")
      .select("is_chat_enabled")
      .eq("user_id", currentUser.id)
      .eq("is_chat_enabled", true)
      .maybeSingle();

    setIsChatEnabled(!!csm);

    if (!adminStatus) {
      const { data: perms } = await supabase
        .from("user_permissions")
        .select("module, can_view, can_edit, can_delete, can_manage")
        .eq("user_id", currentUser.id);
      setPermissions((perms as UserPermission[]) ?? []);
    } else {
      setPermissions([]);
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tenant_id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    setTenantId(profile?.tenant_id ?? null);

    await supabase.from("user_profiles").upsert(
      {
        user_id: currentUser.id,
        email: currentUser.email ?? "",
        display_name: currentUser.user_metadata?.display_name || currentUser.email?.split("@")[0] || "",
        last_sign_in_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    setUserDataLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await loadUserData(currentUser);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        // Use setTimeout to avoid Supabase auth deadlock, but track loading state
        setUserDataLoading(true);
        setTimeout(() => loadUserData(currentUser), 0);
      } else {
        setIsAdmin(false);
        setIsChatEnabled(false);
        setPermissions([]);
        setTenantId(null);
        setUserDataLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  return (
    <AuthContext.Provider value={{ user, isAdmin, isChatEnabled, loading, userDataLoading, tenantId, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
