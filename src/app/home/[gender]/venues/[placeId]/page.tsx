"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CompanionUser,
  fetchCompanionsNearPlace,
  fetchPaymentBreakdown,
  fetchPlaceDetails,
  fetchUserDetails,
  PlaceDetails,
  publishVisitPlan,
} from "@/lib/api";

export default function VenueCompanionsPage() {
  const params = useParams<{ gender: string; placeId: string }>();
  const router = useRouter();
  const role = params.gender?.toLowerCase() === "female" ? "female" : "male";
  const placeId = decodeURIComponent(params.placeId || "");
  const [companions, setCompanions] = useState<CompanionUser[]>([]);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }

    if (role === "female") {
      router.replace(`/home/female/venues/${encodeURIComponent(placeId)}/plan`);
      return;
    }

    if (!placeId) {
      setError("This venue could not be identified.");
      setIsLoading(false);
      return;
    }

    Promise.all([
      fetchPlaceDetails(placeId)
        .then(setPlaceDetails)
        .catch(() => null),
      role === "male"
        ? fetchCompanionsNearPlace(placeId)
            .then((users) => setCompanions(Array.isArray(users) ? users : []))
            .catch(() =>
              setError(
                "We could not load entry partners for this venue right now.",
              ),
            )
        : Promise.resolve(),
    ]).finally(() => setIsLoading(false));
  }, [placeId, role, router]);

  return (
    <section className="app-placeholder content-width venue-companions-page">
      <Link className="text-link venue-back-link" href={`/home/${role}`}>
        <span>←</span> Back to venues
      </Link>
      <div className="venue-companions-heading">
        <div>
          <p className="eyebrow">
            {role === "female" ? "PLAN YOUR VISIT" : "ENTRY PARTNERS"}
          </p>
          <h1>
            {role === "female"
              ? "Share when you are going."
              : "Choose someone to help you get in."}
          </h1>
          <p className="lede">
            {role === "female"
              ? "Choose a time and fee so members can request entry assistance at this venue."
              : "These members are available near this venue and can assist with club entry."}
          </p>
        </div>
      </div>

      {placeDetails && (
        <div className="venue-details-summary">
          <div>
            <p className="eyebrow">VENUE DETAILS</p>
            <h2>{placeDetails.name || "Selected venue"}</h2>
            {placeDetails.formatted_address && (
              <p className="venue-details-address">
                {placeDetails.formatted_address}
              </p>
            )}
          </div>
          <div className="venue-details-facts">
            {typeof placeDetails.rating === "number" && (
              <span>
                <strong>★ {placeDetails.rating.toFixed(1)}</strong>
                {placeDetails.user_ratings_total
                  ? ` (${placeDetails.user_ratings_total.toLocaleString("en-IN")})`
                  : ""}
              </span>
            )}
            {typeof placeDetails.opening_hours?.open_now === "boolean" && (
              <span
                className={
                  placeDetails.opening_hours.open_now
                    ? "venue-open"
                    : "venue-closed"
                }
              >
                {placeDetails.opening_hours.open_now
                  ? "Open now"
                  : "Closed now"}
              </span>
            )}
            {placeDetails.types?.[0] && (
              <span>{formatPlaceType(placeDetails.types[0])}</span>
            )}
          </div>
          {placeDetails.opening_hours?.weekday_text &&
            placeDetails.opening_hours.weekday_text.length > 0 && (
              <details className="venue-hours">
                <summary>Opening hours</summary>
                <ul>
                  {placeDetails.opening_hours.weekday_text.map((hours) => (
                    <li key={hours}>{hours}</li>
                  ))}
                </ul>
              </details>
            )}
        </div>
      )}

      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}
      {isLoading ? (
        <div className="empty-panel">
          <span>Finding entry partners near this venue...</span>
        </div>
      ) : companions.length > 0 ? (
        <div className="companion-grid">
          {companions.map((companion, index) => (
            <Link
              className={
                companion.isPlannedVisit
                  ? "companion-card companion-card-planned"
                  : "companion-card"
              }
              href={`/home/${role}/venues/${encodeURIComponent(placeId)}/users/${encodeURIComponent(companion.id || String(index))}`}
              key={companion.id || index}
            >
              <div className="companion-card-header">
                {companion.profilePicUrl ? (
                  <img
                    className="companion-avatar"
                    src={companion.profilePicUrl}
                    alt=""
                  />
                ) : (
                  <div
                    className="companion-avatar companion-avatar-placeholder"
                    aria-hidden="true"
                  >
                    {getInitials(companion.name)}
                  </div>
                )}
                <div>
                  <h2>{companion.name || "STAG member"}</h2>
                  {companion.selfieVerified && (
                    <span className="companion-verified">Verified</span>
                  )}
                </div>
              </div>
              {companion.isPlannedVisit && (
                <p className="companion-planned">
                  Planning to visit this venue
                </p>
              )}
              {companion.isPlannedVisit && companion.plannedVisitAt ? (
                <p className="companion-meta">
                  Planned for {formatDate(companion.plannedVisitAt)}
                </p>
              ) : typeof companion.distance === "number" ? (
                <p className="companion-meta">
                  {formatDistance(companion.distance)} from this place
                </p>
              ) : null}
              <p className="companion-fee">
                Estimated STAG payment: ₹
                {formatAmount(
                  companion.companionFee ??
                    companion.plannedEntryFee ??
                    companion.chargeAmount ??
                    0,
                )}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <strong>No entry partners are available right now.</strong>
          <span>Try another venue or check back later.</span>
        </div>
      )}
    </section>
  );
}

function getInitials(name?: string) {
  return (name || "STAG")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDistance(distance: number) {
  const rounded = Math.round(distance * 2) / 2;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${rounded === 1 ? "km" : "kms"}`;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    amount,
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      });
}

function formatPlaceType(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function VisitPlanForm({
  placeId,
  placeDetails,
}: {
  placeId: string;
  placeDetails: PlaceDetails | null;
}) {
  const [visitDate, setVisitDate] = useState("");
  const [fee, setFee] = useState("");
  const [payout, setPayout] = useState<{
    platformFee: number;
    netPayout: number;
  } | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId) return;
    fetchUserDetails(userId)
      .then((profile) => {
        if (profile.chargeAmount && profile.chargeAmount > 0)
          setFee(String(profile.chargeAmount));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const amount = Number(fee);
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      setPayout(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setPricingLoading(true);
      fetchPaymentBreakdown(userId, amount)
        .then((breakdown) => {
          const baseAmount = Number(breakdown.baseAmount);
          const platformFee = Number(breakdown.platformFee);
          if (baseAmount > 0 && Number.isFinite(platformFee)) {
            const feeAmount = amount * (platformFee / baseAmount);
            setPayout({
              platformFee: feeAmount,
              netPayout: amount - feeAmount,
            });
          } else setPayout(null);
        })
        .catch(() => setPayout(null))
        .finally(() => setPricingLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fee]);

  const submitPlan = async () => {
    setError("");
    setMessage("");
    const amount = Number(fee);
    const date = new Date(visitDate);
    const lat = placeDetails?.geometry?.location?.lat;
    const lng = placeDetails?.geometry?.location?.lng;
    if (
      !visitDate ||
      Number.isNaN(date.getTime()) ||
      date.getTime() <= Date.now()
    )
      return setError("Choose a future date and time for your visit.");
    if (!Number.isInteger(amount) || amount < 500)
      return setError("Entry fee must be at least ₹500.");
    if (!payout)
      return setError("Wait for the payout preview to load, then try again.");
    if (typeof lat !== "number" || typeof lng !== "number")
      return setError(
        "We could not load this venue location. Please try again.",
      );

    setSubmitting(true);
    try {
      await publishVisitPlan({
        lat,
        lng,
        placeId,
        clubName: placeDetails?.name || "Selected club",
        clubAddress: placeDetails?.formatted_address || "",
        visitDatetime: toISOWithTimezone(date),
        entryFee: amount,
        platformFee: Number(payout.platformFee.toFixed(2)),
        netPayout: Number(payout.netPayout.toFixed(2)),
      });
      setPublished(true);
      setMessage(
        "Your visit plan is live. Members looking for entry assistance at this venue can now find it.",
      );
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "We could not publish your visit plan. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (published)
    return (
      <section className="visit-plan-success">
        <p className="eyebrow">VISIT PLAN PUBLISHED</p>
        <h2>You are on the list.</h2>
        <p>{message}</p>
        <a className="button button-primary" href="/home/female">
          Back to your home
        </a>
      </section>
    );

  return (
    <section className="visit-plan-form">
      <div className="visit-plan-venue">
        <p className="eyebrow">SELECTED VENUE</p>
        <h2>{placeDetails?.name || "Selected club"}</h2>
        <p>{placeDetails?.formatted_address || "Venue details"}</p>
      </div>
      <label>
        When are you visiting?
        <input
          type="datetime-local"
          value={visitDate}
          min={getLocalDateTimeMin()}
          onChange={(event) => setVisitDate(event.target.value)}
        />
      </label>
      <small className="field-hint">One plan per club per day.</small>
      <label>
        Your STAG entry fee
        <input
          type="number"
          min="500"
          step="1"
          value={fee}
          onChange={(event) => setFee(event.target.value)}
          placeholder="Minimum ₹500"
        />
      </label>
      <small className="field-hint">For this visit only.</small>
      {fee &&
        (payout ? (
          <div className="visit-plan-breakdown">
            <p>Payout breakdown</p>
            <div>
              <span>Your entry fee</span>
              <strong>₹{Number(fee).toFixed(2)}</strong>
            </div>
            <div>
              <span>STAG platform fee</span>
              <strong>-₹{payout.platformFee.toFixed(2)}</strong>
            </div>
            <div className="visit-plan-total">
              <span>Estimated platform payout</span>
              <strong>₹{payout.netPayout.toFixed(2)}</strong>
            </div>
          </div>
        ) : pricingLoading ? (
          <p className="field-hint">Calculating your estimated payout...</p>
        ) : null)}
      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-message form-success" role="status">
          {message}
        </p>
      )}
      <button
        className="button button-primary visit-plan-submit"
        type="button"
        onClick={() => void submitPlan()}
        disabled={submitting}
      >
        {submitting ? "Publishing..." : "Publish visit plan"}
      </button>
    </section>
  );
}

function getLocalDateTimeMin() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  return toLocalDateTime(now);
}

function toLocalDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toISOWithTimezone(date: Date) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  return `${toLocalDateTime(date)}:00${sign}${hours}:${minutes}`;
}
