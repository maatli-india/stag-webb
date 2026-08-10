"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchUserLedger, LedgerItem } from "@/lib/api";

const periods = [
  ["week", "Last week"],
  ["month", "Last month"],
  ["year", "Last year"],
  ["all", "All time"],
] as const;

function formatAmount(amount: number) {
  return `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function typeLabel(item: LedgerItem) {
  if (item.type === "EARNING") return "Entry earning";
  if (item.type === "PAYOUT") return "Bank payout";
  if (item.metadata?.reason?.toLowerCase().includes("cancellation")) return "Cancellation deduction";
  return "Deduction";
}

export default function EarningsPage() {
  const params = useParams<{ gender: string }>();
  const gender = params.gender?.toLowerCase() === "female" ? "female" : "male";
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [lifetimeEarnings, setLifetimeEarnings] = useState<number | null>(null);
  const [period, setPeriod] = useState<(typeof periods)[number][0]>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchUserLedger(userId, 1, 50).then((response) => {
      const body = (response as LedgerResponseLike).data || response;
      setItems(body.items || []);
      setLifetimeEarnings((response as LedgerResponseLike).summary?.totalEarning ?? body.summary?.totalEarning ?? null);
    }).catch(() => setError("We could not load your earnings right now. Please try again.")).finally(() => setLoading(false));
  }, []);

  const visibleItems = useMemo(() => {
    const sorted = [...items].sort((first, second) => new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime());
    if (period === "all") return sorted;
    const past = new Date();
    if (period === "week") past.setDate(past.getDate() - 7);
    if (period === "month") past.setMonth(past.getMonth() - 1);
    if (period === "year") past.setFullYear(past.getFullYear() - 1);
    return sorted.filter((item) => new Date(item.createdAt || 0) >= past);
  }, [items, period]);

  const stats = visibleItems.reduce((result, item) => {
    const amount = Number(item.finalAmount) || 0;
    if (item.type === "EARNING") { result.earned += amount; result.entries += 1; if (item.settlementStatus === "PENDING") result.pending += amount; }
    if (item.type === "PAYOUT") result.paid += amount;
    if (item.type === "PENALTY") result.deductions += Math.abs(amount);
    return result;
  }, { earned: 0, paid: 0, pending: 0, deductions: 0, entries: 0 });

  return <section className="app-placeholder content-width profile-options-page earnings-page"><Link className="text-link venue-back-link" href={`/home/${gender}/payments`}><span>←</span> Back to my payments</Link><header className="app-option-heading"><p className="eyebrow">MY EARNINGS</p><h1>Every entry, accounted for.</h1><p className="lede">View your processed earnings, bank payouts, pending amounts, and deductions.</p></header>{loading ? <div className="empty-panel"><span>Loading your earnings...</span></div> : error ? <p className="form-message form-error" role="alert">{error}</p> : <><div className="earnings-periods" role="tablist" aria-label="Earnings period">{periods.map(([key, label]) => <button className={period === key ? "earnings-period-active" : ""} key={key} type="button" role="tab" aria-selected={period === key} onClick={() => setPeriod(key)}>{label}</button>)}</div>{lifetimeEarnings !== null && <p className="earnings-lifetime">Lifetime earnings: <strong>{formatAmount(lifetimeEarnings)}</strong></p>}<section className="earnings-hero"><p>You earned {period === "all" ? "overall" : `this ${period}`}</p><strong>{formatAmount(stats.earned)}</strong><span>{stats.entries} {stats.entries === 1 ? "club entry" : "club entries"} completed</span></section><div className="earnings-stats"><div><strong>{formatAmount(stats.paid)}</strong><span>Paid to bank</span></div><div><strong>{formatAmount(stats.pending)}</strong><span>Pending</span></div><div><strong>{formatAmount(stats.deductions)}</strong><span>Deductions</span></div></div><h2 className="earnings-activity-heading">Earnings activity</h2><div className="earnings-activity">{visibleItems.length ? visibleItems.map((item, index) => <article className={`earnings-row earnings-row-${item.type?.toLowerCase()}`} key={`${item.id || "item"}-${index}`}><span className="earnings-row-icon">{item.type === "PENALTY" ? "↓" : "↑"}</span><div><strong>{typeLabel(item)}</strong><small>{formatDate(item.createdAt)}{item.type === "PAYOUT" ? ` · ${item.settlementStatus === "PENDING" ? "Being processed" : "Sent to bank"}` : ""}</small></div><b>{item.type === "PENALTY" ? "-" : "+"}{formatAmount(Math.abs(Number(item.finalAmount) || 0))}</b></article>) : <div className="empty-panel"><strong>{items.length ? "No activity for this period" : "No earnings yet"}</strong><span>Completed club entries and bank payouts will appear here.</span></div>}</div></>}</section>;
}

type LedgerResponseLike = { data?: { items?: LedgerItem[]; summary?: { totalEarning?: number } }; summary?: { totalEarning?: number } };