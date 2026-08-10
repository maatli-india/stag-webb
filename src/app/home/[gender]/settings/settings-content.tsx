"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { confirmAccountDeletion, fetchBlockedUsers, requestAccountDeletion, toggleBlockUser, UserProfile } from "@/lib/api";

export default function SettingsContent({ gender }: { gender: string }) {
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(true);
  const [blockedUsersError, setBlockedUsersError] = useState("");
  const [unblockingUserId, setUnblockingUserId] = useState("");
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [pendingUnblockUser, setPendingUnblockUser] = useState<UserProfile | null>(null);

  const loadBlockedUsers = async () => {
    setBlockedUsersLoading(true);
    setBlockedUsersError("");
    try {
      setBlockedUsers(await fetchBlockedUsers());
    } catch {
      setBlockedUsersError("We could not load your blocked users right now.");
    } finally {
      setBlockedUsersLoading(false);
    }
  };

  useEffect(() => {
    void loadBlockedUsers();
  }, []);

  const unblockUser = async (user: UserProfile) => {
    if (!user.id || unblockingUserId) return;
    setUnblockingUserId(user.id);
    setBlockedUsersError("");
    try {
      await toggleBlockUser(user.id);
      setBlockedUsers((currentUsers) => currentUsers.filter((blockedUser) => blockedUser.id !== user.id));
    } catch {
      setBlockedUsersError("We could not unblock this user. Please try again.");
    } finally {
      setUnblockingUserId("");
    }
  };

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
      <section className="profile-option profile-option-static blocked-users-option blocked-users-trigger" role="button" tabIndex={0} onClick={() => setShowBlockedUsersModal(true)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setShowBlockedUsersModal(true); } }}><div className="profile-option-heading"><strong>Blocked users</strong><span className="text-link">View blocked users</span><small>Users you block cannot send you future requests or interact with you through STAG.</small><p className="settings-blocked-state">{blockedUsersLoading ? "Loading blocked users..." : blockedUsers.length === 0 ? "No blocked users" : `${blockedUsers.length} blocked ${blockedUsers.length === 1 ? "user" : "users"}`}</p></div></section>
      <section className="profile-option profile-option-static"><div className="profile-option-heading"><strong>18+ only</strong><small>STAG is rated 18+ because it helps adults coordinate entry at clubs, lounges, and other adult-oriented venues where alcohol may be served. STAG does not promote, sell, supply, or encourage alcohol, drugs, or any other substance use. Follow venue rules and never arrive intoxicated or under the influence of illegal substances.</small></div></section>
      <section className="profile-option profile-option-static"><div className="profile-option-heading"><strong>Privacy</strong><small>Review how STAG handles account, profile, request, and payment information.</small><Link className="text-link" href={`/home/${gender}/settings/privacy`}>Open privacy policy</Link></div></section>
      <section className="profile-option profile-option-static settings-delete-option"><div className="profile-option-heading"><strong>Delete my account</strong><small>Deleting your account permanently removes your STAG profile and ends access to the service. We may retain limited records where required for legal, fraud-prevention, payment, or dispute-resolution purposes.</small><p className="settings-delete-policy">Before deletion, complete or resolve any active requests. Account deletion cannot be reversed. A confirmation code will be sent to your registered phone number.</p>{deletionRequested ? <form className="settings-delete-form" onSubmit={confirmDeletion}><label>Confirmation code<input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} required /></label><button className="button button-primary" type="submit" disabled={isConfirmingDeletion}>{isConfirmingDeletion ? "Deleting account..." : "Confirm deletion"}</button></form> : <button className="button button-secondary settings-delete-button" type="button" onClick={() => setShowDeleteModal(true)} disabled={isRequestingDeletion}>{isRequestingDeletion ? "Sending code..." : "Delete my account"}</button>}{message && <p className="form-message form-success" role="status">{message}</p>}{error && <p className="form-message form-error" role="alert">{error}</p>}</div></section>
    </div>
    {showBlockedUsersModal && <div className="action-modal-backdrop" role="presentation" onClick={() => setShowBlockedUsersModal(false)}><section className="action-modal settings-blocked-modal" role="dialog" aria-modal="true" aria-labelledby="blocked-users-title" onClick={(event) => event.stopPropagation()}><div className="settings-modal-heading"><div><p className="eyebrow">SAFETY</p><h2 id="blocked-users-title">Blocked users</h2></div><button className="settings-modal-close" type="button" aria-label="Close blocked users" onClick={() => setShowBlockedUsersModal(false)}>×</button></div><p className="action-modal-copy">Users you block cannot send you future requests or interact with you through STAG.</p><div className="settings-blocked-modal-actions"><button className="text-link settings-refresh-button" type="button" onClick={() => void loadBlockedUsers()} disabled={blockedUsersLoading}>Refresh</button></div>{blockedUsersLoading ? <p className="settings-blocked-state">Loading blocked users...</p> : blockedUsers.length === 0 ? <div className="settings-blocked-empty"><strong>No blocked users</strong><span>Users you block will appear here, and you can unblock them at any time.</span></div> : <div className="settings-blocked-list">{blockedUsers.map((user) => <div className="settings-blocked-user" key={user.id}><span className="settings-blocked-avatar" style={getProfileImageStyle(user)}>{getProfileImage(user) ? "" : getInitials(user.name || "STAG")}</span><strong>{user.name || "STAG user"}</strong><button className="button button-secondary settings-unblock-button" type="button" onClick={() => setPendingUnblockUser(user)} disabled={unblockingUserId === user.id}>{unblockingUserId === user.id ? "Unblocking..." : "Unblock"}</button></div>)}</div>}{blockedUsersError && <p className="form-message form-error" role="alert">{blockedUsersError}</p>}<div className="action-modal-buttons"><button className="button button-primary" type="button" onClick={() => setShowBlockedUsersModal(false)}>Done</button></div></section></div>}
    {pendingUnblockUser && <div className="action-modal-backdrop" role="presentation" onClick={() => !unblockingUserId && setPendingUnblockUser(null)}><section className="action-modal settings-unblock-modal" role="dialog" aria-modal="true" aria-labelledby="unblock-user-title" onClick={(event) => event.stopPropagation()}><p className="eyebrow">SAFETY ACTION</p><h2 id="unblock-user-title">Unblock {pendingUnblockUser.name || "this user"}?</h2><p className="action-modal-copy">This user will be able to interact with you and send requests through STAG again.</p><div className="action-modal-buttons"><button className="button button-quiet" type="button" onClick={() => setPendingUnblockUser(null)} disabled={Boolean(unblockingUserId)}>Keep blocked</button><button className="button button-primary" type="button" onClick={() => { const user = pendingUnblockUser; setPendingUnblockUser(null); void unblockUser(user); }} disabled={Boolean(unblockingUserId)}>{unblockingUserId ? "Unblocking..." : "Confirm unblock"}</button></div></section></div>}
    {showDeleteModal && <div className="action-modal-backdrop" role="presentation" onClick={() => setShowDeleteModal(false)}><section className="action-modal settings-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={(event) => event.stopPropagation()}><p className="eyebrow">DELETE ACCOUNT</p><h2 id="delete-account-title">Are you sure?</h2><p className="action-modal-copy">This will start the permanent account deletion process. We will send a confirmation code to your registered phone number, and your account cannot be restored after verification.</p><div className="action-modal-buttons"><button className="button button-quiet" type="button" onClick={() => setShowDeleteModal(false)}>Keep my account</button><button className="button button-primary settings-delete-confirm" type="button" onClick={startAccountDeletion}>Continue to deletion</button></div></section></div>}
  </>;
}

function getProfileImage(user: UserProfile) {
  return user.profilePicUrl || user.profilePic || user.profilePicture || "";
}

function getProfileImageStyle(user: UserProfile) {
  const image = getProfileImage(user);
  return image ? { backgroundImage: `url(${image})` } : undefined;
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
