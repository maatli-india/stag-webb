import Link from "next/link";

export default async function AboutAppPage({ params }: { params: Promise<{ gender: string }> }) {
  const { gender } = await params;
  const steps = [
    ["1", "Browse Clubs", "Discover bars, lounges, and clubs near you on your home screen — filtered by your current location."],
    ["2", "Find an Entry Partner", "Browse registered female members near the venue you want to visit. View their profile and send a request — no pressure, they can accept or decline freely."],
    ["3", "Send a Request", "Select the club, choose the member, and send a club entry request in a few taps."],
    ["4", "Pay STAG to Confirm", "Once the member accepts, pay STAG through the secure in-app gateway to confirm your spot. STAG processes the payment and any eligible platform payout after the club entry is completed."],
    ["5", "Arrive & Get In", "Arrive at the club entrance together, exchange the entry code to confirm, and you are in."],
  ];
  const features = [
    ["01", "Location-Based Discovery", "See clubs and available users near you in real time — no manual searching."],
    ["02", "Verified Users", "Every user on the platform is verified, so you always know who you're entering with."],
    ["03", "Secure Platform Payments", "Payments are processed securely by STAG. Users do not pay each other directly, and eligible platform payouts are handled by STAG."],
    ["04", "My Club Entries", "Track all your past and active club entry requests from the menu."],
  ];

  return (
    <section className="app-placeholder content-width about-app-page">
      <Link className="text-link venue-back-link" href={`/home/${gender}`}><span>←</span> Back to home</Link>
      <header className="app-option-heading about-app-hero"><p className="eyebrow">FOR YOU</p><h1>STAG</h1><p className="about-app-tagline">No More Stag Entry Rejected.</p></header>
      <section className="about-app-info-card"><h2>What is STAG?</h2><p>Many clubs and bars in India do not allow solo male entry — this is commonly known as the "no stag entry" rule. STAG helps you address this restriction by connecting you with registered members near the venue who are willing to assist with club entry.</p><p>You pay STAG through its secure payment gateway. STAG processes the platform payment and any eligible platform payout; there is no direct payment between users.</p><strong>18+ only. STAG is intended for adults aged 18 years or older.</strong></section>
      <section className="about-app-section"><p className="request-detail-heading">HOW IT WORKS</p><div className="about-app-steps">{steps.map(([number, title, description]) => <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>
      <section className="about-app-section"><p className="request-detail-heading">FEATURES</p><div className="about-app-features">{features.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>
      <footer className="about-app-credits"><span>Made with care by</span><strong>Maatli Tech Private Limited</strong><small>STAG web experience</small></footer>
    </section>
  );
}
