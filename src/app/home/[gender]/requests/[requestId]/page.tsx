"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ActiveRequest, cancelRequest, confirmRequestForPayment, createPaymentOrder, fetchBlockedUsers, fetchPaymentBreakdown, fetchPlaceDetails, fetchRequestDetails, fetchUserDetails, PaymentBreakdown, PlaceDetails, respondToRequest, toggleBlockUser, UserProfile, verifyMeetupEntryCode, verifyPayment } from "@/lib/api";

const reportReasons = ["Fake profile", "Harassment", "Spam", "Inappropriate content", "Impersonation", "Other"];

type RazorpayCheckout = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadRazorpayCheckout() {
  if (typeof window === "undefined") return Promise.reject(new Error("Payment is only available in a browser."));
  if (window.Razorpay) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Payment checkout could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Payment checkout could not be loaded."));
    document.body.appendChild(script);
  });
}

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
  const [responseAction, setResponseAction] = useState<"accepted" | "rejected" | null>(null);
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [showProfileImage, setShowProfileImage] = useState(false);
  const [pendingSafetyAction, setPendingSafetyAction] = useState<"block" | "report" | "cancel" | null>(null);
  const [cancellationConfirmed, setCancellationConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [meetupCode, setMeetupCode] = useState("");
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");
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

  useEffect(() => {
    const handleRequestUpdate = (event: Event) => {
      const updatedRequestId = (event as CustomEvent<{ requestId?: string }>).detail?.requestId;
      if (updatedRequestId && updatedRequestId !== requestId) return;
      void fetchRequestDetails(requestId).then(setRequest).catch(() => {});
    };

    window.addEventListener("stag-request-updated", handleRequestUpdate);
    return () => window.removeEventListener("stag-request-updated", handleRequestUpdate);
  }, [requestId]);

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
      try {
        setRequest(await fetchRequestDetails(request.id));
      } catch {
        setRequest((currentRequest) => currentRequest ? { ...currentRequest, status: "cancelled" } : currentRequest);
      }
      setPendingSafetyAction(null);
      setCancellationConfirmed(true);
    } catch {
      setError("We could not cancel this request. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const respondToCurrentRequest = async (status: "accepted" | "rejected") => {
    if (!request?.id || responseAction) return;
    setError("");
    setResponseAction(status);
    try {
      await respondToRequest(request.id, status);
      const latestRequest = await fetchRequestDetails(request.id);
      setRequest(latestRequest);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : `We could not ${status === "accepted" ? "accept" : "reject"} this request. Please try again.`);
    } finally {
      setResponseAction(null);
    }
  };

  const payAndConfirm = async () => {
    if (!request?.id || !request.fUser?.id || !totalPayable || isPaymentLoading) return;
    setError("");
    setPaymentMessage("");
    setIsPaymentLoading(true);

    try {
      await confirmRequestForPayment(request.id, request.fUser.id);
      const order = await createPaymentOrder({
        amount: totalPayable,
        currency: "INR",
        description: "Payment for club entry",
        entityType: "request",
        entityDetails: { requestId: request.id, fUserId: request.fUser.id },
      });

      if (!order.orderId || !order.amount) throw new Error("We could not create the payment order.");
      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Payment checkout could not be loaded.");
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY || order.keyId || order.key;
      if (!razorpayKey) throw new Error("Payment is not configured for this website.");

      const checkout = new window.Razorpay({
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "STAG",
        description: "Payment for club entry",
        order_id: order.orderId,
        theme: { color: "#FF0F29" },
        modal: { ondismiss: () => setIsPaymentLoading(false) },
        handler: async (response: { razorpay_order_id?: string }) => {
          try {
            await verifyPayment({
              orderId: response.razorpay_order_id || order.orderId || "",
              requestId: request.id || "",
              status: "completed",
            });
            const latestRequest = await fetchRequestDetails(request.id || "");
            setRequest(latestRequest);
            setPaymentMessage("Payment complete. Your club entry is confirmed.");
          } catch {
            setError("Payment was received, but confirmation is still processing. Refresh this page in a moment.");
          } finally {
            setIsPaymentLoading(false);
          }
        },
      });

      checkout.on("payment.failed", (response) => {
        setError(response.error?.description || "Payment could not be completed. Please try again.");
        setIsPaymentLoading(false);
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Unable to start payment. Please try again.");
      setIsPaymentLoading(false);
    }
  };

  const submitMeetupCode = async () => {
    const code = meetupCode.trim();
    if (!request?.id || !code || isCodeLoading) return;
    setCodeMessage("");
    setError("");
    setIsCodeLoading(true);
    try {
      const coordinates = await getCurrentCoordinates();
      await verifyMeetupEntryCode(request.id, code, coordinates || undefined);
      const latestRequest = await fetchRequestDetails(request.id);
      setRequest(latestRequest);
      setMeetupCode("");
      setCodeMessage("Code verified. This request has been updated.");
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Unable to verify the code. Please try again.");
    } finally {
      setIsCodeLoading(false);
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
            <span className="request-details-status">{getStatusLabel(request, role)}</span>
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
              <div><span>Status</span><strong>{getStatusLabel(request, role)}</strong></div>
              <div><span>Payment</span><strong>{getPaymentLabel(request, role)}</strong></div>
              <p className="request-card-next-step">{getNextStep(request, role)}</p>
              {canCancelRequest(request) && <button className="request-cancel-action" type="button" onClick={() => setPendingSafetyAction("cancel")} disabled={isActionLoading}>Cancel request</button>}
            </section>
          </div>

          {isCancelled(request) && (
            <section className="request-detail-section request-detail-panel request-cancellation-panel">
              <p className="request-detail-heading">CANCELLATION DETAILS</p>
              <div><span>Cancelled by</span><strong>{getCancellationActor(request, role)}</strong></div>
              {request.cancelledAt && <div><span>Cancelled on</span><strong>{formatDate(request.cancelledAt)}</strong></div>}
              <div><span>Request status</span><strong>Cancelled</strong></div>
              <div><span>Payment status</span><strong>{formatPaymentStatus(storedPayment?.paymentStatus)}</strong></div>
              {storedPayment?.refundAmount !== undefined && <div><span>Refund amount</span><strong>{formatCurrency(storedPayment.refundAmount)}</strong></div>}
              {storedPayment?.refundStatus && <div><span>Refund status</span><strong>{formatPaymentStatus(storedPayment.refundStatus)}</strong></div>}
              {storedPayment?.refundId && <div><span>Refund reference</span><strong>{storedPayment.refundId}</strong></div>}
              {storedPayment?.refundProcessedAt && <div><span>Refund processed on</span><strong>{formatDate(storedPayment.refundProcessedAt)}</strong></div>}
              <p className="request-card-next-step">Refunds generally appear in the original payment method within 2 to 5 business days after processing. Bank or payment-provider timelines may vary.</p>
            </section>
          )}

          {(request.status === "confirmed" || request.status === "verified") && (
            <section className="request-detail-section request-detail-panel">
              {((role === "female" && request.status === "confirmed") || (role === "male" && request.status === "verified")) && <>
                <p className="request-detail-heading">{role === "female" ? "Club Arrival Code" : "Club Entry Code"}</p>
                <p className="request-code-description">{role === "female" ? "Share this code at the club entrance." : "Share this code at the club entrance to confirm entry."}</p>
                {(role === "female" ? request.fUser?.otp : request.mUser?.otp) && <div className="request-code-display">
                  {(role === "female" ? request.fUser?.otp : request.mUser?.otp)?.split("").map((digit, index) => <div key={index} className="request-code-digit">{digit}</div>)}
                </div>}
              </>}
              {role === "female" && request.status === "verified" && (
                <p className="request-code-instruction">Get the Club Entry Code from {displayName || "the user"}, then enter it.</p>
              )}
              {role === "female" && request.status === "confirmed" && (
                <p className="request-code-instruction">After arrival is verified, enter the Club Entry Code.</p>
              )}
              {role === "male" && request.status === "confirmed" && (
                <p className="request-code-instruction">Get the Club Arrival Code from {displayName || "the user"} and enter it.</p>
              )}
              {((role === "male" && request.status === "confirmed") || (role === "female" && request.status === "verified")) && (
                <div className="request-code-entry">
                  <label htmlFor="meetup-code">{role === "male" ? "Enter Club Arrival Code" : "Enter Club Entry Code"}</label>
                  <div className="request-code-entry-row">
                    <input id="meetup-code" value={meetupCode} onChange={(event) => setMeetupCode(event.target.value.replace(/\s/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" placeholder="Enter code" aria-label="Meetup or entry code" disabled={isCodeLoading} />
                    <button className="button request-code-submit" type="button" onClick={() => void submitMeetupCode()} disabled={isCodeLoading || !meetupCode.trim()}>{isCodeLoading ? "Verifying..." : "Verify code"}</button>
                  </div>
                  {codeMessage && <p className="request-payment-success" role="status">{codeMessage}</p>}
                  {error && <p className="request-payment-error" role="alert">{error}</p>}
                </div>
              )}
            </section>
          )}

          {(request.payment || paymentBreakdown) && (
            <section className="request-payment-panel">
              <p className="request-detail-heading">PAYMENT BREAKDOWN</p>
              <div className="request-payment-grid">
                {role === "male" ? <>
                  <div><span>STAG entry fee</span><strong>{formatCurrency(baseEntryAmount + platformFee)}</strong></div>
                  <div><span>GST</span><strong>{formatCurrency(gst)}</strong></div>
                  <div><span>Total payable to STAG</span><strong>{formatCurrency(totalPayable)}</strong></div>
                  <div><span>Payment status</span><strong>{formatPaymentStatus(storedPayment?.paymentStatus)}</strong></div>
                  {storedPayment?.refundStatus && <div><span>Refund status</span><strong>{formatPaymentStatus(storedPayment.refundStatus)}</strong></div>}
                  {storedPayment?.refundAmount !== undefined && <div><span>Refund amount</span><strong>{formatCurrency(storedPayment.refundAmount)}</strong></div>}
                </> : <>
                  <div><span>STAG platform payout</span><strong>{formatCurrency(storedPayment?.fUserNetPayout)}</strong></div>
                  <div><span>STAG platform fee</span><strong>{formatCurrency(storedPayment?.fUserPlatformFee)}</strong></div>
                  <div><span>GST</span><strong>{formatCurrency(storedPayment?.fUserGST)}</strong></div>
                  <div><span>Payment status</span><strong>{formatPaymentStatus(storedPayment?.paymentStatus)}</strong></div>
                  {storedPayment?.refundStatus && <div><span>Refund status</span><strong>{formatPaymentStatus(storedPayment.refundStatus)}</strong></div>}
                  {storedPayment?.refundAmount !== undefined && <div><span>Refund amount</span><strong>{formatCurrency(storedPayment.refundAmount)}</strong></div>}
                </>}
              </div>
              {role === "male" && canPayAndConfirm(request) && (
                <>
                  <button className="request-payment-action" type="button" onClick={() => void payAndConfirm()} disabled={isPaymentLoading}>
                    {isPaymentLoading ? "Opening secure checkout..." : "Pay and Confirm"}
                  </button>
                  {paymentMessage && <p className="request-payment-success" role="status">{paymentMessage}</p>}
                  {error && <p className="request-payment-error" role="alert">{error}</p>}
                </>
              )}
            </section>
          )}
          {role === "female" && request.status === "pending" && (
            <section className="request-response-panel" aria-label="Respond to request">
              <p className="request-detail-heading">RESPONSE REQUIRED</p>
              <div className="request-response-actions">
                <p>Action required: respond to this entry request</p>
                <div>
                  <button className="button request-response-accept" type="button" onClick={() => void respondToCurrentRequest("accepted")} disabled={Boolean(responseAction)}>{responseAction === "accepted" ? "Accepting..." : "Accept request"}</button>
                  <button className="button request-response-reject" type="button" onClick={() => void respondToCurrentRequest("rejected")} disabled={Boolean(responseAction)}>{responseAction === "rejected" ? "Rejecting..." : "Reject request"}</button>
                </div>
              </div>
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
      {cancellationConfirmed && (
        <div className="request-safety-modal" role="presentation" onClick={() => setCancellationConfirmed(false)}>
          <div className="request-safety-dialog" role="dialog" aria-modal="true" aria-labelledby="cancellation-confirmed-title" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">REQUEST CANCELLED</p>
            <h2 id="cancellation-confirmed-title">Your request has been cancelled.</h2>
            <p>The request details have been updated. Any refund or cancellation charge will follow STAG&apos;s cancellation policy.</p>
            <div className="request-safety-dialog-actions">
              <button className="button request-safety-confirm" type="button" onClick={() => setCancellationConfirmed(false)}>Done</button>
            </div>
          </div>
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

function isCancelled(request: ActiveRequest) {
  return ["cancelled", "canceled"].includes(request.status || "");
}

function getCancellationActor(request: ActiveRequest, role: string) {
  if (!request.cancelledBy) return "Not available";
  const loggedInParticipant = role === "male" ? request.mUser : request.fUser;
  if (request.cancelledBy === loggedInParticipant?.id) return "You";
  const counterpart = role === "male" ? request.fUser : request.mUser;
  if (request.cancelledBy === counterpart?.id) {
    return counterpart.name || counterpart.username || (role === "male" ? "Entry partner" : "Member");
  }
  return request.cancelledBy;
}

function getStatusLabel(request: ActiveRequest, role: string) {
  if (isCancelled(request)) return "Cancelled";
  if (request.status === "completed") return "Completed";
  if (request.payment?.paymentStatus === "completed" || request.status === "confirmed") return "Confirmed";
  if (request.status === "verified") return "Verified";
  if (request.status === "pending") return role === "female" ? "Your response needed" : "Response pending";
  if (request.status === "accepted" || request.status === "confirm_intended") return role === "female" ? "Accepted" : "Pay to confirm";
  if (request.status === "payment_initiated") return "Payment processing";
  if (["rejected", "declined", "refused"].includes(request.status || "")) return "Not accepted";
  return "Request updated";
}

function getPaymentLabel(request: ActiveRequest, role: string) {
  if (isCancelled(request)) return "Cancelled";
  if (request.payment?.paymentStatus === "completed") return "Complete";
  if (request.status === "payment_initiated") return role === "female" ? "Payment processing" : "Payment needed to confirm";
  if (request.status === "accepted" || request.status === "confirm_intended") return role === "female" ? "Awaiting entry partner payment" : "Payment needed to confirm";
  return "No payment needed yet";
}

function getNextStep(request: ActiveRequest, role: string) {
  if (isCancelled(request)) return "This request has been cancelled.";
  if (request.status === "completed") return "Your club entry request is completed.";
  if (request.payment?.paymentStatus === "completed" || request.status === "confirmed" || request.status === "verified") return "Your request is confirmed. Keep this request available for your visit.";
  if (request.status === "payment_initiated") return role === "female" ? "Payment is processing. Your request will be confirmed once payment is complete." : "Pay and confirm this request to continue.";
  if (request.status === "accepted" || request.status === "confirm_intended") return role === "female" ? "Your request was accepted. Wait for the entry partner to pay and confirm." : "Pay and confirm this request to continue.";
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

function getCurrentCoordinates() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve<number[] | null>(null);
  return new Promise<number[] | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.longitude, coords.latitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}
