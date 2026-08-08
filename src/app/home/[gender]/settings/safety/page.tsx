import Link from "next/link";
import ChildSafetyPage from "@/app/child-safety/page";

export default function SettingsSafetyPage() {
  return <><div className="content-width settings-legal-back"><Link className="text-link" href="../"><span>←</span> Back to settings</Link></div><ChildSafetyPage /></>;
}