import Link from "next/link";

export default async function AboutAppPage({ params }: { params: Promise<{ gender: string }> }) {
  const { gender } = await params;
  const isFuser = gender.toLowerCase() === "female";
  const steps = isFuser ? [
    ["1", "Complete Your Profile", "Add a clear photo and fill in your profile details so users nearby can discover and request you."],
    ["2", "Enable Location", "Turn on location sharing so users near clubs in your area can see you and send requests."],
    ["3", "Receive Entry Assistance Requests", "Get notified whenever a user needs entry assistance at a club near you. Review all the details before responding."],
    ["4", "Accept or Decline", "You are in full control. Accept only requests you are comfortable with — decline anything else, no questions asked."],
    ["5", "Arrive at the Club", "Arrive at the venue at the agreed time and meet the user at the club entrance."],
    ["6", "Confirm & Receive a Platform Payout", "Exchange the entry code to confirm entry. Once confirmed, STAG credits any eligible platform payout to your registered bank account."],
  ] : [
    ["1", "Browse Clubs", "Discover bars, lounges, and clubs near you on your home screen — filtered by your current location."],
    ["2", "Find an Entry Partner", "Browse registered female members near the venue you want to visit. View their profile and send a request — no pressure, they can accept or decline freely."],
    ["3", "Send a Request", "Select the club, choose the member, and send a club entry request in a few taps."],
    ["4", "Pay STAG to Confirm", "Once the member accepts, pay STAG through the secure in-app gateway to confirm your spot. STAG processes the payment and any eligible platform payout after the club entry is completed."],
    ["5", "Arrive & Get In", "Arrive at the club entrance together, exchange the entry code to confirm, and you are in."],
  ];
  const features = isFuser ? [
    ["01", "You're in Control", "Accept only the requests you are comfortable with. Decline anything else instantly."],
    ["02", "Location Privacy", "Only your approximate area is shared with nearby users — your exact location stays private."],
    ["03", "Transparent Service Fee", "See exactly how much you will receive before accepting any request. No surprises."],
    ["04", "My Club Entries", "Track all your active and past club entry requests from the menu at any time."],
  ] : [
    ["01", "Location-Based Discovery", "See clubs and available users near you in real time — no manual searching."],
    ["02", "Verified Users", "Every user on the platform is verified, so you always know who you're entering with."],
    ["03", "Secure Platform Payments", "Payments are processed securely by STAG. Users do not pay each other directly, and eligible platform payouts are handled by STAG."],
    ["04", "My Club Entries", "Track all your past and active club entry requests from the menu."],
  ];

  const aboutDescription = isFuser
    ? "Many clubs and bars in India enforce a \"no stag entry\" rule that prevents solo males from entering. STAG connects you with nearby members who need entry assistance at those venues.\n\nYou assist with club entry, while STAG processes the member payment and any eligible platform payout to your registered bank account. You are always in full control of which requests you accept, and you can decline anything at any time, no questions asked."
    : "Many clubs and bars in India do not allow solo male entry — this is commonly known as the \"no stag entry\" rule. STAG helps you address this restriction by connecting you with registered members near the venue who are willing to assist with club entry.\n\nYou pay STAG through its secure payment gateway. STAG processes the platform payment and any eligible platform payout; there is no direct payment between users.";

  return (
    <section className="app-placeholder content-width about-app-page">
      <Link className="text-link venue-back-link" href={`/home/${gender}`}><span>←</span> Back to home</Link>
      <header className="app-option-heading about-app-hero"><p className="eyebrow">FOR YOU</p><h1>STAG</h1><p className="about-app-tagline">{isFuser ? "Assist With Entry. Receive a Platform Payout." : "No More Stag Entry Rejections."}</p></header>
      <section className="about-app-info-card"><h2>What is STAG?</h2>{aboutDescription.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<p className="about-app-note">Registered users are independent users, not employees, agents, representatives, or associates of STAG.</p><strong>18+ only. STAG is intended for adults aged 18 years or older because it helps coordinate entry at clubs, lounges, and other adult-oriented venues where alcohol may be served. STAG does not promote, sell, supply, or encourage alcohol, drugs, or any other substance use.</strong></section>
      <section className="about-app-section"><p className="request-detail-heading">HOW IT WORKS</p><div className="about-app-steps">{steps.map(([number, title, description]) => <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>
      <section className="about-app-section"><p className="request-detail-heading">FEATURES</p><div className="about-app-features">{features.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>
      <footer className="about-app-credits"><span>© 2026 Maatli Tech Private Limited</span><strong>STAG — club entry, handled with clarity.</strong><small>All rights reserved.</small></footer>
    </section>
  );
}
