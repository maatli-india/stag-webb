import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "STAG | Club entry, handled with clarity",
  description: "STAG helps adults discover events, make plans, and connect with people who want to attend together.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Suspense fallback={<main /> }><SiteShell>{children}</SiteShell></Suspense></body>
    </html>
  );
}
