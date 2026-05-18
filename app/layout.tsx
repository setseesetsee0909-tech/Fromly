import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../src/styles.css";
import { AppProviders } from "@/components/app/AppProviders";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Formly",
  description: "Create, share, and analyze surveys with Formly.",
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
