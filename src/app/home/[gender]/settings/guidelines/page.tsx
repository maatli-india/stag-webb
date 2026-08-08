import Link from "next/link";
import TermsPage from "@/app/terms/page";

export default function SettingsGuidelinesPage() {
  return <><div className="content-width settings-legal-back"><Link className="text-link" href="../"><span>←</span> Back to settings</Link></div><TermsPage /></>;
}