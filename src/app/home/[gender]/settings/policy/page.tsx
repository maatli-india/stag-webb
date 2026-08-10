import Link from "next/link";

const policySections = [
  [
    "Platform payout",
    [
      "STAG releases your platform payout once the club entry is successfully completed and the Entry Code is verified.",
      "STAG credits the platform payout to your registered bank account within one week of entry completion.",
    ],
  ],
  [
    "Cancellation",
    [
      "If you cancel a request after STAG has processed the platform payment, some amount may be deducted from your platform payout as a cancellation charge.",
      "Repeated cancellations after acceptance may affect your profile visibility on the platform.",
      "If the requesting user cancels after STAG processes the payment, it does not affect your platform payout for completed entries.",
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
        <h1>Service fee &amp; cancellation.</h1>
        <p className="lede">
          How eligible platform payouts and cancellations work on STAG.
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
