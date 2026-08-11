"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ActiveRequest,
  fetchRequestDetails,
  fetchUserLedger,
  LedgerItem,
} from "@/lib/api";

const periods = [
  ["week", "Last week"],
  ["month", "Last month"],
  ["year", "Last year"],
  ["all", "All time"],
] as const;

function formatAmount(amount: number) {
  return `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function typeLabel(item: LedgerItem) {
  if (item.type === "EARNING") return "Entry earning";
  if (item.type === "PAYOUT") return "Bank payout";
  if (item.metadata?.reason?.toLowerCase().includes("cancellation"))
    return "Cancellation deduction";
  return "Deduction";
}

function settlementLabel(status?: string) {
  return status === "SETTLED" ? "Sent to bank" : "Processing";
}

function detailTitle(item: LedgerItem) {
  if (item.type === "EARNING") return "Entry earning details";
  if (item.type === "PAYOUT") return "Bank payout details";
  return "Deduction details";
}

function detailReason(item: LedgerItem) {
  const reason = item.metadata?.reason?.toLowerCase() || "";
  if (reason.includes("cancellation")) return "Cancellation adjustment applied";
  if (item.type === "EARNING") return "Completed club entry";
  return "Account adjustment";
}

export default function EarningsPage() {
  const params = useParams<{ gender: string }>();
  const gender = params.gender?.toLowerCase() === "female" ? "female" : "male";
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [lifetimeEarnings, setLifetimeEarnings] = useState<number | null>(null);
  const [period, setPeriod] = useState<(typeof periods)[number][0]>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<LedgerItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ActiveRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openEntryDetails = async (item: LedgerItem) => {
    setSelectedItem(item);
    setSelectedRequest(null);
    if (!item.requestId) return;
    setDetailLoading(true);
    try {
      setSelectedRequest(await fetchRequestDetails(item.requestId));
    } catch {
      setSelectedRequest(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchUserLedger(userId, 1, 50)
      .then((response) => {
        const body = (response as LedgerResponseLike).data || response;
        setItems(body.items || []);
        setLifetimeEarnings(
          (response as LedgerResponseLike).summary?.totalEarning ??
            body.summary?.totalEarning ??
            null,
        );
      })
      .catch(() =>
        setError(
          "We could not load your earnings right now. Please try again.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const visibleItems = useMemo(() => {
    const sorted = [...items].sort(
      (first, second) =>
        new Date(second.createdAt || 0).getTime() -
        new Date(first.createdAt || 0).getTime(),
    );
    if (period === "all") return sorted;
    const past = new Date();
    if (period === "week") past.setDate(past.getDate() - 7);
    if (period === "month") past.setMonth(past.getMonth() - 1);
    if (period === "year") past.setFullYear(past.getFullYear() - 1);
    return sorted.filter((item) => new Date(item.createdAt || 0) >= past);
  }, [items, period]);

  const stats = visibleItems.reduce(
    (result, item) => {
      const amount = Number(item.finalAmount) || 0;
      if (item.type === "EARNING") {
        result.earned += amount;
        result.entries += 1;
        if (item.settlementStatus === "PENDING") result.pending += amount;
      }
      if (item.type === "PAYOUT") result.paid += amount;
      if (item.type === "PENALTY") result.deductions += Math.abs(amount);
      return result;
    },
    { earned: 0, paid: 0, pending: 0, deductions: 0, entries: 0 },
  );

  return (
    <section className="app-placeholder content-width profile-options-page earnings-page">
      <Link
        className="text-link venue-back-link"
        href={`/home/${gender}/payments`}
      >
        <span>←</span> Back to my payments
      </Link>
      <header className="app-option-heading">
        <p className="eyebrow">MY EARNINGS</p>
        <h1>Every entry, accounted for.</h1>
        <p className="lede">
          View your processed earnings, bank payouts, pending amounts, and
          deductions.
        </p>
      </header>
      {loading ? (
        <div className="empty-panel">
          <span>Loading your earnings...</span>
        </div>
      ) : error ? (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      ) : (
        <>
          <div
            className="earnings-periods"
            role="tablist"
            aria-label="Earnings period"
          >
            {periods.map(([key, label]) => (
              <button
                className={period === key ? "earnings-period-active" : ""}
                key={key}
                type="button"
                role="tab"
                aria-selected={period === key}
                onClick={() => setPeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {lifetimeEarnings !== null && (
            <p className="earnings-lifetime">
              Lifetime earnings:{" "}
              <strong>{formatAmount(lifetimeEarnings)}</strong>
            </p>
          )}
          <section className="earnings-hero">
            <p>You earned {period === "all" ? "overall" : `this ${period}`}</p>
            <strong>{formatAmount(stats.earned)}</strong>
            <span>
              {stats.entries}{" "}
              {stats.entries === 1 ? "club entry" : "club entries"} completed
            </span>
          </section>
          <div className="earnings-stats">
            <div>
              <strong>{formatAmount(stats.paid)}</strong>
              <span>Paid to bank</span>
            </div>
            <div>
              <strong>{formatAmount(stats.pending)}</strong>
              <span>Pending</span>
            </div>
            <div>
              <strong>{formatAmount(stats.deductions)}</strong>
              <span>Deductions</span>
            </div>
          </div>
          <h2 className="earnings-activity-heading">Earnings activity</h2>
          <div className="earnings-activity">
            {visibleItems.length ? (
              visibleItems.map((item, index) => (
                <button
                  type="button"
                  className={`earnings-row earnings-row-${item.type?.toLowerCase()}`}
                  key={`${item.id || "item"}-${index}`}
                  onClick={() => void openEntryDetails(item)}
                >
                  <span className="earnings-row-icon">
                    {item.type === "PENALTY" ? "↓" : "↑"}
                  </span>
                  <div>
                    <strong>{typeLabel(item)}</strong>
                    <small>
                      {formatDate(item.createdAt)}
                      {item.type === "PAYOUT"
                        ? ` · ${item.settlementStatus === "PENDING" ? "Being processed" : "Sent to bank"}`
                        : ""}
                    </small>
                  </div>
                  <b>
                    {item.type === "PENALTY" ? "-" : "+"}
                    {formatAmount(Math.abs(Number(item.finalAmount) || 0))}
                  </b>
                </button>
              ))
            ) : (
              <div className="empty-panel">
                <strong>
                  {items.length
                    ? "No activity for this period"
                    : "No earnings yet"}
                </strong>
                <span>
                  Completed club entries and bank payouts will appear here.
                </span>
              </div>
            )}
          </div>
        </>
      )}
      {selectedItem && (
        <div
          className="action-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedItem(null)}
        >
          <section
            className="action-modal earnings-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="earnings-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close-button"
              type="button"
              aria-label="Close details"
              onClick={() => setSelectedItem(null)}
            >
              ×
            </button>
            <div className="earnings-detail-header">
              <div>
                <p className="eyebrow" id="earnings-detail-title">
                  {detailTitle(selectedItem)}
                </p>
                <small>{formatDate(selectedItem.createdAt)}</small>
              </div>
            </div>
            <div
              className={`earnings-detail-amount earnings-detail-amount-${selectedItem.type?.toLowerCase()}`}
            >
              {selectedItem.type === "EARNING"
                ? "+"
                : selectedItem.type === "PENALTY"
                  ? "-"
                  : ""}
              {formatAmount(Math.abs(Number(selectedItem.finalAmount) || 0))}
              <small>
                {selectedItem.type === "PAYOUT"
                  ? settlementLabel(selectedItem.settlementStatus)
                  : detailReason(selectedItem)}
              </small>
            </div>
            {detailLoading && (
              <p className="earnings-detail-loading">Loading related entry...</p>
            )}
            {selectedRequest && (
              <div className="earnings-detail-section">
                <h3>Related club entry</h3>
                <DetailRow label="Club" value={selectedRequest.clubName} />
                <DetailRow
                  label="Entry type"
                  value={selectedRequest.visitPlanId ? "Visit plan entry" : "Regular club entry"}
                />
                <DetailRow
                  label="Entry date"
                  value={`${formatDate(selectedRequest.datetime)}${selectedRequest.timezone ? ` · ${selectedRequest.timezone}` : ""}`}
                />
              </div>
            )}
            <div className="earnings-detail-section">
              <h3>
                {selectedItem.type === "PAYOUT"
                  ? "Payout breakdown"
                  : "Amount breakdown"}
              </h3>
              {selectedItem.type === "PAYOUT" && (
                <DetailRow
                  label="Entries included"
                  value={`${selectedItem.requestIds?.length || 0} club entries`}
                />
              )}
              {selectedItem.basePrice !== undefined && (
                <DetailRow label="Entry amount" value={formatAmount(selectedItem.basePrice)} />
              )}
              {selectedItem.platformFee ? (
                <DetailRow label="Platform fee" value={`-${formatAmount(selectedItem.platformFee)}`} />
              ) : null}
              {selectedItem.gst ? (
                <DetailRow label="GST" value={`-${formatAmount(selectedItem.gst)}`} />
              ) : null}
              {selectedItem.penalty ? (
                <DetailRow label="Deduction" value={`-${formatAmount(Math.abs(selectedItem.penalty))}`} />
              ) : null}
              <DetailRow
                label={selectedItem.type === "PAYOUT" ? "Amount sent" : selectedItem.type === "EARNING" ? "Your earning" : "Deduction"}
                value={`${selectedItem.type === "PENALTY" ? "-" : ""}${formatAmount(Math.abs(Number(selectedItem.finalAmount) || 0))}`}
              />
              <DetailRow label="Status" value={settlementLabel(selectedItem.settlementStatus)} />
            </div>
            {selectedItem.referenceId && (
              <p className="earnings-detail-reference">
                Payout reference: {selectedItem.referenceId}
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="earnings-detail-row">
      <span>{label}</span>
      <strong>{value || "Not available"}</strong>
    </div>
  );
}

type LedgerResponseLike = {
  data?: { items?: LedgerItem[]; summary?: { totalEarning?: number } };
  summary?: { totalEarning?: number };
};
