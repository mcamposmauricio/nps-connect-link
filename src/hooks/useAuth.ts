import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UseAuthReturn {
  user: User | null;
  isAdmin: boolean;
  isChatEnabled: boolean;
  loading: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

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

        setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);

        // Check if CSM with chat enabled
        const { data: csm } = await supabase
          .from("csms")
          .select("is_chat_enabled")
          .eq("user_id", currentUser.id)
          .eq("is_chat_enabled", true)
          .maybeSingle();

        setIsChatEnabled(!!csm);
      }

      setLoading(false);
    };

    fetchUserAndRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIsAdmin(false);
        setIsChatEnabled(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isAdmin, isChatEnabled, loading };
}
