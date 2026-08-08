"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ActiveRequest, cancelRequest, fetchBlockedUsers, fetchPaymentBreakdown, fetchPlaceDetails, fetchRequestDetails, fetchUserDetails, PaymentBreakdown, PlaceDetails, toggleBlockUser, UserProfile } from "@/lib/api";

const reportReasons = ["Fake profile", "Harassment", "Spam", "Inappropriate content", "Impersonation", "Other"];

export default function RequestDetailsPage() {
  const params = useParams<{ gender: string; requestId: string }>();
  const router = useRouter();
  const role = params.gender?.toLowerCase() === "female" ? "female" : "male";
  const requestId = decodeURIComponent(params.requestId || "");
  const [request, setRequest] = useState<ActiveRequest | null>(null);
  const [counterpartProfile, setCounterpartProfile] = useState<UserProfile | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [showProfileImage, setShowProfileImage] = useState(false);
  const [pendingSafetyAction, setPendingSafetyAction] = useState<"block" | "report" | "cancel" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }

    if (!requestId) {
      setError("This request could not be identified.");
      setIsLoading(false);
      return;
    }

    fetchRequestDetails(requestId)
      .then(async (details) => {
        setRequest(details);
        if (details.placeId) {
          try {
            setPlaceDetails(await fetchPlaceDetails(details.placeId));
          } catch {
            setPlaceDetails(null);
          }
        }
        const counterpart = role === "male" ? details.fUser : details.mUser;
        if (counterpart?.id) {
          try {
            setCounterpartProfile(await fetchUserDetails(counterpart.id));
          } catch {
            setCounterpartProfile(null);
          }
          fetchBlockedUsers()
            .then((blockedUsers) => setIsBlocked(blockedUsers.some((blockedUser) => blockedUser.id === counterpart.id)))
            .catch(() => {});
        }
        if (!details.payment && role === "male" && details.fUser?.id) {
          try {
            setPaymentBreakdown(await fetchPaymentBreakdown(details.fUser.id));
          } catch {
            setPaymentBreakdown(null);
          }
        }
      })
      .catch(() => setError("We could not load this request right now."))
      .finally(() => setIsLoading(false));
  }, [requestId, role, router]);

  const counterpart = request ? getCounterpart(request, role) : undefined;
  const displayName = counterpartProfile?.name || counterpart?.username || counterpart?.name || "Entry partner";
  const profileImage = counterpartProfile?.profilePicUrl || counterpart?.profilePicUrl;
  const storedPayment = request?.payment;
  const baseEntryAmount = storedPayment?.mUserBaseAmount ?? paymentBreakdown?.mUserBaseAmount ?? 0;
  const platformFee = storedPayment?.mUserPlatformFee ?? paymentBreakdown?.platformFee ?? 0;
  const gst = storedPayment?.mUserGST ?? paymentBreakdown?.gst ?? 0;
  const totalPayable = storedPayment?.mUserTotalPayable ?? paymentBreakdown?.total ?? 0;

  const toggleBlock = async () => {
    if (!counterpart?.id) return;
    setIsActionLoading(true);
    try {
      await toggleBlockUser(counterpart.id, { reason: isBlocked ? undefined : "Safety concern" });
      setIsBlocked((value) => !value);
    } catch {
      setError(`We could not ${isBlocked ? "unblock" : "block"} this user. Please try again.`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const reportUser = () => {
    const subject = encodeURIComponent(`STAG user report: ${reportReason}`);
    const body = encodeURIComponent(`Reason: ${reportReason}\n\nReported profile: ${displayName}\nVenue: ${request?.clubName || "Not provided"}\nVisit date: ${request?.datetime ? formatDate(request.datetime) : "Not provided"}\n\nPlease describe what happened and include any relevant details.`);
    window.location.href = `mailto:support@stag.org.in?subject=${subject}&body=${body}`;
  };

  const cancelCurrentRequest = async () => {
    if (!request?.id) return;
    setIsActionLoading(true);
    try {
      await cancelRequest(request.id);
      setRequest((currentRequest) => currentRequest ? { ...currentRequest, status: "cancelled" } : currentRequest);
      setPendingSafetyAction(null);
    } catch {
      setError("We could not cancel this request. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <section className="app-placeholder content-width request-details-page">
      <Link className="text-link venue-back-link" href={`/home/${role}/requests`}><span>←</span> Back to My Requests</Link>
      {isLoading ? (
        <div className="empty-panel"><span>Loading request details...</span></div>
      ) : request ? (
        <>
          <header className="request-details-heading">
            <div>
              <p className="eyebrow">REQUEST DETAILS</p>
              <h1>{request.clubName || "Club entry request"}</h1>
              <p className="lede">Everything you need for this request, including the entry partner, place, payment, and next step.</p>
            </div>
            <span className="request-details-status">{getStatusLabel(request)}</span>
          </header>

          <div className="request-details-grid">
            <section className="request-detail-section request-detail-panel">
              <p className="request-detail-heading">USER DETAILS</p>
              <div className="request-detail-profile-image">
                <button className="request-profile-image-button" type="button" onClick={() => setShowProfileImage(true)} aria-label="Tap to enlarge profile picture">
                  {profileImage ? <img src={profileImage} alt={`${displayName} profile`} /> : <div className="request-card-user-placeholder">{getInitials(displayName)}</div>}
                  <span className="request-profile-image-overlay">Tap to enlarge</span>
                </button>
              </div>
              <div className="request-card-user request-detail-profile-summary">
                <div><strong>{displayName}</strong><span>{counterpartProfile?.selfieVerified ? "Verified profile" : "Request participant"}</span></div>
              </div>
              {counterpartProfile?.dateOfBirth && <div><span>Age</span><strong>{calculateAge(counterpartProfile.dateOfBirth) || "-"}</strong></div>}
              {counterpart?.entryCount !== undefined && <div><span>Entries helped</span><strong>{counterpart.entryCount}</strong></div>}
              <div className="request-user-actions">
                <label className="request-report-reason">Report reason
                  <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} aria-label="Report reason">
                    {reportReasons.map((reason) => <option key={reason}>{reason}</option>)}
                  </select>
                </label>
                <div className="request-user-action-buttons">
                  <button className="button button-secondary request-user-action-button" type="button" onClick={() => setPendingSafetyAction("block")} disabled={isActionLoading}>{isActionLoading ? "Updating..." : isBlocked ? "Unblock user" : "Block user"}</button>
                  <button className="button button-secondary request-user-action-button request-user-report-button" type="button" onClick={() => setPendingSafetyAction("report")} disabled={isActionLoading}>Report profile</button>
                </div>
              </div>
            </section>

            <section className="request-detail-section request-detail-panel">
              <p className="request-detail-heading">PLACE DETAILS</p>
              <div><span>Venue</span><strong>{request.clubName || "To be confirmed"}</strong></div>
              <div><span>Address</span><strong>{request.clubAddress || "Not provided"}</strong></div>
              {placeDetails?.opening_hours?.open_now !== undefined && <div><span>Venue status</span><strong className={placeDetails.opening_hours.open_now ? "venue-open" : "venue-closed"}>{placeDetails.opening_hours.open_now ? "Open now" : "Closed now"}</strong></div>}
              {placeDetails?.opening_hours?.weekday_text?.length ? <div className="place-timings"><span>Place timings</span><strong>{placeDetails.opening_hours.weekday_text.join(" | ")}</strong></div> : <div><span>Place timings</span><strong>Not available</strong></div>}
            </section>

            <section className="request-detail-section request-detail-panel">
              <p className="request-detail-heading">REQUEST DETAILS</p>
              {request.datetime && <div><span className="visit-time-label">Visit date and time <button className="visit-time-info" type="button" aria-label="About approximate visit time"><span>i</span><em>This is an approximate time and may change slightly. Once payment is confirmed, you can coordinate the exact timing.</em></button></span><strong>{formatDate(request.datetime)}</strong></div>}
              <div><span>Status</span><strong>{getStatusLabel(request)}</strong></div>
              <div><span>Payment</span><strong>{getPaymentLabel(request)}</strong></div>
              <p className="request-card-next-step">{getNextStep(request)}</p>
              {canCancelRequest(request) && <button className="request-cancel-action" type="button" onClick={() => setPendingSafetyAction("cancel")} disabled={isActionLoading}>Cancel request</button>}
            </section>
          </div>

          {(request.payment || paymentBreakdown) && (
            <section className="request-payment-panel">
              <p className="request-detail-heading">PAYMENT BREAKDOWN</p>
              <div className="request-payment-grid">
                {role === "male" ? <>
                  <div><span>STAG entry fee</span><strong>{formatCurrency(baseEntryAmount + platformFee)}</strong></div>
                  <div><span>GST</span><strong>{formatCurrency(gst)}</strong></div>
                  <div><span>Total payable to STAG</span><strong>{formatCurrency(totalPayable)}</strong></div>
                  <div><span>Payment status</span><strong>{formatPaymentStatus(storedPayment?.paymentStatus)}</strong></div>
                </> : <>
                  <div><span>STAG platform payout</span><strong>{formatCurrency(storedPayment?.fUserNetPayout)}</strong></div>
                  <div><span>STAG platform fee</span><strong>{formatCurrency(storedPayment?.fUserPlatformFee)}</strong></div>
                  <div><span>GST</span><strong>{formatCurrency(storedPayment?.fUserGST)}</strong></div>
                  <div><span>Payment status</span><strong>{formatPaymentStatus(storedPayment?.paymentStatus)}</strong></div>
                </>}
              </div>
              {role === "male" && canPayAndConfirm(request) && <button className="request-payment-action" type="button">Pay and Confirm</button>}
            </section>
          )}
          {role === "male" && (
            <aside className="entry-guidelines request-entry-guidelines" aria-label="Entry-only guidelines">
              <p className="eyebrow">ENTRY-ONLY GUIDELINES</p>
              <h3>Keep the request respectful and venue-focused.</h3>
              <ul>
                <li>This request is only for club entry assistance at the selected venue and time.</li>
                <li>Follow the venue&apos;s rules and treat the other member, staff, and security with respect.</li>
                <li>Do not request or offer sexual services, illegal activity, harassment, coercion, or anything outside the stated entry purpose.</li>
                <li>Never send money, payment credentials, OTPs, or personal documents directly to another member.</li>
              </ul>
              <p className="entry-guidelines-warning">Misconduct may result in cancellation, account suspension, venue reporting, or reports to law enforcement where appropriate. You may also face civil or criminal consequences under applicable law.</p>
            </aside>
          )}
        </>
      ) : (
        <div className="empty-panel"><strong>Request details unavailable.</strong><span>{error || "Please return to My Requests."}</span></div>
      )}
      {showProfileImage && (
        <div className="request-profile-image-modal" role="dialog" aria-modal="true" aria-label={`${displayName} profile picture`} onClick={() => setShowProfileImage(false)}>
          <button type="button" aria-label="Close profile picture" onClick={() => setShowProfileImage(false)}>×</button>
          {profileImage ? <img src={profileImage} alt={`${displayName} profile`} /> : <div className="request-profile-image-modal-placeholder">{getInitials(displayName)}</div>}
        </div>
      )}
      {pendingSafetyAction && (
        <div className="request-safety-modal" role="presentation" onClick={() => !isActionLoading && setPendingSafetyAction(null)}>
          <div className="request-safety-dialog" role="dialog" aria-modal="true" aria-labelledby="request-safety-title" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">{pendingSafetyAction === "cancel" ? "CANCEL REQUEST" : "SAFETY ACTION"}</p>
            <h2 id="request-safety-title">{pendingSafetyAction === "block" ? `${isBlocked ? "Unblock" : "Block"} ${displayName}?` : pendingSafetyAction === "cancel" ? "Cancel this request?" : "Report this profile?"}</h2>
            <p>{pendingSafetyAction === "block" ? (isBlocked ? "This user will be able to interact with you again." : "Blocking prevents this user from viewing your profile, contacting you, or sending requests.") : pendingSafetyAction === "cancel" ? "This will cancel the confirmed request. Any refund or cancellation charge will follow STAG's cancellation policy." : `Your report will be prepared for STAG support with the reason: ${reportReason}.`}</p>
            <div className="request-safety-dialog-actions">
              <button className="button button-secondary" type="button" onClick={() => setPendingSafetyAction(null)} disabled={isActionLoading}>Cancel</button>
              <button className="button request-safety-confirm" type="button" onClick={() => { const action = pendingSafetyAction; if (action === "block") { setPendingSafetyAction(null); void toggleBlock(); } else if (action === "cancel") { void cancelCurrentRequest(); } else { setPendingSafetyAction(null); reportUser(); } }} disabled={isActionLoading}>{isActionLoading ? "Processing..." : pendingSafetyAction === "block" ? (isBlocked ? "Confirm unblock" : "Confirm block") : pendingSafetyAction === "cancel" ? "Confirm cancellation" : "Confirm report"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function getCounterpart(request: ActiveRequest, role: string) {
  return role === "male" ? request.fUser : request.mUser;
}

function getStatusLabel(request: ActiveRequest) {
  if (request.payment?.paymentStatus === "completed" || request.status === "confirmed" || request.status === "verified") return "CONFIRMED";
  if (request.status === "accepted" || request.status === "confirm_intended" || request.status === "payment_initiated") return "AWAITING PAYMENT";
  if (request.status === "pending") return "AWAITING CONFIRMATION";
  return (request.status || "PENDING").replaceAll("_", " ").toUpperCase();
}

function getPaymentLabel(request: ActiveRequest) {
  if (request.payment?.paymentStatus === "completed") return "Completed";
  if (request.status === "accepted" || request.status === "confirm_intended" || request.status === "payment_initiated") return "Payment required after acceptance";
  return "Not required yet";
}

function getNextStep(request: ActiveRequest) {
  if (request.payment?.paymentStatus === "completed" || request.status === "confirmed" || request.status === "verified") return "Your request is confirmed. Keep this request available for your visit.";
  if (request.status === "accepted" || request.status === "confirm_intended" || request.status === "payment_initiated") return "Pay and confirm this request to continue.";
  if (request.status === "pending") return "Wait for the entry partner to accept this request.";
  return "Check this request for the latest status.";
}

function canPayAndConfirm(request: ActiveRequest) {
  return request.status === "accepted" || request.status === "confirm_intended" || request.status === "payment_initiated";
}

function canCancelRequest(request: ActiveRequest) {
  return request.status === "confirmed" || request.status === "verified";
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function calculateAge(value: string) {
  const parts = value.split("-").map(Number);
  const birthDate = parts[0] > 31 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(parts[2], parts[1] - 1, parts[0]);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
  return age > 0 ? age : null;
}

function formatCurrency(amount?: number) {
  return `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount ?? 0)}`;
}

function formatPaymentStatus(status?: string) {
  return status ? status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not started";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
