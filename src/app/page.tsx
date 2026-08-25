import Image from "next/image";

const appSteps = [
  ["01", "Discover an event", "Explore clubs, pubs, and events that interest you."],
  ["02", "Make or join a plan", "Share when you are going or find people planning to attend the same event."],
  ["03", "Send a request", "Choose a plan and send a request to attend together."],
  ["04", "Coordinate your visit", "Use request details and messaging to confirm the venue, date, and time."],
  ["05", "Earn rewards", "Complete eligible activities and referrals to earn points and unlock rewards."],
];

export default function Home() {
  return (
    <>
      <section className="hero content-width">
        <div className="hero-copy">
          <p className="eyebrow">CLUB ENTRY, HANDLED WITH CLARITY</p>
          <h1>Get through the door with a plan.</h1>
          <p className="lede">STAG helps adults discover events, make plans, and connect with people who want to attend together.</p>
          <div className="hero-actions"><a className="button button-primary button-large" href="/signup">Create your account <span>↗</span></a><a className="text-link" href="#how-it-works">See how it works <span>↓</span></a></div>
          <div className="trust-line"><span>18+ only</span><span>Plan events together</span><span>Venue-based coordination</span></div>
        </div>
        <div className="hero-art"><Image src="/assets/images/clubImg/club-02.png" alt="Club interior" fill priority sizes="(max-width: 850px) 100vw, 50vw" /><div className="hero-stamp"><strong>STAG</strong><span>ARRIVE WITH<br />CONFIDENCE</span></div></div>
      </section>
      <section className="statement-band"><div className="content-width statement-grid"><p className="eyebrow">A CLEARER WAY IN</p><h2>Club entry, made<br /><em>simple and direct.</em></h2><p>Find a venue, request club entry assistance, and follow each step through STAG. We keep the experience focused on verified venues, clear requests, and confident arrival.</p></div></section>
      <section className="steps-section content-width" id="how-it-works"><div className="section-heading"><p className="eyebrow">HOW IT WORKS</p><h2>From discovery to<br /><em>shared plans.</em></h2></div><RoleSteps title="Your STAG journey" steps={appSteps} /></section>
      <section className="cta-band content-width" id="download"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Make your next<br /><em>night out simpler.</em></h2></div><div><p>Sign up to explore the platform. App downloads and the web experience are being rolled out in stages.</p><a className="button button-primary" href="/signup">Get started <span>↗</span></a></div></section>
      <section className="contact-strip content-width" id="contact"><p className="eyebrow">NEED A HAND?</p><h2>Questions before you start?</h2><a className="text-link" href="/support">Visit support <span>↗</span></a></section>
    </>
  );
}

function RoleSteps({ title, steps, accent = false }: { title: string; steps: string[][]; accent?: boolean }) {
  return <article className={`role-card${accent ? " role-card-accent" : ""}`}><h3>{title}</h3><ol>{steps.map(([number, heading, copy]) => <li key={number}><span className="step-number">{number}</span><div><strong>{heading}</strong><p>{copy}</p></div></li>)}</ol></article>;
}
