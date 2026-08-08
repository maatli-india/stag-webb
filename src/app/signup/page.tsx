"use client";

import { FormEvent, useState } from "react";
import { createUser, generateOtp, validateOtp } from "@/lib/api";

type SignupStep = "phone" | "otp" | "details";

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
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
        window.location.assign(getHomePath(response.userDetails?.gender));
        return;
      }
      setStep("details");
      setMessage("Phone number verified. Complete your profile to continue.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "That OTP could not be verified. Check it and try again."));
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
    setError("");
    setMessage("");
    setIsBusy(true);
    try {
      const response = await createUser({ name: fullName.trim(), email: email.trim().toLowerCase(), phone, gender, dateOfBirth: formatDateForApi(dateOfBirth), chargeAmount: 0 });
      persistSession(response);
      window.location.assign(getHomePath(response.userDetails?.gender || gender));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "We could not create your account. Please try again."));
    } finally {
      setIsBusy(false);
    }
  };

  return <section className="auth-page content-width"><div className="auth-card"><p className="eyebrow">START WITH STAG</p><h1>Create your account.</h1><p>Verify your phone first, then complete the details needed to arrange club entry assistance.</p>{step === "phone" && <form onSubmit={handleSendOtp}><label>Mobile number<span className="field-hint">India +91</span><div className="phone-field"><span>+91</span><input aria-label="Mobile number" type="tel" inputMode="numeric" placeholder="10-digit mobile number" value={phone} maxLength={10} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} /></div></label><button className="button button-primary" type="submit" disabled={!validPhone || isBusy}>{isBusy ? "Sending OTP..." : "Verify phone number"}</button></form>}{step === "otp" && <form onSubmit={handleVerifyOtp}><label>Enter OTP<span className="field-hint">6-digit code sent to +91 {phone}</span><input autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={otp} maxLength={6} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} /></label><button className="button button-primary" type="submit" disabled={otp.length !== 6 || isBusy}>{isBusy ? "Verifying..." : "Verify OTP"}</button><button className="button button-quiet auth-secondary" type="button" onClick={() => { setStep("phone"); setOtp(""); setMessage(""); setError(""); }}>Use a different number</button></form>}{step === "details" && <form onSubmit={handleCreateAccount}><label>Full name<input required type="text" placeholder="Your full name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label>Email address<input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Date of birth<input required type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></label><label>Gender<select required value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Prefer not to say</option></select></label><button className="button button-primary" type="submit" disabled={isBusy}>{isBusy ? "Creating account..." : "Create account"}</button></form>}{error && <p className="form-message form-error" role="alert">{error}</p>}{message && <p className="form-message form-success" role="status">{message}</p>}</div></section>;
}

function persistSession(response: { token?: { accessToken?: string; refreshToken?: string }; userDetails?: { id?: string; _id?: string } }) {
  if (response.token?.accessToken) window.localStorage.setItem("stag_access_token", response.token.accessToken);
  if (response.token?.refreshToken) window.localStorage.setItem("stag_refresh_token", response.token.refreshToken);
  const userId = response.userDetails?.id || response.userDetails?._id;
  if (userId) window.localStorage.setItem("stag_user_id", userId);
}

function getHomePath(gender?: string) {
  return gender?.toLowerCase() === "female" ? "/home/female" : "/home/male";
}

function formatDateForApi(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
