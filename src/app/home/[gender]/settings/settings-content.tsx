"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { confirmAccountDeletion, requestAccountDeletion } from "@/lib/api";

export default function SettingsContent({ gender }: { gender: string }) {
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const startAccountDeletion = async () => {
    setShowDeleteModal(false);
    setIsRequestingDeletion(true);
    setError("");
    setMessage("");
    try {
      await requestAccountDeletion();
      setDeletionRequested(true);
      setMessage("A confirmation code has been sent to your registered phone number.");
    } catch {
      setError("We could not start account deletion. You may have active requests, or your session may have expired.");
    } finally {
      setIsRequestingDeletion(false);
    }
  };

  const confirmDeletion = async (event: FormEvent) => {
    event.preventDefault();
    setIsConfirmingDeletion(true);
    setError("");
    try {
      await confirmAccountDeletion(otp.trim());
      window.localStorage.removeItem("stag_access_token");
      window.localStorage.removeItem("stag_refresh_token");
      window.localStorage.removeItem("stag_user_id");
      window.location.href = "/";
    } catch {
      setError("That confirmation code could not be verified. Please try again.");
    } finally {
      setIsConfirmingDeletion(false);
    }
  };

  return <>
    <div className="profile-options">
      <section className="profile-option profile-option-static"><div className="profile-option-heading"><strong>Community Guidelines</strong><small>Respect other members, venue staff, and security. Keep every request focused on legitimate venue entry assistance.</small><Link className="text-link" href={`/home/${gender}/settings/guidelines`}>Read guidelines</Link></div></section>
      <section className="profile-option profile-option-static"><div className="profile-option-heading"><strong>Safety Center</strong><small>Block or report profiles from the relevant user or request page. For urgent child-safety concerns, contact STAG support immediately.</small><Link className="text-link" href={`/home/${gender}/settings/safety`}>Safety standards</Link></div></section>
      <section className="profile-option profile-option-static"><div className="profile-option-heading"><strong>18+ only</strong><small>STAG is intended for adults aged 18 years or older. Venue admission remains subject to venue rules and management decisions.</small></div></section>
      <section className="profile-option profile-option-static"><div className="profile-option-heading"><strong>Privacy</strong><small>Review how STAG handles account, profile, request, and payment information.</small><Link className="text-link" href={`/home/${gender}/settings/privacy`}>Open privacy policy</Link></div></section>
      <section className="profile-option profile-option-static settings-delete-option"><div className="profile-option-heading"><strong>Delete my account</strong><small>Deleting your account permanently removes your STAG profile and ends access to the service. We may retain limited records where required for legal, fraud-prevention, payment, or dispute-resolution purposes.</small><p className="settings-delete-policy">Before deletion, complete or resolve any active requests. Account deletion cannot be reversed. A confirmation code will be sent to your registered phone number.</p>{deletionRequested ? <form className="settings-delete-form" onSubmit={confirmDeletion}><label>Confirmation code<input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} required /></label><button className="button button-primary" type="submit" disabled={isConfirmingDeletion}>{isConfirmingDeletion ? "Deleting account..." : "Confirm deletion"}</button></form> : <button className="button button-secondary settings-delete-button" type="button" onClick={() => setShowDeleteModal(true)} disabled={isRequestingDeletion}>{isRequestingDeletion ? "Sending code..." : "Delete my account"}</button>}{message && <p className="form-message form-success" role="status">{message}</p>}{error && <p className="form-message form-error" role="alert">{error}</p>}</div></section>
    </div>
    {showDeleteModal && <div className="action-modal-backdrop" role="presentation" onClick={() => setShowDeleteModal(false)}><section className="action-modal settings-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={(event) => event.stopPropagation()}><p className="eyebrow">DELETE ACCOUNT</p><h2 id="delete-account-title">Are you sure?</h2><p className="action-modal-copy">This will start the permanent account deletion process. We will send a confirmation code to your registered phone number, and your account cannot be restored after verification.</p><div className="action-modal-buttons"><button className="button button-quiet" type="button" onClick={() => setShowDeleteModal(false)}>Keep my account</button><button className="button button-primary settings-delete-confirm" type="button" onClick={startAccountDeletion}>Continue to deletion</button></div></section></div>}
  </>;
}
