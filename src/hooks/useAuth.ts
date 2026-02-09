import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserPermission {
  module: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

interface UseAuthReturn {
  user: User | null;
  isAdmin: boolean;
  isChatEnabled: boolean;
  loading: boolean;
  tenantId: string | null;
  permissions: UserPermission[];
  hasPermission: (module: string, action: 'view' | 'edit' | 'delete' | 'manage') => boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hasPermission = useCallback(
    (module: string, action: 'view' | 'edit' | 'delete' | 'manage'): boolean => {
      if (isAdmin) return true;
      const perm = permissions.find((p) => p.module === module);
      if (!perm) return false;
      if (perm.can_manage) return true;
      switch (action) {
        case 'view':
          return perm.can_view;
        case 'edit':
          return perm.can_edit;
        case 'delete':
          return perm.can_delete;
        case 'manage':
          return perm.can_manage;
        default:
          return false;
      }
    },
    [isAdmin, permissions]
  );

  useEffect(() => {
    const fetchUserAndRoles = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Check admin role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id);

        const adminStatus = roles?.some((r) => r.role === "admin") ?? false;
        setIsAdmin(adminStatus);

        // Check if CSM with chat enabled
        const { data: csm } = await supabase
          .from("csms")
          .select("is_chat_enabled")
          .eq("user_id", currentUser.id)
          .eq("is_chat_enabled", true)
          .maybeSingle();

        setIsChatEnabled(!!csm);

        // Load granular permissions
        if (!adminStatus) {
          const { data: perms } = await supabase
            .from("user_permissions")
            .select("module, can_view, can_edit, can_delete, can_manage")
            .eq("user_id", currentUser.id);

          setPermissions((perms as UserPermission[]) ?? []);
        } else {
          setPermissions([]);
        }

        // Load tenant_id from profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("tenant_id")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        setTenantId(profile?.tenant_id ?? null);

        // Upsert user profile
        await supabase.from("user_profiles").upsert(
          {
            user_id: currentUser.id,
            email: currentUser.email ?? "",
            display_name: currentUser.user_metadata?.display_name || currentUser.email?.split("@")[0] || "",
            last_sign_in_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }

      setLoading(false);
    };

    fetchUserAndRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIsAdmin(false);
        setIsChatEnabled(false);
        setPermissions([]);
        setTenantId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isAdmin, isChatEnabled, loading, tenantId, permissions, hasPermission };
}
