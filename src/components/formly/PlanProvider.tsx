import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
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
  const { user } = useAuth();
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
    if (data?.plan) setPlanState(data.plan as Plan);
    else {
      // create free row if missing
      await supabase.from("subscriptions").insert({ user_id: user.id, plan: "free" });
      setPlanState("free");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setPlan = async (p: Plan) => {
    if (!user) return;
    const { error } = await supabase
      .from("subscriptions")
      .upsert({ user_id: user.id, plan: p, status: "active" }, { onConflict: "user_id" });
    if (!error) setPlanState(p);
  };

  return (
    <PlanCtx.Provider value={{ plan, loading, limits: PLAN_LIMITS[plan], setPlan, refresh }}>
      {children}
    </PlanCtx.Provider>
  );
}

export function usePlan() {
  const v = useContext(PlanCtx);
  if (!v) throw new Error("usePlan must be used within PlanProvider");
  return v;
}