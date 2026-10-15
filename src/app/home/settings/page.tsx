"use client";

import Link from "next/link";
import { useGender } from "@/lib/hooks";
import SettingsContent from "./settings-content";

export default function SettingsPage() {
  const gender = useGender();
  return (
    <section className="app-placeholder content-width profile-options-page">
      <Link className="text-link venue-back-link" href="/home"><span>←</span> Back to home</Link>
      <header className="app-option-heading">
        <p className="eyebrow">SETTINGS</p>
        <h1>Safety and account controls.</h1>
        <p className="lede">Manage the rules, privacy information, and safety resources that guide your STAG experience.</p>
      </header>
      <SettingsContent gender={gender} />
    </section>
  );
}
