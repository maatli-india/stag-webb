"use client";

import { FormEvent, useState } from "react";
import { generateOtp, validateOtp } from "@/lib/api";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const validPhone = /^[6-9]\d{9}$/.test(phone);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!otpSent && !validPhone) {
      setError("Enter a valid 10-digit number starting with 6, 7, 8, or 9.");
      return;
    }
    if (otpSent && !/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP sent to your phone.");
      return;
    }

    setIsBusy(true);
    try {
      if (!otpSent) {
        await generateOtp(phone);
        setOtpSent(true);
        setMessage(`We sent a 6-digit OTP to +91 ${phone}.`);
      } else {
        const response = await validateOtp(phone, otp);
        if (response.isNewUser) {
          setError("This number is not registered yet. Create an account first.");
          return;
        }
        if (response.token?.accessToken) {
          window.localStorage.setItem("stag_access_token", response.token.accessToken);
        }
        if (response.token?.refreshToken) {
          window.localStorage.setItem("stag_refresh_token", response.token.refreshToken);
        }
        const userId = response.userDetails?.id;
        if (userId) window.localStorage.setItem("stag_user_id", userId);
        window.location.assign(getHomePath(response.userDetails?.gender));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not complete login. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return <section className="auth-page content-width"><div className="auth-card"><p className="eyebrow">WELCOME BACK</p><h1>Log in to STAG.</h1><p>Use your registered phone number to receive a secure one-time password.</p><form onSubmit={handleSubmit}><label>Mobile number<span className="field-hint">India +91</span><div className="phone-field"><span>+91</span><input aria-label="Mobile number" type="tel" inputMode="numeric" placeholder="10-digit mobile number" value={phone} maxLength={10} disabled={otpSent} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} /></div></label>{otpSent && <label>Enter OTP<span className="field-hint">6-digit code sent to +91 {phone}</span><input autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={otp} maxLength={6} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} /></label>}<button className="button button-primary" type="submit" disabled={isBusy || (!otpSent && !validPhone) || (otpSent && otp.length !== 6)}>{isBusy ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}</button>{otpSent && <button className="button button-quiet auth-secondary" type="button" onClick={() => { setOtpSent(false); setOtp(""); setMessage(""); setError(""); }}>Use a different number</button>}</form>{error && <p className="form-message form-error" role="alert">{error}</p>}{message && <p className="form-message form-success" role="status">{message}</p>}<p className="auth-foot">New to STAG? <a href="/signup">Create an account</a></p></div></section>;
  return <section className="auth-page content-width"><div className="auth-card"><p className="eyebrow">WELCOME BACK</p><h1>Log in to STAG.</h1><p>Use your registered phone number to receive a secure one-time password.</p><form onSubmit={handleSubmit}><label>Mobile number<span className="field-hint">India +91</span><div className="phone-field"><span>+91</span><input aria-label="Mobile number" type="tel" inputMode="numeric" placeholder="10-digit mobile number" value={phone} maxLength={10} disabled={otpSent} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} /></div></label>{otpSent && <label>Enter OTP<span className="field-hint">6-digit code sent to +91 {phone}</span><input autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={otp} maxLength={6} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} /></label>}<button className="button button-primary" type="submit" disabled={isBusy || (!otpSent && !validPhone) || (otpSent && otp.length !== 6)}>{isBusy ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}</button>{otpSent && <button className="button button-quiet auth-secondary" type="button" onClick={() => { setOtpSent(false); setOtp(""); setMessage(""); setError(""); }}>Use a different number</button>}</form>{error && <p className="form-message form-error" role="alert">{error}</p>}{message && <p className="form-message form-success" role="status">{message}</p>}<p className="auth-foot">New to STAG? <a href="/signup">Create an account</a></p></div></section>;
}

function getHomePath(gender?: string) {
  return gender?.toLowerCase() === "female" ? "/home/female" : "/home/male";
}
