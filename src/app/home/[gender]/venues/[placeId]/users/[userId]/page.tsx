"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  createEntryRequest,
  fetchBlockedUsers,
  fetchPlaceDetails,
  fetchUserDetails,
  PlaceDetails,
  toggleBlockUser,
  UserProfile,
} from "@/lib/api";
import Avatar from "@/components/avatar";

const reportReasons = ["Fake profile", "Harassment", "Spam", "Inappropriate content", "Impersonation", "Other"];
const blockReasons = ["I do not want to interact with this user", "Unwanted requests or messages", "Safety concern", "Other"];

export default function UserProfilePage() {
  const params = useParams<{ gender: string; placeId: string; userId: string }>();
  const router = useRouter();
  const role = params.gender?.toLowerCase() === "female" ? "female" : "male";
  const placeId = decodeURIComponent(params.placeId || "");
  const userId = decodeURIComponent(params.userId || "");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestDateTime, setRequestDateTime] = useState(getDefaultDateTime());
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [blockReason, setBlockReason] = useState(blockReasons[0]);
  const [blockComment, setBlockComment] = useState("");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showProfileImage, setShowProfileImage] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [legalTitle, setLegalTitle] = useState("STAG Terms & Conditions");
  const [showRequestConfirmation, setShowRequestConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }

    if (!userId || !placeId) {
      setError("This profile could not be identified.");
      setIsLoading(false);
      return;
    }

    Promise.all([fetchUserDetails(userId), fetchPlaceDetails(placeId)])
      .then(([user, place]) => {
        setProfile(user);
        setPlaceDetails(place);
      })
      .catch(() => setError("We could not load this user's details right now."))
      .finally(() => setIsLoading(false));

    fetchBlockedUsers()
      .then((blockedUsers) => setIsBlocked(blockedUsers.some((blockedUser) => blockedUser.id === userId)))
      .catch(() => {});
  }, [placeId, router, userId]);

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();
    const currentUserId = window.localStorage.getItem("stag_user_id");
    if (!currentUserId) {
      setError("Your account could not be identified. Please sign in again.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const location = placeDetails?.geometry?.location;
      await createEntryRequest({
        mUserId: currentUserId,
        fUserId: userId,
        datetime: new Date(requestDateTime).toISOString(),
        timezone: "Asia/Kolkata",
        coordinates: typeof location?.lat === "number" && typeof location?.lng === "number" ? [location.lat, location.lng] : undefined,
        clubName: placeDetails?.name,
        clubAddress: placeDetails?.formatted_address,
        placeId,
      });
      setMessage("");
      setShowRequestConfirmation(true);
    } catch {
      setError("We could not send this request. Please check the date and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBlock = async (reason?: string, comment?: string) => {
    const action = isBlocked ? "unblock" : "block";
    if (isBlocked && !window.confirm(`Are you sure you want to unblock ${profile?.name || "this user"}?`)) return;
    setIsSubmitting(true);
    setError("");
    try {
      await toggleBlockUser(userId, { reason, comment });
      setIsBlocked((value) => !value);
      setShowBlockModal(false);
      setBlockComment("");
    } catch {
      setError(`We could not ${action} this user. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBlock = async (event: FormEvent) => {
    event.preventDefault();
    await toggleBlock(blockReason, blockComment.trim());
  };

  const reportUser = () => {
    const subject = encodeURIComponent(`STAG user report: ${reportReason}`);
    const body = encodeURIComponent(`Reason: ${reportReason}\n\nReported profile: ${profile?.name || "the reported user"}\nReported user ID: ${userId}\n\nPlease describe what happened and include relevant date, time, venue, or chat details.`);
    window.location.href = `mailto:support@stag.org.in?subject=${subject}&body=${body}`;
  };

  return (
    <section className="app-placeholder content-width user-profile-page">
      <Link className="text-link venue-back-link" href={`/home/${role}/venues/${encodeURIComponent(placeId)}`}><span>←</span> Back to entry partners</Link>
      {isLoading ? (
        <div className="empty-panel"><span>Loading user details...</span></div>
      ) : profile ? (
        <>
          <div className="user-profile-header">
            <button className="user-profile-avatar-button" type="button" onClick={() => profile.profilePicFileId && setShowProfileImage(true)} aria-label="View profile picture">
              <Avatar
                userId={userId}
                className="user-profile-avatar"
                fallback={<div className="user-profile-avatar user-profile-avatar-placeholder">{getInitials(profile.name)}</div>}
              />
            </button>
            <div>
              <p className="eyebrow">MEMBER PROFILE</p>
              <h1>{profile.name || "STAG member"}</h1>
              {profile.selfieVerified && <span className="companion-verified">Verified profile</span>}
            </div>
          </div>

          <div className="user-profile-layout">
            <div className="user-profile-main">
              {placeDetails && <p className="user-profile-context">Available near {placeDetails.name || "this venue"}.</p>}
              <div className="user-profile-stats">
                <div><strong>{profile.entryCount ?? 0}</strong><span>Entries helped</span></div>
                {profile.dateOfBirth && <div><strong>{calculateAge(profile.dateOfBirth) || "-"}</strong><span>Years old</span></div>}
              </div>

              {message && <p className="form-message form-success" role="status">{message}</p>}
              {error && <p className="form-message form-error" role="alert">{error}</p>}

              {role === "male" && !isBlocked && (
                <form className="request-panel" onSubmit={submitRequest}>
                  <p className="eyebrow">REQUEST ENTRY HELP</p>
                  <h2>Choose a date and time.</h2>
                  <p>Send an entry request for {placeDetails?.name || "this venue"}.</p>
                  <aside className="entry-guidelines" aria-label="Entry-only guidelines">
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
                  <label className="entry-guidelines-acknowledgement"><input type="checkbox" required /> <span>I have read and agree to follow these entry-only guidelines and the <button className="text-link terms-inline-button" type="button" onClick={() => setShowTerms(true)}>STAG Terms &amp; Conditions</button>.</span></label>
                  <label><span className="visit-time-label">Visit date and time <button className="visit-time-info" type="button" aria-label="About approximate visit time"><span>i</span><em>This is an approximate time and may change slightly. Once payment is confirmed, you can coordinate the exact timing.</em></button></span><input className="date-time-input" type="datetime-local" min={getDefaultDateTime()} value={requestDateTime} onChange={(event) => setRequestDateTime(event.target.value)} required /></label>
                  <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send request"}</button>
                </form>
              )}
            </div>

            <aside className="user-profile-sidebar" aria-label="User actions">
              <section className="action-panel">
                <p className="eyebrow">SAFETY CONTROL</p>
                <h2>{isBlocked ? "User blocked" : "Block this user"}</h2>
                <p>{isBlocked ? "This user cannot interact with you until you unblock them." : "Blocking prevents this user from viewing your profile, contacting you, or sending requests."}</p>
                <button className="button button-secondary action-button" type="button" onClick={() => isBlocked ? void toggleBlock() : setShowBlockModal(true)} disabled={isSubmitting}>{isBlocked ? "Unblock user" : "Block user"}</button>
              </section>
              <section className="action-panel report-panel">
                <p className="eyebrow">REPORT A PROBLEM</p>
                <h2>Report this profile</h2>
                <p>Tell STAG what happened. Clicking the button will take you to your email app with a report addressed to support@stag.org.in.</p>
                <label>Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>{reportReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
                <button className="button button-secondary action-button" type="button" onClick={reportUser}>Open email to report</button>
              </section>
            </aside>
          </div>
        </>
      ) : (
        <div className="empty-panel"><strong>User details unavailable.</strong><span>{error || "Please return to the entry partners list."}</span></div>
      )}
      {showProfileImage && profile?.profilePicFileId && (
        <div className="profile-image-modal" role="dialog" aria-modal="true" aria-label="Profile picture" onClick={() => setShowProfileImage(false)}>
          <button type="button" aria-label="Close profile picture" onClick={() => setShowProfileImage(false)}>×</button>
          <Avatar userId={userId} size={320} style={{ borderRadius: 0, width: "100%", height: "auto" }} />
        </div>
      )}
      {showTerms && (
        <div className="terms-modal" role="dialog" aria-modal="true" aria-label={legalTitle}>
          <div className="terms-modal-content">
            <div className="terms-modal-header">
              <div className="terms-modal-heading"><span>STAG LEGAL</span><strong>{legalTitle}</strong></div>
              <button type="button" className="terms-modal-close" aria-label="Close legal document" onClick={() => setShowTerms(false)}>×</button>
            </div>
            <iframe className="terms-modal-frame" title={legalTitle} src="/terms?embedded=1" onLoad={(event) => {
              const path = new URL(event.currentTarget.src).pathname;
              setLegalTitle(path === "/privacy" ? "Privacy Policy" : path === "/child-safety" ? "Child Safety Standards" : "STAG Terms & Conditions");
            }} />
          </div>
        </div>
      )}
      {showRequestConfirmation && (
        <div className="action-modal-backdrop" role="presentation">
          <section className="action-modal request-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="request-confirmation-title">
            <p className="eyebrow">REQUEST SENT</p>
            <h2 id="request-confirmation-title">Your request is on its way.</h2>
            <p className="action-modal-copy">Your entry request for {formatRequestDateTime(requestDateTime)} at {placeDetails?.name || "this venue"} has been sent. You&apos;ll be notified once it is accepted.</p>
            <button className="button button-primary" type="button" onClick={() => router.push(`/home/${role}/venues/${encodeURIComponent(placeId)}`)}>Back to entry partners</button>
          </section>
        </div>
      )}
      {showBlockModal && profile && (
        <div className="action-modal-backdrop" role="presentation" onClick={() => !isSubmitting && setShowBlockModal(false)}>
          <form className="action-modal" onSubmit={submitBlock} onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">BLOCK USER</p>
            <h2>Why are you blocking {profile.name || "this user"}?</h2>
            <p className="action-modal-copy">Blocking stops this user from viewing your profile, contacting you, or sending requests.</p>
            <label>Reason<select value={blockReason} onChange={(event) => setBlockReason(event.target.value)}>{blockReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
            <label>Additional comment <span className="optional-label">Optional</span><textarea value={blockComment} onChange={(event) => setBlockComment(event.target.value)} placeholder="Add a little context for your records" rows={4} /></label>
            <div className="action-modal-buttons"><button className="button button-quiet" type="button" onClick={() => setShowBlockModal(false)} disabled={isSubmitting}>Cancel</button><button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Blocking..." : "Confirm block"}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}

function getDefaultDateTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getInitials(name?: string) {
  return (name || "STAG").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function calculateAge(value: string) {
  const [day, month, year] = value.split("-").map(Number);
  const birthDate = new Date(year, month - 1, day);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
  return age > 0 ? age : null;
}

function formatRequestDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}