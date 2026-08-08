 "use client";

 import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
 import { useParams, useRouter } from "next/navigation";
import { deleteFile, fetchUserDetails, getProfilePicUploadUrl, updateUserDetails, UserProfile } from "@/lib/api";

 export default function ProfilePage() {
   const params = useParams<{ gender: string }>();
   const router = useRouter();
   const gender = params.gender?.toLowerCase() === "female" ? "female" : "male";
   const [profile, setProfile] = useState<UserProfile | null>(null);
   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [dateOfBirth, setDateOfBirth] = useState("");
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
   const [isLoading, setIsLoading] = useState(true);
   const [isSaving, setIsSaving] = useState(false);
   const [message, setMessage] = useState("");
   const [error, setError] = useState("");

   useEffect(() => {
     const userId = window.localStorage.getItem("stag_user_id");
     if (!window.localStorage.getItem("stag_access_token")) {
       router.replace("/signup");
       return;
     }
     if (!userId) {
       setError("Your account could not be identified. Please sign in again.");
       setIsLoading(false);
       return;
     }
     fetchUserDetails(userId)
       .then((details) => {
         setProfile(details);
         setName(details.name || "");
         setEmail(details.email || "");
         setDateOfBirth(formatDateForInput(details.dateOfBirth));
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

  const uploadProfilePicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const userId = window.localStorage.getItem("stag_user_id");
    if (!file || !userId) return;
    setIsPhotoLoading(true);
    setError("");
    setMessage("");
    try {
      const uploadMeta = await getProfilePicUploadUrl(userId, file.type || "image/jpeg");
      const uploadUrl = uploadMeta.uploadUrl || uploadMeta.url || uploadMeta.presignedUrl;
      if (!uploadUrl || !uploadMeta.fileId) throw new Error("Invalid upload response");
      const uploadResponse = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
      if (!uploadResponse.ok) throw new Error("Image upload failed");
      const updated = await updateUserDetails(userId, { name, email, gender: profile?.gender || gender, phone: profile?.phone || "", dateOfBirth, profilePicId: uploadMeta.fileId });
      setProfile((current) => ({ ...current, ...updated, profilePicId: uploadMeta.fileId }));
      setMessage("Profile picture updated successfully.");
    } catch {
      setError("We could not upload your profile picture. Please try again.");
    } finally {
      setIsPhotoLoading(false);
      event.target.value = "";
    }
  };

  const removeProfilePicture = async () => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId || !profile?.profilePicId) {
      setError("This profile picture cannot be removed here. Please upload a new picture first.");
      return;
    }
    if (!window.confirm("Remove your profile picture?")) return;
    setIsPhotoLoading(true);
    setError("");
    setMessage("");
    try {
      await deleteFile(profile.profilePicId);
      const updated = await updateUserDetails(userId, { name, email, gender: profile.gender || gender, phone: profile.phone || "", dateOfBirth, profilePicId: "" });
      setProfile((current) => ({ ...current, ...updated, profilePicId: "", profilePicUrl: "" }));
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
               {profile?.profilePicUrl ? <img className="profile-edit-avatar profile-edit-avatar-image" src={profile.profilePicUrl} alt="Your profile" /> : <div className="profile-edit-avatar">{getInitials(profile?.name || name)}</div>}
               <label className="profile-photo-upload">{isPhotoLoading ? "Updating..." : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfilePicture} disabled={isPhotoLoading} /></label>
               {profile?.profilePicId && <button className="profile-photo-delete" type="button" onClick={removeProfilePicture} disabled={isPhotoLoading} aria-label="Remove profile picture">×</button>}
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
