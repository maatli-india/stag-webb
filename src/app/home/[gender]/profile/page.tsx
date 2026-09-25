 "use client";

 import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
 import { useParams, useRouter } from "next/navigation";
import { deleteProfilePicture, fetchUserDetails, toggleUserAvailability, updateUserDetails, uploadProfilePictureToKosh, UserProfile } from "@/lib/api";
import Avatar from "@/components/avatar";

 export default function ProfilePage() {
   const params = useParams<{ gender: string }>();
   const router = useRouter();
   const gender = params.gender?.toLowerCase() === "female" ? "female" : "male";
   const [profile, setProfile] = useState<UserProfile | null>(null);
   const [userId, setUserId] = useState<string | null>(null);
   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [dateOfBirth, setDateOfBirth] = useState("");
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [showProfileImage, setShowProfileImage] = useState(false);
   const [isLoading, setIsLoading] = useState(true);
   const [isSaving, setIsSaving] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isAvailabilitySaving, setIsAvailabilitySaving] = useState(false);
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
   const [message, setMessage] = useState("");
   const [error, setError] = useState("");

   useEffect(() => {
     const resolvedUserId = window.localStorage.getItem("stag_user_id");
     if (!window.localStorage.getItem("stag_access_token")) {
       router.replace("/signup");
       return;
     }
     if (!resolvedUserId) {
       setError("Your account could not be identified. Please sign in again.");
       setIsLoading(false);
       return;
     }
     setUserId(resolvedUserId);
     fetchUserDetails(resolvedUserId)
       .then((details) => {
         setProfile(details);
         setName(details.name || "");
         setEmail(details.email || "");
         setDateOfBirth(formatDateForInput(details.dateOfBirth));
         setIsOnBreak(details.status === "inactive");
       })
       .catch(() => setError("We could not load your profile right now."))
       .finally(() => setIsLoading(false));
   }, [router]);

   const saveProfile = async (event: FormEvent) => {
     event.preventDefault();
     const userId = window.localStorage.getItem("stag_user_id");
     const trimmedName = name.trim();
     const trimmedEmail = email.trim();
     if (!userId) return setError("Your account could not be identified. Please sign in again.");
     if (!trimmedName) return setError("Name cannot be empty.");
     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setError("Enter a valid email address.");
     if (dateOfBirth && !/^\d{2}-\d{2}-\d{4}$/.test(dateOfBirth)) return setError("Date of birth must use DD-MM-YYYY format.");

     setIsSaving(true);
     setError("");
     setMessage("");
     try {
       const updated = await updateUserDetails(userId, {
         name: trimmedName,
         email: trimmedEmail,
         gender: profile?.gender || gender,
         phone: profile?.phone || "",
         dateOfBirth,
       });
       setProfile((current) => ({ ...current, ...updated, name: trimmedName, email: trimmedEmail, dateOfBirth }));
       setMessage("Profile updated successfully.");
     } catch {
       setError("We could not update your profile. Please check your details and try again.");
     } finally {
       setIsSaving(false);
     }
   };

  const handleProfilePictureChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !userId) return;
    setIsPhotoLoading(true);
    setError("");
    setMessage("");
    try {
      const { fileId, status } = await uploadProfilePictureToKosh(file);
      if (status === "failed") {
        setError("Your photo could not be processed. Please try a different photo.");
        return;
      }
      // READY or PENDING are both fine to attach — profilePicId is stable either way,
      // PENDING just means it'll appear on the profile a little later.
      const updated = await updateUserDetails(userId, { name, email, gender: profile?.gender || gender, phone: profile?.phone || "", dateOfBirth, profilePicId: fileId });
      setProfile((current) => ({ ...current, ...updated }));
      setMessage("Profile picture updated successfully.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "We could not upload your profile picture. Please try again.");
    } finally {
      setIsPhotoLoading(false);
      input.value = "";
    }
  };

  const updateAvailability = async (goingOnBreak: boolean) => {
    setIsAvailabilitySaving(true);
    setError("");
    setMessage("");
    try {
      await toggleUserAvailability();
      setIsOnBreak(goingOnBreak);
      setProfile((current) => ({ ...current, status: goingOnBreak ? "inactive" : "active" }));
      setMessage(goingOnBreak ? "You are now on a break. Existing requests are still available." : "You are available again and can receive new entry requests.");
    } catch (availabilityError) {
      setError(availabilityError instanceof Error ? availabilityError.message : "We could not update your availability. Please try again.");
    } finally {
      setIsAvailabilitySaving(false);
    }
  };

  const toggleAvailability = () => {
    if (!isOnBreak) {
      setShowBreakConfirm(true);
      return;
    }
    void updateAvailability(false);
  };

  const removeProfilePicture = async () => {
    if (!profile?.profilePicFileId) {
      setError("This profile picture cannot be removed here. Please upload a new picture first.");
      return;
    }
    if (!window.confirm("Remove your profile picture?")) return;
    setIsPhotoLoading(true);
    setError("");
    setMessage("");
    try {
      await deleteProfilePicture();
      setProfile((current) => (current ? { ...current, profilePicFileId: undefined } : current));
      setMessage("Profile picture removed successfully.");
    } catch {
      setError("We could not remove your profile picture. Please try again.");
    } finally {
      setIsPhotoLoading(false);
    }
  };

   return (
     <section className="app-placeholder content-width profile-edit-page">
       <Link className="text-link venue-back-link" href={`/home/${gender}`}><span>←</span> Back to home</Link>
       {isLoading ? <div className="empty-panel"><span>Loading your profile...</span></div> : (
         <>
           <header className="profile-edit-heading">
             <div>
               <p className="eyebrow">YOUR PROFILE</p>
               <h1>Edit profile.</h1>
               <p className="lede">Keep your account details accurate so requests, payments, and venue coordination stay clear.</p>
             </div>
             <div className="profile-edit-photo-wrap">
               {profile?.profilePicFileId ? (
                 <button className="profile-edit-avatar-button" type="button" onClick={() => setShowProfileImage(true)} aria-label="View profile picture">
                   <Avatar userId={userId} className="profile-edit-avatar profile-edit-avatar-image" />
                 </button>
               ) : <div className="profile-edit-avatar">{getInitials(profile?.name || name)}</div>}
               <label className="profile-photo-upload">{isPhotoLoading ? "Updating..." : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleProfilePictureChange(event)} disabled={isPhotoLoading} /></label>
               {profile?.profilePicFileId && <button className="profile-photo-delete" type="button" onClick={() => void removeProfilePicture()} disabled={isPhotoLoading} aria-label="Remove profile picture">×</button>}
             </div>
           </header>
           {message && <p className="form-message form-success" role="status">{message}</p>}
           {error && <p className="form-message form-error" role="alert">{error}</p>}
           <form className="profile-edit-form" onSubmit={saveProfile}>
             <div className="profile-edit-form-heading"><p className="request-detail-heading">PERSONAL DETAILS</p><span>Required fields are marked by the form.</span></div>
             <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label>
             <label>Email address<input type="email" value={email} readOnly /></label>
             <label>Date of birth <span className="profile-field-hint">DD-MM-YYYY</span><input value={dateOfBirth} readOnly /></label>
             <label>Gender<input value={profile?.gender || gender} readOnly /></label>
             <label>Phone number<input value={profile?.phone || "Not available"} readOnly /></label>
             <div className="profile-edit-actions"><button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</button><Link className="button button-secondary" href={`/home/${gender}`}>Cancel</Link></div>
           </form>
             {gender === "female" && <section className={`profile-break-section ${isOnBreak ? "profile-break-active" : ""}`}>
               <div>
                 <p className="eyebrow">AVAILABILITY</p>
                 <h2>{isOnBreak ? "On a Break" : "Give yourself a break"}</h2>
                 <p>Taking a break hides your profile from new users and pauses new entry requests. You can still continue with existing requests.</p>
               </div>
               <button className={`availability-toggle ${isOnBreak ? "availability-toggle-on" : ""}`} type="button" role="switch" aria-checked={isOnBreak} onClick={toggleAvailability} disabled={isAvailabilitySaving}>
                 <span>{isAvailabilitySaving ? "Updating..." : isOnBreak ? "Resume requests" : "Take a break"}</span>
                 <i aria-hidden="true" />
               </button>
             </section>}
           {showBreakConfirm && <div className="action-modal-backdrop" role="presentation" onClick={() => setShowBreakConfirm(false)}>
             <section className="action-modal break-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="break-confirmation-title" onClick={(event) => event.stopPropagation()}>
               <p className="eyebrow">AVAILABILITY</p>
               <h2 id="break-confirmation-title">We will miss you.</h2>
               <p className="action-modal-copy">Are you sure you want to go on a break? Your profile will not be shown to new users and you will not receive new entry requests. Existing requests will continue as usual.</p>
               <div className="action-modal-buttons"><button className="button button-primary" type="button" disabled={isAvailabilitySaving} onClick={() => { setShowBreakConfirm(false); void updateAvailability(true); }}>{isAvailabilitySaving ? "Updating..." : "Take a break"}</button><button className="button button-quiet" type="button" onClick={() => setShowBreakConfirm(false)}>Cancel</button></div>
             </section>
           </div>}
           {showProfileImage && profile?.profilePicFileId && (
             <div className="profile-image-modal" role="dialog" aria-modal="true" aria-label="Your profile picture" onClick={() => setShowProfileImage(false)}>
               <button type="button" aria-label="Close profile picture" onClick={() => setShowProfileImage(false)}>×</button>
               <Avatar userId={userId} size={320} style={{ borderRadius: 0 }} />
             </div>
           )}
         </>
       )}
     </section>
   );
 }

 function formatDateForInput(value?: string) {
   if (!value) return "";
   const datePart = value.split("T")[0];
   if (/^\d{2}-\d{2}-\d{4}$/.test(datePart)) return datePart;
   const [year, month, day] = datePart.split("-");
   return year && month && day ? `${day}-${month}-${year}` : value;
 }

 function getInitials(name: string) {
   return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "STAG";
 }
