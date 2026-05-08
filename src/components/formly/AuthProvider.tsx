"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "user";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  roles: Role[];
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);

  const loadRoles = useCallback(async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((row) => row.role as Role));
  }, []);

  const syncBootstrapAdminRole = useCallback(async (session: Session) => {
    const response = await fetch("/api/auth/sync-role", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to sync admin role.");
    }

    const data = (await response.json()) as { synced?: boolean };
    return data.synced === true;
  }, []);

  const hydrateUserRoles = useCallback(
    async (session: Session) => {
      await loadRoles(session.user.id);

      try {
        const synced = await syncBootstrapAdminRole(session);
        if (synced) {
          await loadRoles(session.user.id);
        }
      } catch {
        // Keep the signed-in session usable even if bootstrap role sync fails.
      }
    },
    [loadRoles, syncBootstrapAdminRole],
  );

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          void hydrateUserRoles(s);
        }, 0);
      } else {
        setRoles([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void hydrateUserRoles(data.session);
      } else {
        setRoles([]);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [hydrateUserRoles]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      roles,
      isAdmin: roles.includes("admin"),
      signOut,
    }),
    [loading, roles, session, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
