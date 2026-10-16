"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGender } from "@/lib/hooks";
import { ActiveRequest, fetchUserRequests } from "@/lib/api";

const terminalStatuses = "completed,verified,cancelled,canceled,expired";

export default function ClubEntriesPage() {
  const router = useRouter();
  const gender = useGender();
  const [entries, setEntries] = useState<ActiveRequest[]>([]);
  const [section, setSection] = useState<"completed" | "cancelled">("completed");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId) {
      router.replace("/signup");
      return;
    }
    fetchUserRequests(userId, { status: terminalStatuses, timeline: "all", limit: 250 })
      .then((response) => setEntries(response.items || []))
      .catch(() => setError("We could not load your club entries right now."))
      .finally(() => setLoading(false));
  }, [router]);

  const visibleEntries = useMemo(() => entries.filter((entry) => section === "completed" ? ["completed", "verified"].includes(entry.status || "") : ["cancelled", "canceled", "expired"].includes(entry.status || "")), [entries, section]);

  return <section className="app-placeholder content-width club-entries-page">
    <Link className="text-link venue-back-link" href={`/settings`}><span>←</span> Back to settings</Link>
    <header className="app-option-heading"><p className="eyebrow">MY CLUB ENTRIES</p><h1>Your entry history.</h1><p className="lede">Review the club entries you completed and the requests that were cancelled or expired.</p></header>
    {error && <p className="form-message form-error" role="alert">{error}</p>}
    <div className="entry-history-tabs" role="tablist"><button type="button" className={section === "completed" ? "entry-history-tab entry-history-tab-active" : "entry-history-tab"} onClick={() => setSection("completed")}>Completed</button><button type="button" className={section === "cancelled" ? "entry-history-tab entry-history-tab-active" : "entry-history-tab"} onClick={() => setSection("cancelled")}>Cancelled</button></div>
    {loading ? <div className="empty-panel"><span>Loading your entries...</span></div> : visibleEntries.length ? <div className="club-entry-list">{visibleEntries.map((entry, index) => <article className="club-entry-card" key={entry.id || index} role={entry.id ? "link" : undefined} tabIndex={entry.id ? 0 : -1} onClick={() => entry.id && router.push(`/requests/${encodeURIComponent(entry.id)}`)} onKeyDown={(event) => { if (entry.id && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); router.push(`/requests/${encodeURIComponent(entry.id)}`); } }}><div><p className="eyebrow">{entry.status || "ENTRY"}</p><h2>{entry.clubName || "Club entry"}</h2><span>{entry.datetime ? new Date(entry.datetime).toLocaleString("en-IN") : entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-IN") : "Date not available"}</span></div><strong>{entry.status === "verified" ? "Verified" : entry.status === "completed" ? "Completed" : "Closed"}</strong></article>)}</div> : <div className="empty-panel"><strong>{section === "completed" ? "No completed entries" : "No cancelled entries"}</strong><span>Your {section} club entries will appear here.</span></div>}
  </section>;
}
