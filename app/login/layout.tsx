import type { ReactNode } from "react";
import { AuthProvider } from "@/components/formly/AuthProvider";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
