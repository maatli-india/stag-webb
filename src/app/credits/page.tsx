"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGender } from "@/lib/hooks";
import { fetchUserSubscriptions, UserSubscription } from "@/lib/api";

export default function RequestCreditsPage() {
  const router = useRouter();
  const gender = useGender();
  const [data, setData] = useState<{ dailyAllowance?: number; dailyUsed?: number; live?: { items?: UserSubscription[] }; older?: { items?: UserSubscription[] } }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }
    if (!userId) {
      router.replace("/signup");
      return;
    }
    fetchUserSubscriptions(userId).then(setData).catch(() => setError("We could not load your request credits right now.")).finally(() => setLoading(false));
  }, [router]);

  const livePlans = data.live?.items || [];
  const olderPlans = data.older?.items || [];
  const plans = [...livePlans, ...olderPlans];
  const allowance = Number(data.dailyAllowance || 0);
  const used = Number(data.dailyUsed || 0);

  return <section className="app-placeholder content-width credits-page">
    <Link className="text-link venue-back-link" href={"/home"}><span>←</span> Back to home</Link>
    <header className="app-option-heading"><p className="eyebrow">REQUEST CREDITS</p><h1>Know your balance.</h1><p className="lede">Track your daily allowance and the request-credit plans connected to your account.</p></header>
    {error && <p className="form-message form-error" role="alert">{error}</p>}
    {loading ? <div className="empty-panel"><span>Loading your request credits...</span></div> : <>
      <div className="credits-overview"><div><span>USED TODAY</span><strong>{used}</strong><small>of {allowance} daily free requests</small></div><div><span>PLANS OWNED</span><strong>{plans.length}</strong><small>purchased plans</small></div><Link className="button button-primary" href={`/subscriptions`}>View subscription plans</Link></div>
      <section className="credits-section"><div className="rewards-section-heading"><div><p className="eyebrow">YOUR PLANS</p><h2>Purchased credits.</h2></div><span>{plans.length} total</span></div>{plans.length ? <div className="credit-plan-list">{plans.map((plan, index) => { const total = Math.max(Number(plan.creditCount || 0), 0); const left = Math.max(Number(plan.creditsLeft || 0), 0); const consumed = Math.min(Math.max(total - left, 0), total); return <article className={`credit-plan ${index >= livePlans.length ? "credit-plan-old" : ""}`} key={plan.id || plan.planId || index}><div className="credit-plan-top"><div><h3>{plan.name || "Request credit plan"}</h3><p>{plan.neverExpires || !plan.expiresAt ? "No expiry" : `Valid until ${new Date(plan.expiresAt).toLocaleDateString("en-IN")}`}</p></div><strong>{plan.status === "exhausted" ? "USED UP" : plan.status === "scheduled" ? "UPCOMING" : "ACTIVE"}</strong></div><div className="credit-plan-stats"><span>CONSUMED <b>{consumed}</b></span><span>CREDITS LEFT <b>{left}</b></span></div><div className="credit-plan-track"><span style={{ width: `${total ? consumed / total * 100 : 0}%` }} /></div><small>{consumed} of {total} requests used</small></article>; })}</div> : <div className="empty-panel"><strong>No purchased plans yet.</strong><span>Choose a subscription plan to add request credits.</span><Link className="button button-primary" href={`/subscriptions`}>Browse plans</Link></div>}</section>
    </>}
  </section>;
}
