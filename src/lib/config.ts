/** Default when NEXT_PUBLIC_API_BASE_URL is unset or blank (same as before). */
const DEFAULT_API_BASE_URL = "https://api-dev.stag.org.in/stag/v1";

/**
 * STAG API base including `/stag/v1`, no trailing slash.
 * Set `NEXT_PUBLIC_API_BASE_URL` in Netlify (or `.env.local`) per environment.
 * Empty / missing → api-dev, same as the previous hardcoded fallback.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return (raw || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}
