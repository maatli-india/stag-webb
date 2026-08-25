"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";

const navLinks = [
  ["How it works", "/#how-it-works"],
  ["About", "/about"],
  ["FAQ", "/faq"],
  ["Contact", "/support"],
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="STAG home">
        <Image src="/assets/images/stag-logo.png" alt="STAG" width={176} height={52} priority />
      </Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {navLinks.map(([label, href]) => (
          <Link key={href} href={href}>{label}</Link>
        ))}
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <div className="header-actions">
        <Link className="button button-primary" href="/signup">Create account</Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <Link className="brand" href="/">
            <Image src="/assets/images/stag-logo.png" alt="STAG" width={176} height={52} />
          </Link>
          <p className="footer-copy">Club entry, handled with clarity. STAG is a product by Maatli Tech Private Limited.</p>
        </div>
        <div className="footer-links">
          <div>
            <span>Explore</span>
            <Link href="/about">About STAG</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/support">Support</Link>
            <Link href="/#how-it-works">How it works</Link>
          </div>
          <div>
            <span>Legal</span>
            <Link href="/terms">Terms & conditions</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/child-safety">Child safety</Link>
          </div>
          <div>
            <span>Start here</span>
            <Link href="/signup">Create account</Link>
            <Link href="/support">Contact support</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} STAG. All rights reserved.</span>
        <span>Adults 18+ only.</span>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAuthenticatedRoute = pathname.startsWith("/home/");
  const isEmbeddedLegal = ["/terms", "/privacy", "/child-safety"].includes(pathname) && searchParams.get("embedded") === "1";
  if (isEmbeddedLegal) return <main className="embedded-terms">{children}</main>;
  return isAuthenticatedRoute ? <AuthShell>{children}</AuthShell> : <><SiteHeader /><main>{children}</main><SiteFooter /></>;
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="page-intro content-width">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lede">{description}</p>
    </section>
  );
}
