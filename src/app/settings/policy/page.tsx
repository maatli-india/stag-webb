"use client";

import Link from "next/link";

const policySections = [
  [
    "Club Entry Assistance",
    [
      "Connecting with a registered member for club entry assistance is a free feature — STAG does not charge for it, and no payment or payout passes between users.",
      "Repeated cancellations after a request is accepted may affect your ability to send or receive new requests.",
    ],
  ],
  [
    "Request Credits",
    [
      "Purchased request credit packages are non-refundable and non-cancellable once purchased.",
      "Failed or duplicate credit-package transactions will be automatically refunded to your original payment method.",
    ],
  ],
] as const;

export default function PolicyPage() {
  return (
    <section className="app-placeholder content-width profile-options-page">
      <Link className="text-link venue-back-link" href="/home/support">
        <span>←</span> Back to support
      </Link>
      <header className="app-option-heading">
        <p className="eyebrow">POLICY</p>
        <h1>Entry assistance &amp; request credits.</h1>
        <p className="lede">How club entry assistance and request credits work on STAG.</p>
      </header>
      <div className="policy-page-content">
        {policySections.map(([title, items]) => (
          <section className="policy-page-section" key={title}>
            <h2>{title}</h2>
            <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ))}
      </div>
    </section>
  );
}
