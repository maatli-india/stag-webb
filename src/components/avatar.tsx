"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

// Loads a user's profile picture straight from the no-auth redirect endpoint — there is no
// presigned URL field on user JSON to read (only profilePicFileId, a presence marker), so
// display always means pointing an <img> at this endpoint by userId and letting the browser
// follow the 302 to Kosh natively.
export default function Avatar({
  userId,
  size = 64,
  className,
  style,
  fallback,
}: {
  userId?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  // A different user deserves a fresh attempt.
  useEffect(() => {
    setFailed(false);
  }, [userId]);

  const dimensionStyle: React.CSSProperties = { width: size, height: size, borderRadius: "50%", objectFit: "cover", ...style };

  if (!userId || failed) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className={className} style={{ ...dimensionStyle, background: "#2a2a35", display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden>
        <svg width="60%" height="60%" viewBox="0 0 256 256">
          <circle cx="128" cy="128" r="128" fill="#3a3a46" />
          <circle cx="128" cy="96" r="48" fill="#6B7280" />
          <path d="M48 232c10-48 40-76 80-76s70 28 80 76H48Z" fill="#6B7280" />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external, auth-free, per-viewer redirect; next/image's domain allowlist adds no value here
    <img
      src={`${API_BASE_URL}/users/${encodeURIComponent(userId)}/profile-pic-url`}
      alt=""
      className={className}
      style={dimensionStyle}
      onError={() => setFailed(true)}
    />
  );
}
