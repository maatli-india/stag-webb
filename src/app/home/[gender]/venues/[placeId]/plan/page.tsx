"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchMyVisitPlans,
  fetchPlaceDetails,
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
      planId ? fetchMyVisitPlans() : Promise.resolve([]),
    ])
      .then(([details, plans]) => {
        setPlaceDetails(details);
        const existingPlan = plans.find(
          (plan) => (plan.id || plan._id) === planId,
        );
        if (existingPlan) {
          setVisitDate(
            toLocalDateTime(new Date(existingPlan.visitDatetime || "")),
          );
        }
      })
      .catch(() =>
        setError(
          "We could not load this venue. Please go back and select it again.",
        ),
      )
      .finally(() => setLoading(false));
  }, [placeId, planId, router]);

  const submitPlan = async () => {
    setError("");
    const date = new Date(visitDate);
    const location = placeDetails?.geometry?.location;
    if (
      !visitDate ||
      Number.isNaN(date.getTime()) ||
      date.getTime() <= Date.now()
    )
      return setError("Choose a future date and time for your visit.");
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
          Choose a time so members can find you and send a request to join
          your entry — this is a free feature, no fee is involved.
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
          <div className="visit-plan-notice">
            <strong>Before you publish</strong>
            <span>
              Your venue and visit time will be visible to members searching
              for this place.
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
