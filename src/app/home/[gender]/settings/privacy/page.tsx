import Link from "next/link";
import PrivacyPage from "@/app/privacy/page";

export default function SettingsPrivacyPage() {
  return <><div className="content-width settings-legal-back"><Link className="text-link" href="../"><span>←</span> Back to settings</Link></div><PrivacyPage /></>;
}