"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useGender } from "@/lib/hooks";
import { useEffect, useState } from "react";
import {
  CompanionUser,
  fetchCompanionsNearPlace,
  fetchPlaceDetails,
  PlaceDetails,
} from "@/lib/api";
import Avatar from "@/components/avatar";

export default function VenueCompanionsPage() {
  const router = useRouter();
  const gender = useGender();
  const role = gender;
  const params = useParams<{ placeId: string }>();
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
      router.replace(`/home/venues/${encodeURIComponent(placeId)}/plan`);
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
      <Link className="text-link venue-back-link" href={"/home"}>
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
              ? "Choose a time so members can request entry assistance at this venue."
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
              href={`/home/venues/${encodeURIComponent(placeId)}/users/${encodeURIComponent(companion.id || String(index))}`}
              key={companion.id || index}
            >
              <div className="companion-card-header">
                <Avatar
                  userId={companion.id}
                  className="companion-avatar"
                  fallback={
                    <div
                      className="companion-avatar companion-avatar-placeholder"
                      aria-hidden="true"
                    >
                      {getInitials(companion.name)}
                    </div>
                  }
                />
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
