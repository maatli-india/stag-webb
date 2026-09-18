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

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ gender: string }>;
}) {
  const { gender } = await params;
  return (
    <section className="app-placeholder content-width profile-options-page">
      <Link
        className="text-link venue-back-link"
        href={`/home/${gender}/support`}
      >
        <span>←</span> Back to support
      </Link>
      <header className="app-option-heading">
        <p className="eyebrow">POLICY</p>
        <h1>Entry assistance &amp; request credits.</h1>
        <p className="lede">
          How club entry assistance and request credits work on STAG.
        </p>
      </header>
      <div className="policy-page-content">
        {policySections.map(([heading, points]) => (
          <section className="policy-page-section" key={heading}>
            <h2>{heading}</h2>
            <ul>
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
