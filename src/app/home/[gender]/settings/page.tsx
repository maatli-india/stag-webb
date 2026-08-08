import Link from "next/link";
import SettingsContent from "./settings-content";

export default async function SettingsPage({ params }: { params: Promise<{ gender: string }> }) {
  const { gender } = await params;
  return <section className="app-placeholder content-width profile-options-page"><Link className="text-link venue-back-link" href={`/home/${gender}`}><span>←</span> Back to home</Link><header className="app-option-heading"><p className="eyebrow">SETTINGS</p><h1>Safety and account controls.</h1><p className="lede">Manage the rules, privacy information, and safety resources that guide your STAG experience.</p></header><SettingsContent gender={gender} /></section>;
}