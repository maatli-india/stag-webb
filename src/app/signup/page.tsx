"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { createUser, decodeJwtRole, generateOtp, uploadProfilePictureToKosh, validateOtp } from "@/lib/api";

type SignupStep = "phone" | "otp" | "details";
type UploadStatus = "idle" | "uploading" | "ready" | "pending" | "failed";

// Six individual digit boxes for OTP entry — auto-advances on input, backs up on delete.
function OtpBoxes({ value, onChange, disabled, autoFocus }: { value: string; onChange: (v: string) => void; disabled: boolean; autoFocus?: boolean }) {
  const r0 = useRef<HTMLInputElement>(null);
  const r1 = useRef<HTMLInputElement>(null);
  const r2 = useRef<HTMLInputElement>(null);
  const r3 = useRef<HTMLInputElement>(null);
  const r4 = useRef<HTMLInputElement>(null);
  const r5 = useRef<HTMLInputElement>(null);
  const refs = [r0, r1, r2, r3, r4, r5];

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const focus = (i: number) => refs[i]?.current?.focus();

  const handleChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? digit : d)).join("");
    onChange(next.replace(/\s/g, "").slice(0, 6));
    if (digit && i < 5) focus(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[i] && i > 0) {
        const next = digits.map((d, idx) => (idx === i - 1 ? "" : d)).join("").trimEnd();
        onChange(next);
        focus(i - 1);
        e.preventDefault();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focus(i - 1);
    } else if (e.key === "ArrowRight" && i < 5) {
      focus(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(text);
    focus(Math.min(text.length, 5));
    e.preventDefault();
  };

  return (
    <div className="otp-boxes" role="group" aria-label="One-time password" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={refs[i]}
          id={`otp-box-${i}`}
          className="otp-box"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1} of 6`}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [profilePicturePreview, setProfilePicturePreview] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const validPhone = /^[6-9]\d{9}$/.test(phone);

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!validPhone) {
      setError("Enter a valid 10-digit number starting with 6, 7, 8, or 9.");
      return;
    }
    setError("");
    setMessage("");
    setIsBusy(true);
    try {
      await generateOtp(phone);
      setStep("otp");
      setMessage(`We sent a 6-digit OTP to +91 ${phone}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "We could not send the OTP. Please try again."));
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP sent to your phone.");
      return;
    }
    setError("");
    setMessage("");
    setIsBusy(true);
    try {
      const response = await validateOtp(phone, otp);
      if (response.isNewUser === false) {
        persistSession(response);
        const role = decodeJwtRole(response.token?.accessToken || null);
        window.location.assign(role === "admin" ? "/admin" : "/home");
        return;
      }
      // Temp JWT for a brand-new user — persist it so profile-photo upload can happen
      // before the account exists, per the upload contract's Flow A.
      if (response.token?.accessToken) {
        window.localStorage.setItem("stag_access_token", response.token.accessToken);
      }
      setStep("details");
      setMessage("Phone number verified. Complete your profile to continue.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "That OTP could not be verified. Check it and try again."));
    } finally {
      setIsBusy(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp("");
    setError("");
    setMessage("");
    setIsBusy(true);
    try {
      await generateOtp(phone);
      setMessage(`A new OTP was sent to +91 ${phone}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "We could not resend the OTP. Please try again."));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || !email.trim() || !gender || !dateOfBirth) {
      setError("Complete your name, email, date of birth, and gender.");
      return;
    }
    const birthDate = new Date(`${dateOfBirth}T00:00:00`);
    const adultDate = new Date();
    adultDate.setFullYear(adultDate.getFullYear() - 18);
    if (Number.isNaN(birthDate.getTime()) || birthDate > adultDate) {
      setError("You must be at least 18 years old to register.");
      return;
    }
    if (uploadStatus === "uploading") {
      setError("Please wait for your photo to finish uploading.");
      return;
    }
    if (uploadStatus === "failed") {
      setError("Your photo could not be uploaded. Please remove it or try a different photo before continuing.");
      return;
    }
    setError("");
    setMessage("");
    setIsBusy(true);
    try {
      const response = await createUser({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone,
        gender,
        dateOfBirth: formatDateForApi(dateOfBirth),
        chargeAmount: 0,
        ...(uploadedFileId ? { profilePicId: uploadedFileId } : {}),
      });
      persistSession(response);
      window.location.assign("/home");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "We could not create your account. Please try again."));
    } finally {
      setIsBusy(false);
    }
  };

  const handleProfilePictureChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile pictures must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setProfilePicturePreview(URL.createObjectURL(file));
    setUploadStatus("uploading");
    setUploadedFileId(null);
    try {
      const { fileId, status } = await uploadProfilePictureToKosh(file);
      setUploadedFileId(fileId);
      setUploadStatus(status);
      if (status === "failed") {
        setError("Your photo could not be processed. Please try a different photo.");
      }
    } catch {
      setUploadStatus("failed");
      setError("We could not upload your photo. Please try again.");
    }
  };

  return (
    <section className="auth-page content-width">
      <div className="auth-card">
        <p className="eyebrow">STAG</p>
        {step === "phone" && (
          <>
            <h1>Get started.</h1>
            <p>Enter your mobile number to sign in or create a new STAG account. We&apos;ll send you a one-time code to verify.</p>
          </>
        )}
        {step === "otp" && <h1>Check your phone.</h1>}
        {step === "details" && <h1>Create your account.</h1>}
        {step === "phone" && (
          <form onSubmit={handleSendOtp}>
            <label>
              Mobile number<span className="field-hint">India +91</span>
              <div className="phone-field">
                <span>+91</span>
                <input
                  aria-label="Mobile number"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  maxLength={10}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                />
              </div>
            </label>
            <button className="button button-primary" type="submit" disabled={!validPhone || isBusy}>
              {isBusy ? "Sending OTP..." : "Continue"}
            </button>
            {error && <p className="form-message form-error" role="alert">{error}</p>}
          </form>
        )}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp}>
            <label htmlFor="otp-box-0">
              Enter OTP
              <span className="field-hint">6-digit code sent to +91 {phone}</span>
            </label>
            <OtpBoxes value={otp} onChange={setOtp} disabled={isBusy} autoFocus />
            {error && <p className="form-message form-error otp-inline-error" role="alert">{error}</p>}
            {message && <p className="form-message form-success" role="status">{message}</p>}
            <button className="button button-primary" type="submit" disabled={otp.length !== 6 || isBusy}>
              {isBusy ? "Verifying..." : "Verify OTP"}
            </button>
            <p className="otp-resend">
              Didn&apos;t get the OTP?{" "}
              <button className="text-link otp-resend-link" type="button" onClick={handleResendOtp} disabled={isBusy}>
                Resend OTP
              </button>
            </p>
            <button className="button button-quiet auth-secondary" type="button" onClick={() => { setStep("phone"); setOtp(""); setMessage(""); setError(""); }}>
              Use a different number
            </button>
          </form>
        )}
        {step === "details" && (
          <form onSubmit={handleCreateAccount}>
            <label>
              Full name
              <input required type="text" placeholder="Your full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
            <label>
              Email address
              <input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Date of birth
              <input required type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
            </label>
            <label>
              Gender
              <select required value={gender} onChange={(event) => setGender(event.target.value)}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Prefer not to say</option>
              </select>
            </label>
            <div className="signup-profile-photo">
              <span className="signup-profile-photo-label">Profile picture <span className="field-hint">Optional</span></span>
              <div className="signup-profile-photo-row">
                {profilePicturePreview ? <img className="signup-profile-avatar" src={profilePicturePreview} alt="Profile preview" /> : <div className="signup-profile-avatar signup-profile-avatar-placeholder">{getInitials(fullName)}</div>}
                <label className="profile-photo-upload">{profilePicturePreview ? "Change photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleProfilePictureChange(event)} disabled={isBusy} /></label>
              </div>
              {uploadStatus === "uploading" && <p className="field-hint">Uploading photo…</p>}
              {uploadStatus === "pending" && <p className="field-hint">Photo is still processing — you can continue, it&apos;ll appear shortly.</p>}
              {uploadStatus === "failed" && <p className="form-message form-error">Photo upload failed — choose a photo above to try again.</p>}
            </div>
            <button className="button button-primary" type="submit" disabled={isBusy}>
              {isBusy ? "Creating account..." : "Create account"}
            </button>
            {error && <p className="form-message form-error" role="alert">{error}</p>}
            {message && <p className="form-message form-success" role="status">{message}</p>}
          </form>
        )}
      </div>
    </section>
  );
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "STAG";
}

function persistSession(response: {
  token?: { accessToken?: string; refreshToken?: string };
  userDetails?: { id?: string; _id?: string; gender?: string };
}) {
  if (response.token?.accessToken) window.localStorage.setItem("stag_access_token", response.token.accessToken);
  if (response.token?.refreshToken) window.localStorage.setItem("stag_refresh_token", response.token.refreshToken);
  const userId = response.userDetails?.id || response.userDetails?._id;
  if (userId) window.localStorage.setItem("stag_user_id", userId);
  // Gender stored for client-side routing and content switching (no gender in URL).
  const gender = response.userDetails?.gender?.toLowerCase();
  if (gender === "female" || gender === "male") window.localStorage.setItem("stag_gender", gender);
}

function formatDateForApi(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
