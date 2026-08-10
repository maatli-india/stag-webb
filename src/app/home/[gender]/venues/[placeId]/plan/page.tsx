"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchMyVisitPlans,
  fetchPaymentBreakdown,
  fetchPlaceDetails,
  fetchUserDetails,
  PlaceDetails,
  publishVisitPlan,
  updateVisitPlan,
} from "@/lib/api";

export default function PublishVisitPlanPage() {
  const params = useParams<{ gender: string; placeId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const placeId = decodeURIComponent(params.placeId || "");
  const planId = searchParams.get("plan") || "";
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [visitDate, setVisitDate] = useState("");
  const [fee, setFee] = useState("");
  const [payout, setPayout] = useState<{
    platformFee: number;
    netPayout: number;
  } | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }
    Promise.all([
      fetchPlaceDetails(placeId),
      fetchUserDetails(window.localStorage.getItem("stag_user_id") || ""),
      planId ? fetchMyVisitPlans() : Promise.resolve([]),
    ])
      .then(([details, profile, plans]) => {
        setPlaceDetails(details);
        const existingPlan = plans.find(
          (plan) => (plan.id || plan._id) === planId,
        );
        if (existingPlan) {
          setVisitDate(
            toLocalDateTime(new Date(existingPlan.visitDatetime || "")),
          );
          setFee(String(existingPlan.entryFee || ""));
        } else if (profile.chargeAmount && profile.chargeAmount > 0)
          setFee(String(profile.chargeAmount));
      })
      .catch(() =>
        setError(
          "We could not load this venue. Please go back and select it again.",
        ),
      )
      .finally(() => setLoading(false));
  }, [placeId, planId, router]);

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
          const platformFeeRate = Number(breakdown.platformFee);
          if (baseAmount > 0 && Number.isFinite(platformFeeRate)) {
            const platformFee = amount * (platformFeeRate / baseAmount);
            setPayout({ platformFee, netPayout: amount - platformFee });
          } else setPayout(null);
        })
        .catch(() => setPayout(null))
        .finally(() => setPricingLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fee]);

  const submitPlan = async () => {
    setError("");
    const amount = Number(fee);
    const date = new Date(visitDate);
    const location = placeDetails?.geometry?.location;
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
    if (typeof location?.lat !== "number" || typeof location.lng !== "number")
      return setError(
        "We could not load this venue location. Please try again.",
      );

    setSubmitting(true);
    try {
      const payload = {
        lat: location.lat,
        lng: location.lng,
        placeId,
        clubName: placeDetails?.name || "Selected club",
        clubAddress: placeDetails?.formatted_address || "",
        visitDatetime: toISOWithTimezone(date),
        entryFee: amount,
        platformFee: Number(payout.platformFee.toFixed(2)),
        netPayout: Number(payout.netPayout.toFixed(2)),
      };
      if (planId) {
        await updateVisitPlan(planId, payload);
        router.replace("/home/female/plans?updated=1");
      } else {
        await publishVisitPlan(payload);
        router.replace("/home/female/plans?published=1");
      }
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

  if (loading)
    return (
      <section className="app-placeholder content-width profile-options-page">
        <p className="eyebrow">PLAN YOUR VISIT</p>
        <div className="empty-panel">
          <span>Loading venue details...</span>
        </div>
      </section>
    );
  if (published) return null;

  return (
    <section className="app-placeholder content-width profile-options-page visit-plan-page">
      <Link className="text-link venue-back-link" href={`/home/female`}>
        <span>←</span> Back to venues
      </Link>
      <header className="app-option-heading">
        <p className="eyebrow">PLAN YOUR VISIT</p>
        <h1>Share when you are going.</h1>
        <p className="lede">
          Choose a time and fee so members can request entry assistance at this
          venue.
        </p>
      </header>
      <div className="visit-plan-layout">
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
              onChange={(event) =>
                setFee(event.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="Minimum ₹500"
            />
          </label>
          <small className="field-hint">
            For this visit only. Minimum ₹500.
          </small>
          {fee && payout ? (
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
          ) : null}
          <div className="visit-plan-notice">
            <strong>Before you publish</strong>
            <span>
              Your venue, visit time, and fee will be visible to members
              searching for this place.
            </span>
          </div>
          {error && (
            <p className="form-message form-error" role="alert">
              {error}
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
        <aside className="visit-plan-side">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>Make your availability visible.</h2>
          <p>
            Members searching for this venue can discover your plan and send a
            request to join your entry.
          </p>
          <p className="visit-plan-side-note">
            You can manage or remove visit plans from your home.
          </p>
        </aside>
      </div>
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
