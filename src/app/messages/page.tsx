"use client";

import Link from "next/link";

export default function MessagesPage() {
  return (
    <section className="app-placeholder content-width">
      <p className="eyebrow">MESSAGES</p>
      <h1>Keep conversations in one place.</h1>
      <p className="lede">Messages connected to your club-entry requests will appear here.</p>
      <div className="empty-panel">
        <strong>No messages yet.</strong>
        <span>Request-related conversations will be available here when you start an entry plan.</span>
      </div>
      <Link className="button button-primary" href="/home">Back to home</Link>
    </section>
  );
}
