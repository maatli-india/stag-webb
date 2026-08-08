"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ActiveRequest, fetchUserRequests } from "@/lib/api";

const PAGE_SIZE = 10;
const filters = [
  { label: "All", value: "" },
  { label: "Awaiting confirmation", value: "pending" },
  { label: "Awaiting payment", value: "accepted,confirm_intended,payment_initiated" },
  { label: "Confirmed", value: "confirmed,verified" },
  { label: "Past", value: "past" },
];

export default function RequestsPage() {
  const params = useParams<{ gender: string }>();
  const router = useRouter();
  const role = params.gender?.toLowerCase() === "female" ? "female" : "male";
  const [requests, setRequests] = useState<ActiveRequest[]>([]);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
    }
  }, [router]);

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId) return;

    setIsLoading(true);
    setError("");
    const isPast = filter === "past";
    const isAll = filter === "";
    fetchUserRequests(userId, {
      page,
      limit: PAGE_SIZE,
      timeline: isPast ? "past" : isAll ? "all" : "upcoming",
      status: isPast ? undefined : filter || undefined,
    })
      .then((result) => {
        setRequests(result.items || []);
        setTotal(result.total || 0);
      })
      .catch(() => {
        setRequests([]);
        setTotal(0);
        setError("We could not load your requests right now.");
      })
      .finally(() => setIsLoading(false));
  }, [filter, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="app-placeholder content-width requests-page">
      <div className="requests-heading">
        <div>
          <p className="eyebrow">MY REQUESTS</p>
          <h1>Club entry requests.</h1>
          <p className="lede">Review your entry requests by status and keep track of what happens next.</p>
        </div>
        <Link className="button button-primary" href={`/home/${role}`}>Find a venue</Link>
      </div>

      <div className="request-filters" aria-label="Filter requests by status">
        {filters.map((item) => (
          <button
            className={filter === item.value ? "request-filter active" : "request-filter"}
            key={item.value || "all"}
            type="button"
            onClick={() => {
              setFilter(item.value);
              setPage(1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="form-message form-error" role="alert">{error}</p>}
      {isLoading ? (
        <div className="empty-panel"><span>Loading your requests...</span></div>
      ) : requests.length > 0 ? (
        <>
          <div className="request-list-heading">
            <p>{total} {total === 1 ? "request" : "requests"}</p>
            <span>Page {page} of {totalPages}</span>
          </div>
          <div className="request-grid">
            {requests.map((request, index) => (
              <article
                className="request-card request-card-link"
                key={request.id || index}
                role="link"
                tabIndex={request.id ? 0 : -1}
                onClick={() => request.id && router.push(`/home/${role}/requests/${encodeURIComponent(request.id)}`)}
                onKeyDown={(event) => {
                  if (request.id && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    router.push(`/home/${role}/requests/${encodeURIComponent(request.id)}`);
                  }
                }}
              >
                <span className="request-status">{getStatusLabel(request)}</span>
                <h3>{request.clubName || "Club entry"}</h3>
                <p>{getCounterpart(request, role)?.username || getCounterpart(request, role)?.name || "Entry partner"}</p>
                <small>{request.datetime ? formatDate(request.datetime) : "Date to be confirmed"}</small>
              </article>
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="request-pagination" aria-label="Request pages">
              <button className="button button-secondary" type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button className="button button-secondary" type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
            </nav>
          )}
        </>
      ) : (
        <div className="empty-panel">
          <strong>No requests found.</strong>
          <span>{filter ? "Try another status filter or find a venue to start a request." : "Choose a venue from Home to start a new club-entry request."}</span>
        </div>
      )}
    </section>
  );
}

function getStatusLabel(request: ActiveRequest) {
  if (request.payment?.paymentStatus === "completed" || request.status === "confirmed" || request.status === "verified") return "CONFIRMED";
  if (request.status === "accepted" || request.status === "confirm_intended" || request.status === "payment_initiated") return "AWAITING PAYMENT";
  if (request.status === "pending") return "AWAITING CONFIRMATION";
  return "PENDING";
}

function getCounterpart(request: ActiveRequest, role: string) {
  return role === "male" ? request.fUser : request.mUser;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
