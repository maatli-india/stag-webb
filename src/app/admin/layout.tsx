"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { decodeJwtRole } from "@/lib/api";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("stag_access_token");
    if (decodeJwtRole(token) !== "admin") {
      router.replace("/signup");
      return;
    }
    setChecked(true);
  }, [router]);

  const handleLogout = () => {
    window.localStorage.removeItem("stag_access_token");
    window.localStorage.removeItem("stag_refresh_token");
    window.localStorage.removeItem("stag_user_id");
    router.replace("/signup");
  };

  if (!checked) return null;

  const links: [string, string][] = [
    ["Dashboard", "/admin"],
    ["Events", "/admin/events"],
    ["Subscriptions", "/admin/subscriptions"],
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/admin" aria-label="STAG admin home">
          <span style={{ fontWeight: 700, letterSpacing: "0.08em" }}>
            STAG ADMIN
          </span>
        </Link>
        <nav className="app-nav" aria-label="Admin navigation">
          {links.map(([label, href]) => (
            <Link
              className={pathname === href ? "app-nav-active" : ""}
              key={href}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button className="app-logout" type="button" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
