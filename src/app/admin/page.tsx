"use client";

import Link from "next/link";

export default function AdminDashboard() {
  return (
    <section className="member-home content-width">
      <div className="member-home-heading">
        <div>
          <p className="eyebrow">STAG ADMIN</p>
          <h1>Manage events and plans.</h1>
          <p className="lede">
            Internal tools for the STAG team — not part of the consumer app.
          </p>
        </div>
      </div>

      <div className="venue-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <Link className="venue-card" href="/admin/events">
          <span className="venue-number">01</span>
          <h3>Manage STAG Events</h3>
          <p>
            Create unforgettable nights, update event details, set entry
            rules, and keep your lineup fresh.
          </p>
          <span className="venue-action">
            Open Events <b>→</b>
          </span>
        </Link>
        <Link className="venue-card" href="/admin/subscriptions">
          <span className="venue-number">02</span>
          <h3>Manage Plan Descriptions</h3>
          <p>
            Update the description customers see before they purchase a
            request credit plan.
          </p>
          <span className="venue-action">
            Open Plans <b>→</b>
          </span>
        </Link>
      </div>
    </section>
  );
}
