import Image from "next/image";

const maleSteps = [
  ["01", "Choose a venue", "Explore clubs and lounges available around you."],
  ["02", "Send a request", "Review the entry details and send a request to a verified member."],
  ["03", "Pay STAG", "Once accepted, pay STAG securely through the platform to confirm your entry."],
  ["04", "Arrive and enter", "Use the arrival and entry codes at the club entrance to verify the visit."],
];

const femaleSteps = [
  ["01", "Create your profile", "Set up your profile and add the bank details STAG needs for payouts."],
  ["02", "Set your availability", "Share your approximate area and the venues you plan to visit."],
  ["03", "Review requests", "See the date, venue, and fee details before accepting anything."],
  ["04", "Receive a platform payout", "After verified entry, STAG processes any eligible payout to your registered account."],
];

export default function Home() {
  return (
    <>
      <section className="hero content-width">
        <div className="hero-copy">
          <p className="eyebrow">CLUB ENTRY, HANDLED WITH CLARITY</p>
          <h1>Get through the door with a plan.</h1>
          <p className="lede">STAG helps adults arrange verified club entry assistance with clear steps, secure platform payments, and confirmation at the venue.</p>
          <div className="hero-actions"><a className="button button-primary button-large" href="/signup">Create your account <span>↗</span></a><a className="text-link" href="#how-it-works">See how it works <span>↓</span></a></div>
          <div className="trust-line"><span>18+ only</span><span>Secure payments processed by STAG</span><span>Venue-based confirmation</span></div>
        </div>
        <div className="hero-art"><Image src="/assets/images/stag_web_female.png" alt="STAG club entry experience" fill priority sizes="(max-width: 850px) 100vw, 50vw" /><div className="hero-stamp"><strong>STAG</strong><span>ARRIVE WITH<br />CONFIDENCE</span></div></div>
      </section>
      <section className="statement-band"><div className="content-width statement-grid"><p className="eyebrow">A CLEARER WAY IN</p><h2>Club entry, made<br /><em>simple and direct.</em></h2><p>Find a venue, request club entry assistance, and follow each step through STAG. We keep the experience focused on verified venues, clear requests, and confident arrival.</p></div></section>
      <section className="steps-section content-width" id="how-it-works"><div className="section-heading"><p className="eyebrow">HOW IT WORKS</p><h2>One platform.<br /><em>Two ways to participate.</em></h2></div><div className="role-grid"><RoleSteps title="For members looking for entry" steps={maleSteps} /><RoleSteps title="For registered entry-assistance members" steps={femaleSteps} accent /></div></section>
      <section className="cta-band content-width" id="download"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Make your next<br /><em>night out simpler.</em></h2></div><div><p>Sign up to explore the platform. App downloads and the web experience are being rolled out in stages.</p><a className="button button-primary" href="/signup">Get started <span>↗</span></a></div></section>
      <section className="contact-strip content-width" id="contact"><p className="eyebrow">NEED A HAND?</p><h2>Questions before you start?</h2><a className="text-link" href="mailto:info@stag.org.in">Talk to support <span>↗</span></a></section>
    </>
  );
}

function RoleSteps({ title, steps, accent = false }: { title: string; steps: string[][]; accent?: boolean }) {
  return <article className={`role-card${accent ? " role-card-accent" : ""}`}><h3>{title}</h3><ol>{steps.map(([number, heading, copy]) => <li key={number}><span className="step-number">{number}</span><div><strong>{heading}</strong><p>{copy}</p></div></li>)}</ol></article>;
}
