import type { ReactNode } from "react";
import { AuthProvider } from "@/components/formly/AuthProvider";
import { PlanProvider } from "@/components/formly/PlanProvider";
import { AppShell } from "@/routes/_app";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PlanProvider>
        <AppShell>{children}</AppShell>
      </PlanProvider>
    </AuthProvider>
  );
}
