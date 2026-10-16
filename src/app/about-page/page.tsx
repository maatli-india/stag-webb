"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGender } from "@/lib/hooks";

export default function AboutAppPage() {
  const gender = useGender();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isFuser = gender === "female";

  const steps = isFuser ? [
    ["1", "Complete Your Profile", "Add a clear photo and fill in your profile details so users nearby can discover and request you."],
    ["2", "Enable Location", "Turn on location sharing so users near clubs in your area can see you and send requests."],
    ["3", "Receive Entry Assistance Requests", "Get notified whenever a user needs entry assistance at a club near you. Review all the details before responding."],
    ["4", "Accept or Decline", "You are in full control. Accept only requests you are comfortable with — decline anything else, no questions asked."],
    ["5", "Arrive at the Club", "Arrive at the venue at the agreed time and meet the user at the club entrance."],
    ["6", "Confirm the Visit", "Use the entry code at the venue to confirm that the planned visit took place."],
  ] : [
    ["1", "Browse Clubs", "Discover bars, lounges, and clubs near you on your home screen — filtered by your current location."],
    ["2", "Find an Entry Partner", "Browse registered female members near the venue you want to visit. View their profile and send a request — no pressure, they can accept or decline freely."],
    ["3", "Send a Request", "Select the club, choose the member, and send a club entry request in a few taps."],
    ["4", "Confirm Your Plan", "Review the accepted request and confirm the details for your shared visit."],
    ["5", "Arrive & Get In", "Arrive at the club entrance together, exchange the entry code to confirm, and you are in."],
  ];

  const features = isFuser ? [
    ["01", "You're in Control", "Accept only the requests you are comfortable with. Decline anything else instantly."],
    ["02", "Location Privacy", "Only your approximate area is shared with nearby users — your exact location stays private."],
    ["03", "Clear Request Details", "Review the venue, timing, and plan details before accepting any request."],
    ["04", "My Club Entries", "Track all your active and past club entry requests from the menu at any time."],
  ] : [
    ["01", "Location-Based Discovery", "See clubs and available users near you in real time — no manual searching."],
    ["02", "Verified Users", "Every user on the platform is verified, so you always know who you're entering with."],
    ["03", "Clear Coordination", "Keep requests, venue details, and visit confirmations organized in one place."],
    ["04", "My Club Entries", "Track all your past and active club entry requests from the menu."],
  ];

  const aboutDescription = isFuser
    ? "STAG helps you discover events and share plans with people nearby. Create a profile, choose the requests that work for you, and coordinate your visit through the platform. You are always in control of which requests you accept, and you can decline anything at any time."
    : "STAG helps you discover clubs, pubs, and events and connect with people who want to attend together. Browse available plans, send requests, and keep your shared visit details organized in one place.";

  if (!mounted) return null;

  return (
    <section className="app-placeholder content-width about-app-page">
      <Link className="text-link venue-back-link" href="/home"><span>←</span> Back to home</Link>
      <header className="app-option-heading about-app-hero"><p className="eyebrow">FOR YOU</p><h1>STAG</h1><p className="about-app-tagline">Discover events. Make plans together.</p></header>
      <section className="about-app-info-card"><h2>What is STAG?</h2>{aboutDescription.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<p className="about-app-note">Registered users are independent users, not employees, agents, representatives, or associates of STAG.</p><strong>18+ only. STAG is intended for adults aged 18 years or older because it helps coordinate entry at clubs, lounges, and other adult-oriented venues where alcohol may be served. STAG does not promote, sell, supply, or encourage alcohol, drugs, or any other substance use.</strong></section>
      <section className="about-app-section"><p className="request-detail-heading">HOW IT WORKS</p><div className="about-app-steps">{steps.map(([number, title, description]) => <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>
      <section className="about-app-section"><p className="request-detail-heading">FEATURES</p><div className="about-app-features">{features.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>
      <footer className="about-app-credits"><span>© 2026 Maatli Tech Private Limited</span><strong>STAG — club entry, handled with clarity.</strong><small>All rights reserved.</small></footer>
    </section>
  );
}
