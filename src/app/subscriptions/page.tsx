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

type BoltHandlers = {
  responseHandler: (b: { response: { txnStatus: string } }) => void;
  catchException: (err: unknown) => void;
};

// PayU bolt.js injects itself onto window — typed minimally for what we use.
declare global {
  interface Window {
    bolt?: {
      launch: (data: Record<string, unknown>, handlers: BoltHandlers) => void;
    };
  }
}

let detachBoltListeners: (() => void) | null = null;

// bolt.launch adds a window "message" listener and removes it only on close/cancel. After a
// bolt-ohFish error (e.g. bad hash) it stays attached: the UAT SDK then throws "Cannot set
// properties of null (setting 'scrolling')" on every postMessage, and on retry the stale
// listener fires the previous order's handlers. Capture it during launch so we can detach it.
function launchBolt(data: Record<string, unknown>, handlers: BoltHandlers) {
  detachBoltListeners?.();
  const captured: EventListenerOrEventListenerObject[] = [];
  const originalAdd = window.addEventListener;
  window.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (type === "message") captured.push(listener);
    originalAdd.call(window, type, listener, options);
  }) as typeof window.addEventListener;
  try {
    window.bolt?.launch(data, handlers);
  } finally {
    window.addEventListener = originalAdd;
  }
  detachBoltListeners = () => {
    captured.forEach((listener) => window.removeEventListener("message", listener, false));
    detachBoltListeners = null;
  };
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

      const boltParams: Record<string, string> = {
        key: order.keyId,
        txnid: order.payuTxnId,
        // toFixed(2) required by PayU; guard against undefined amount
        amount: Number(order.amount ?? 0).toFixed(2),
        // BE signs strings.TrimSpace(name/email); untrimmed values cause a PayU hash mismatch
        firstname: userRef.current.name.trim(),
        email: userRef.current.email.trim(),
        phone: userRef.current.phone,
        productinfo: order.productInfo || "STAG subscription",
        // udf1/udf2/udf5 must match what BE used when signing the hash
        udf1: order.entityType || "",
        udf2: order.entityId || "",
        ...(order.udf5 ? { udf5: order.udf5 } : {}),
        surl: order.surl || "",
        furl: order.furl || "",
        hash: hash || "",
      };

      // bolt.js rejects these when empty with only a generic error; fail fast with a clear message.
      const missing = ["key", "txnid", "hash", "firstname", "productinfo", "surl", "furl"].filter((k) => !boltParams[k]);
      if (missing.length) {
        setError(
          missing.includes("firstname")
            ? "Please add your name in your profile before buying a plan."
            : "Could not start payment. Please try again.",
        );
        console.error("PayU checkout params missing:", missing.join(", "));
        setPurchasingId(null);
        return;
      }

      // Step 3: load bolt.js (idempotent — skipped if already on window)
      await loadBoltScript(!!order.isProduction);
      if (!window.bolt) throw new Error("bolt undefined after load");

      // Step 4: open checkout modal
      launchBolt(
        boltParams,
        {
          responseHandler: (b) => {
            setTimeout(() => detachBoltListeners?.(), 0);
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
            setTimeout(() => detachBoltListeners?.(), 0);
            console.error("PayU catchException:", err);
            // PayU messages contain HTML (e.g. "<b>hash</b>"); show plain text.
            const message = (err as { message?: string } | null)?.message?.replace(/<[^>]*>/g, "").trim();
            setPaymentNote({ text: message || "Something went wrong with the payment. Please try again.", ok: false });
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
