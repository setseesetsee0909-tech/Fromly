"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";

interface Ctx {
  plan: Plan;
  loading: boolean;
  limits: typeof PLAN_LIMITS["free"];
  setPlan: (p: Plan) => Promise<void>;
  refresh: () => Promise<void>;
}

const PlanCtx = createContext<Ctx | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [plan, setPlanState] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPlanState("free");
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.plan) {
      setPlanState(data.plan as Plan);
    } else {
      setPlanState("free");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setPlan = useCallback(async (p: Plan) => {
    if (!session?.access_token) {
      throw new Error("Missing signed-in session.");
    }

    const response = await fetch("/api/billing/change-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan: p }),
    });

    const data = (await response.json()) as { error?: string; plan?: Plan };
    if (!response.ok) {
      throw new Error(data.error || "Unable to update subscription.");
    }

    setPlanState(data.plan ?? p);
  }, [session]);

  const value = useMemo<Ctx>(
    () => ({ plan, loading, limits: PLAN_LIMITS[plan], setPlan, refresh }),
    [loading, plan, refresh, setPlan],
  );

  return (
    <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>
  );
}

export function usePlan() {
  const v = useContext(PlanCtx);
  if (!v) throw new Error("usePlan must be used within PlanProvider");
  return v;
}
