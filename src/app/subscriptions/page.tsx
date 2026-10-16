"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGender } from "@/lib/hooks";
import {
  createPaymentOrder,
  fetchPayuHash,
  fetchSubscriptionPlans,
  fetchUserDetails,
  SubscriptionPlan,
  verifyPaymentFromUI,
} from "@/lib/api";

// PayU bolt.js injects itself onto window — typed minimally for what we use.
// hash in launch data is a callback: bolt calls it with hashName, you return the signed hash.
declare global {
  interface Window {
    bolt?: {
      launch: (
        data: Record<string, unknown>,
        handlers: {
          responseHandler: (b: { response: { txnStatus: string } }) => void;
          catchException: (err: unknown) => void;
        },
      ) => void;
    };
  }
}

// Loads bolt.js once per environment; resolves immediately if already loaded.
function loadBoltScript(isProduction: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.bolt) { resolve(); return; }
    const src = isProduction
      ? "https://jssdk.payu.in/bolt/bolt.min.js"
      : "https://jssdk-uat.payu.in/bolt/bolt.min.js";
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment SDK"));
    document.head.appendChild(script);
  });
}

function PlanCard({
  featured,
  onPurchase,
  plan,
  purchasing,
}: {
  featured: boolean;
  onPurchase: (plan: SubscriptionPlan) => void;
  plan: SubscriptionPlan;
  purchasing: boolean; // true only for this specific plan
}) {
  const points = String(plan.description || "Request credits for your next STAG experience.")
    .split(/\r?\n/)
    .filter(Boolean);

  return (
    <article className={`subscription-plan-card${featured ? " subscription-plan-featured" : ""}`}>
      <p className="eyebrow">{featured ? "POPULAR" : "REQUEST CREDITS"}</p>
      <h2>{plan.name || "STAG plan"}</h2>
      <strong className="subscription-plan-price">
        {plan.currency === "INR" || !plan.currency ? "₹" : `${plan.currency} `}
        {Number(plan.cost || 0).toLocaleString("en-IN")}
      </strong>
      <span className="subscription-plan-credits">{plan.creditCount || 0} requests included</span>
      <div className="subscription-plan-description">
        {points.map((point, i) => (
          <p key={i}><b>✓</b>{point.replace(/^\s*[-*•]\s*/, "")}</p>
        ))}
      </div>
      <div className="subscription-plan-validity">
        {plan.neverExpires ? "Never expires" : `${plan.expiryDays || 0} day validity`}
      </div>
      <button className="button button-primary" disabled={purchasing} onClick={() => onPurchase(plan)} type="button">
        {purchasing ? "Processing…" : "Buy plan"}
      </button>
    </article>
  );
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const gender = useGender();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // track by plan id so only the clicked button shows "Processing…"
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState<{ text: string; ok: boolean } | null>(null);

  // BE uses user.name + user.email when signing the PayU hash — FE must pass matching values.
  const userRef = useRef<{ name: string; email: string; phone: string } | null>(null);

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (!window.localStorage.getItem("stag_access_token") || !userId) {
      router.replace("/signup");
      return;
    }
    Promise.all([fetchSubscriptionPlans(), fetchUserDetails(userId)])
      .then(([plansData, user]) => {
        setPlans(plansData);
        userRef.current = { name: user.name || "", email: user.email || "", phone: user.phone || "" };
      })
      .catch(() => setError("We could not load subscription plans right now."))
      .finally(() => setLoading(false));
  }, [router]);

  async function handlePurchase(plan: SubscriptionPlan) {
    if (!plan.id || !userRef.current) return;
    setPurchasingId(plan.id);
    setPaymentNote(null);
    setError("");

    try {
      // Step 1: create gateway order on BE
      const order = await createPaymentOrder("subscription", { subscriptionId: plan.id });

      if (order.gateway !== "payu" || !order.keyId || !order.payuTxnId || !order.orderId) {
        setError("Online payment is not available right now. Please try the app.");
        setPurchasingId(null);
        return;
      }

      // Step 2: pre-fetch hash from BE — bolt.js UAT requires a static string, not a callback
      const { hash } = await fetchPayuHash(order.orderId, "payment_hash");

      // Step 3: load bolt.js (idempotent — skipped if already on window)
      await loadBoltScript(!!order.isProduction);
      if (!window.bolt) throw new Error("bolt undefined after load");

      // Step 4: open checkout modal
      window.bolt.launch(
        {
          key: order.keyId,
          txnid: order.payuTxnId,
          // toFixed(2) required by PayU; guard against undefined amount
          amount: Number(order.amount ?? 0).toFixed(2),
          firstname: userRef.current.name,
          email: userRef.current.email,
          phone: userRef.current.phone,
          productinfo: order.productInfo || "STAG subscription",
          // udf1/udf2 must match what BE used when signing the hash
          udf1: order.entityType || "",
          udf2: order.entityId || "",
          surl: order.surl,
          furl: order.furl,
          hash,
        },
        {
          responseHandler: (b) => {
            const ok = b.response.txnStatus?.toUpperCase() === "SUCCESS";
            const cancelled = b.response.txnStatus?.toUpperCase() === "CANCEL";
            // Step 5: inform BE of outcome — credits are granted by webhook, not this call
            verifyPaymentFromUI(order.orderId!, ok ? "completed" : "failed").catch(() => null);
            if (ok) {
              setPaymentNote({ text: "Payment successful! Your credits will be added shortly.", ok: true });
            } else if (cancelled) {
              setPaymentNote({ text: "Payment cancelled.", ok: false });
            } else {
              setPaymentNote({ text: "Payment failed. Please try again.", ok: false });
            }
            setPurchasingId(null);
          },
          catchException: (err: unknown) => {
            console.error("PayU catchException:", err);
            setPaymentNote({ text: "Something went wrong with the payment. Please try again.", ok: false });
            setPurchasingId(null);
          },
        },
      );
    } catch {
      setError("Could not start payment. Please try again.");
      setPurchasingId(null);
    }
  }

  return (
    <section className="app-placeholder content-width subscriptions-page">
      <Link className="text-link venue-back-link" href={`/credits`}>
        <span>←</span> Back to request credits
      </Link>
      <header className="app-option-heading">
        <p className="eyebrow">STAG PLUS</p>
        <h1>Choose your plan.</h1>
        <p className="lede">Request-credit packages give you more room to find the right club entry match.</p>
      </header>

      {error && <p className="form-message form-error" role="alert">{error}</p>}
      {paymentNote && (
        <p className={`form-message ${paymentNote.ok ? "form-success" : "form-error"}`} role="alert">
          {paymentNote.text}
        </p>
      )}

      {loading ? (
        <div className="empty-panel"><span>Loading subscription plans…</span></div>
      ) : plans.length ? (
        <div className="subscription-plan-grid">
          {plans.map((plan, index) => (
            <PlanCard featured={index === 0} key={plan.id || plan.name || index} onPurchase={handlePurchase} plan={plan} purchasing={purchasingId === plan.id}/>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <strong>No plans available.</strong>
          <span>Subscription plans will appear here when they are published.</span>
        </div>
      )}
    </section>
  );
}
