"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fetchUserDetails } from "@/lib/api";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDetailsElement>(null);
  const gender = pathname.split("/")[2] === "female" ? "female" : "male";
  const [profile, setProfile] = useState<{ name?: string; profilePicUrl?: string; profilePic?: string; profilePicture?: string }>({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const appLinks = [
    ["Home", `/home/${gender}`],
    ["My requests", `/home/${gender}/requests`],
    ["Settings", `/home/${gender}/settings`],
    ["About App", `/home/${gender}/about`],
    ["Support", `/home/${gender}/support`],
  ];

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (userId) fetchUserDetails(userId).then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    const closeProfileMenu = (event: PointerEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        profileMenuRef.current.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", closeProfileMenu);
    return () => document.removeEventListener("pointerdown", closeProfileMenu);
  }, []);

  const profileImage = profile.profilePicUrl || profile.profilePic || profile.profilePicture;
  const initials = (profile.name || "STAG").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const handleLogout = () => {
    window.localStorage.removeItem("stag_access_token");
    window.localStorage.removeItem("stag_refresh_token");
    window.localStorage.removeItem("stag_user_id");
    router.replace("/");
  };

  return <div className="app-shell"><header className="app-header"><Link className="brand" href={`/home/${gender}`} aria-label="STAG home"><Image src="/assets/images/stag-logo.png" alt="STAG" width={132} height={39} priority /></Link><nav className="app-nav" aria-label="Application navigation">{appLinks.map(([label, href]) => <Link className={pathname === href ? "app-nav-active" : ""} key={href} href={href}>{label}</Link>)}</nav><details ref={profileMenuRef} className="profile-menu"><summary className="profile-trigger" aria-label="Open profile menu"><span className={`profile-avatar profile-avatar-${gender}`} style={profileImage ? { backgroundImage: `url(${profileImage})` } : undefined}>{profileImage ? "" : initials}</span><span className="profile-name">{profile.name ? `Hi, ${profile.name.split(" ")[0]}` : "Profile"}</span></summary><div className="profile-dropdown"><strong>{profile.name || "Your STAG profile"}</strong><Link href={`/home/${gender}/profile`}>Edit Profile</Link></div></details><button className="app-logout" type="button" onClick={() => setShowLogoutModal(true)}>Logout</button></header><main className="app-main">{children}</main>{showLogoutModal && <div className="action-modal-backdrop" role="presentation" onClick={() => setShowLogoutModal(false)}><section className="action-modal logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title" onClick={(event) => event.stopPropagation()}><p className="eyebrow">LOG OUT</p><h2 id="logout-title">Leave STAG for now?</h2><p className="action-modal-copy">You can sign back in whenever you are ready. Your profile and request history will remain saved.</p><div className="action-modal-buttons"><button className="button button-quiet" type="button" onClick={() => setShowLogoutModal(false)}>Stay signed in</button><button className="button button-primary" type="button" onClick={handleLogout}>Log out</button></div></section></div>}</div>;
}
