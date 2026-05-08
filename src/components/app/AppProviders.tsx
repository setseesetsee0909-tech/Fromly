"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@/components/formly/I18nProvider";
import { ThemeProvider } from "@/components/formly/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        {children}
        <Toaster richColors position="top-right" />
      </I18nProvider>
    </ThemeProvider>
  );
}
