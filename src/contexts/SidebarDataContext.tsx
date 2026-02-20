import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TeamAttendant {
  id: string;
  display_name: string;
  active_count: number;
  user_id: string;
  status: string | null;
}

interface SidebarDataContextType {
  teamAttendants: TeamAttendant[];
  totalActiveChats: number;
  unassignedCount: number;
  initialized: boolean;
}

const SidebarDataContext = createContext<SidebarDataContextType | undefined>(undefined);

export function SidebarDataProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [teamAttendants, setTeamAttendants] = useState<TeamAttendant[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [initialized, setInitialized] = useState(false);
  // Track which user we initialized for, to re-init on user change
  const initializedForRef = useRef<string | null>(null);

  const totalActiveChats = teamAttendants.reduce((sum, a) => sum + a.active_count, 0) + unassignedCount;

  // One-time initial fetch — builds the baseline state
  const initializeData = useCallback(async (userId: string, adminStatus: boolean) => {
    const { data: myProfile } = await supabase
      .from("attendant_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let attendants: any[] = [];
    if (adminStatus) {
      const { data } = await supabase
        .from("attendant_profiles")
        .select("id, display_name, user_id, status");
      attendants = data ?? [];
    } else if (myProfile) {
      const { data: myTeams } = await supabase
        .from("chat_team_members")
        .select("team_id")
        .eq("attendant_id", myProfile.id);
      if (myTeams && myTeams.length > 0) {
        const teamIds = myTeams.map((t: any) => t.team_id);
        const { data: teamMembers } = await supabase
          .from("chat_team_members")
          .select("attendant_id")
          .in("team_id", teamIds);
        const uniqueIds = [...new Set((teamMembers ?? []).map((m: any) => m.attendant_id))];
        if (uniqueIds.length > 0) {
          const { data } = await supabase
            .from("attendant_profiles")
            .select("id, display_name, user_id, status")
            .in("id", uniqueIds);
          attendants = data ?? [];
        }
      } else {
        const { data } = await supabase
          .from("attendant_profiles")
          .select("id, display_name, user_id, status")
          .eq("user_id", userId);
        attendants = data ?? [];
      }
    }

    // Fetch active room counts in one query (including unassigned)
    const { data: allActiveRooms } = await supabase
      .from("chat_rooms")
      .select("attendant_id")
      .in("status", ["active", "waiting"]);

    let counts: Record<string, number> = {};
    let unassigned = 0;
    (allActiveRooms ?? []).forEach((r: any) => {
      if (r.attendant_id) {
        counts[r.attendant_id] = (counts[r.attendant_id] || 0) + 1;
      } else {
        unassigned++;
      }
    });
    setUnassignedCount(unassigned);

    const sorted = attendants
      .map((a: any) => ({
        id: a.id,
        display_name: a.display_name,
        user_id: a.user_id,
        active_count: counts[a.id] || 0,
        status: a.status ?? null,
      }))
      .sort((a, b) => {
        if (a.user_id === userId) return -1;
        if (b.user_id === userId) return 1;
        return a.display_name.localeCompare(b.display_name);
      });

    setTeamAttendants(sorted);
    setInitialized(true);
    initializedForRef.current = userId;
  }, []);

  // Surgical patch handlers — no HTTP requests, just state updates
  const handleRoomChange = useCallback((payload: any) => {
    const { eventType, new: newRoom, old: oldRoom } = payload;

    if (eventType === "INSERT") {
      if (newRoom.status === "active" || newRoom.status === "waiting") {
        if (newRoom.attendant_id) {
          setTeamAttendants(prev => prev.map(a =>
            a.id === newRoom.attendant_id
              ? { ...a, active_count: a.active_count + 1 }
              : a
          ));
        } else {
          setUnassignedCount(prev => prev + 1);
        }
      }
    }

    if (eventType === "UPDATE") {
      // Room closed → decrement previous owner
      if (newRoom.status === "closed" && oldRoom.status !== "closed") {
        if (oldRoom.attendant_id) {
          setTeamAttendants(prev => prev.map(a =>
            a.id === oldRoom.attendant_id
              ? { ...a, active_count: Math.max(0, a.active_count - 1) }
              : a
          ));
        } else {
          setUnassignedCount(prev => Math.max(0, prev - 1));
        }
      }
      // Room reassigned → adjust both sides
      if (newRoom.attendant_id !== oldRoom.attendant_id && newRoom.status !== "closed") {
        // Decrement old owner
        if (oldRoom.attendant_id) {
          setTeamAttendants(prev => prev.map(a =>
            a.id === oldRoom.attendant_id
              ? { ...a, active_count: Math.max(0, a.active_count - 1) }
              : a
          ));
        } else if (oldRoom.status !== "closed") {
          setUnassignedCount(prev => Math.max(0, prev - 1));
        }
        // Increment new owner
        if (newRoom.attendant_id) {
          setTeamAttendants(prev => prev.map(a =>
            a.id === newRoom.attendant_id
              ? { ...a, active_count: a.active_count + 1 }
              : a
          ));
        } else {
          setUnassignedCount(prev => prev + 1);
        }
      }
    }

    if (eventType === "DELETE") {
      if (oldRoom.status !== "closed") {
        if (oldRoom.attendant_id) {
          setTeamAttendants(prev => prev.map(a =>
            a.id === oldRoom.attendant_id
              ? { ...a, active_count: Math.max(0, a.active_count - 1) }
              : a
          ));
        } else {
          setUnassignedCount(prev => Math.max(0, prev - 1));
        }
      }
    }
  }, []);

  const handleAttendantChange = useCallback((payload: any) => {
    const updated = payload.new as any;
    if (!updated) return;

    if (payload.eventType === "INSERT") {
      // New attendant added — append if not already present
      setTeamAttendants(prev => {
        if (prev.find(a => a.id === updated.id)) return prev;
        return [...prev, {
          id: updated.id,
          display_name: updated.display_name,
          user_id: updated.user_id,
          active_count: 0,
          status: updated.status ?? null,
        }];
      });
    } else if (payload.eventType === "UPDATE") {
      setTeamAttendants(prev => prev.map(a =>
        a.id === updated.id
          ? { ...a, status: updated.status, display_name: updated.display_name }
          : a
      ));
    } else if (payload.eventType === "DELETE") {
      setTeamAttendants(prev => prev.filter(a => a.id !== payload.old?.id));
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      // User logged out — reset state
      setTeamAttendants([]);
      setInitialized(false);
      initializedForRef.current = null;
      return;
    }

    // Only re-initialize when the user actually changes
    if (initializedForRef.current !== user.id) {
      setInitialized(false);
      initializeData(user.id, isAdmin);
    }

    // Permanent Realtime channels — created once, never destroyed during navigation
    const roomsChannel = supabase
      .channel("global-sidebar-chat-rooms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        handleRoomChange
      )
      .subscribe();

    const attendantsChannel = supabase
      .channel("global-sidebar-attendants")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendant_profiles" },
        handleAttendantChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(attendantsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]);

  return (
    <SidebarDataContext.Provider value={{ teamAttendants, totalActiveChats, unassignedCount, initialized }}>
      {children}
    </SidebarDataContext.Provider>
  );
}

export function useSidebarData(): SidebarDataContextType {
  const context = useContext(SidebarDataContext);
  if (!context) {
    throw new Error("useSidebarData must be used within SidebarDataProvider");
  }
  return context;
}
