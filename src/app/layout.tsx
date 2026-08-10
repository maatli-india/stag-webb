import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "STAG | Club entry, handled with clarity",
  description: "STAG helps adults arrange verified club entry assistance with secure platform payments and clear confirmation steps.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Suspense fallback={<main /> }><SiteShell>{children}</SiteShell></Suspense></body>
    </html>
  );
}
