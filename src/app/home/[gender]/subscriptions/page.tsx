"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchSubscriptionPlans, SubscriptionPlan } from "@/lib/api";

export default function SubscriptionsPage() {
  const params = useParams<{ gender: string }>();
  const router = useRouter();
  const gender = params.gender?.toLowerCase() === "female" ? "female" : "male";
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }
    fetchSubscriptionPlans().then(setPlans).catch(() => setError("We could not load subscription plans right now.")).finally(() => setLoading(false));
  }, [router]);

  return <section className="app-placeholder content-width subscriptions-page">
    <Link className="text-link venue-back-link" href={`/home/${gender}/credits`}><span>←</span> Back to request credits</Link>
    <header className="app-option-heading"><p className="eyebrow">STAG PLUS</p><h1>Choose your plan.</h1><p className="lede">Request-credit packages give you more room to find the right club entry match.</p></header>
    {error && <p className="form-message form-error" role="alert">{error}</p>}
    {loading ? <div className="empty-panel"><span>Loading subscription plans...</span></div> : plans.length ? <div className="subscription-plan-grid">{plans.map((plan, index) => <article className={`subscription-plan-card ${index === 0 ? "subscription-plan-featured" : ""}`} key={plan.id || plan.name || index}><p className="eyebrow">{index === 0 ? "POPULAR" : "REQUEST CREDITS"}</p><h2>{plan.name || "STAG plan"}</h2><strong className="subscription-plan-price">{plan.currency === "INR" || !plan.currency ? "₹" : `${plan.currency} `}{Number(plan.cost || 0).toLocaleString("en-IN")}</strong><span className="subscription-plan-credits">{plan.creditCount || 0} requests included</span><div className="subscription-plan-description">{String(plan.description || "Request credits for your next STAG experience.").split(/\r?\n/).filter(Boolean).map((point, pointIndex) => <p key={pointIndex}><b>✓</b>{point.replace(/^\s*[-*•]\s*/, "")}</p>)}</div><div className="subscription-plan-validity">{plan.neverExpires ? "Never expires" : `${plan.expiryDays || 0} day validity`}</div><button className="button button-primary" type="button" disabled>Purchase in app</button></article>)}</div> : <div className="empty-panel"><strong>No plans available.</strong><span>Subscription plans will appear here when they are published.</span></div>}
  </section>;
}
