import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../src/styles.css";
import { AppProviders } from "@/components/app/AppProviders";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "UUNII Creation Hub",
  description: "Survey and creation hub powered by the existing TanStack app inside Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={plusJakartaSans.variable}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
