"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ActiveRequest,
  fetchActiveRequests,
  fetchUserDetails,
} from "@/lib/api";
import Avatar from "@/components/avatar";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDetailsElement>(null);
  const requestSnapshotRef = useRef<Record<string, string>>({});
  const notificationAudioContextRef = useRef<AudioContext | null>(null);
  const [gender, setGender] = useState<"female" | "male">("male");
  const [profile, setProfile] = useState<{ name?: string }>({});
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [requestAlert, setRequestAlert] = useState<{
    requestId: string;
    message: string;
  } | null>(null);
  const [hasUnreadRequestUpdate, setHasUnreadRequestUpdate] = useState(false);
  const appLinks = [
    ["Home", "/home"],
    ["My Requests", "/home/requests"],
    ["Visit Plans", "/home/plans"],
    ["Rewards", "/home/rewards"],
    ["Settings", "/home/settings"],
    ["About App", "/home/about"],
    ["Support", "/home/support"],
  ];

  useEffect(() => {
    const stored = window.localStorage.getItem("stag_gender");
    setGender(stored === "female" ? "female" : "male");
  }, []);

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    setProfileUserId(userId);
    if (userId)
      fetchUserDetails(userId)
        .then(setProfile)
        .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window.Notification === "undefined") return;
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (window.Notification.permission === "default") {
      if (window.Notification.permission === "granted")
        return;
      void window.Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const unlockNotificationSound = () => {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return;
      const audioContext =
        notificationAudioContextRef.current || new AudioContextConstructor();
      notificationAudioContextRef.current = audioContext;
      if (audioContext.state === "suspended")
        void audioContext.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlockNotificationSound, {
      once: true,
    });
    window.addEventListener("keydown", unlockNotificationSound, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockNotificationSound);
      window.removeEventListener("keydown", unlockNotificationSound);
    };
  }, []);

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId) return;

    let isFirstPoll = true;
    const playNotificationSound = () => {
      const audioContext = notificationAudioContextRef.current;
      if (!audioContext || audioContext.state !== "running") return;
      const now = audioContext.currentTime;
      [659.25, 783.99].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.16, now + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + index * 0.12 + 0.18,
        );
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + index * 0.12);
        oscillator.stop(now + index * 0.12 + 0.2);
      });
    };
    const notifyBrowser = (request: ActiveRequest, message: string) => {
      playNotificationSound();
      if (
        typeof window.Notification === "undefined" ||
        window.Notification.permission !== "granted"
      )
        return;
      const notification = new window.Notification("STAG request update", {
        body: message,
        tag: `stag-request-${request.id}`,
      });
        notification.onclick = () => {
          window.focus();
          router.push(
            `/home/requests/${encodeURIComponent(request.id || "")}`,
          );
        notification.close();
      };
    };
    const checkRequests = async () => {
      try {
        const requests = await fetchActiveRequests(userId);
        const nextSnapshot: Record<string, string> = {};
        let changedRequest: ActiveRequest | undefined;
        requests.forEach((request) => {
          if (!request.id) return;
          const belongsToLoggedInUser =
            request.mUser?.id === userId || request.fUser?.id === userId;
          if (!belongsToLoggedInUser) return;
          const state = request.status || "";
          nextSnapshot[request.id] = state;
          const previousState = requestSnapshotRef.current[request.id];
          if (!isFirstPoll && (!previousState || previousState !== state))
            changedRequest = request;
        });
        requestSnapshotRef.current = nextSnapshot;
        if (!isFirstPoll && changedRequest?.id) {
          const message = getRequestAlertMessage(changedRequest, gender);
          setRequestAlert({ requestId: changedRequest.id, message });
          setHasUnreadRequestUpdate(true);
          window.dispatchEvent(
            new CustomEvent("stag-request-updated", {
              detail: { requestId: changedRequest.id },
            }),
          );
          notifyBrowser(changedRequest, message);
        }
        isFirstPoll = false;
      } catch {
        // Status polling is supplementary and should not interrupt the app.
      }
    };

    void checkRequests();
    const interval = window.setInterval(() => void checkRequests(), 25000);
    return () => window.clearInterval(interval);
  }, [gender, router]);

  useEffect(() => {
    const closeProfileMenu = (event: PointerEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        profileMenuRef.current.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", closeProfileMenu);
    return () => document.removeEventListener("pointerdown", closeProfileMenu);
  }, []);

  const initials = (profile.name || "STAG")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    window.localStorage.removeItem("stag_access_token");
    window.localStorage.removeItem("stag_refresh_token");
    window.localStorage.removeItem("stag_user_id");
    router.replace("/");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/home" aria-label="STAG home">
          <Image
            src="/assets/images/stag-logo.png"
            alt="STAG"
            width={132}
            height={39}
            priority
          />
        </Link>
        <nav className="app-nav" aria-label="Application navigation">
          {appLinks.map(([label, href]) => (
            <Link
              className={pathname === href ? "app-nav-active" : ""}
              key={href}
              href={href}
              onClick={() =>
                label === "My Requests" && setHasUnreadRequestUpdate(false)
              }
            >
              {label}
              {label === "My Requests" && hasUnreadRequestUpdate && (
                <span
                  className="request-nav-dot"
                  aria-label="New request update"
                />
              )}
            </Link>
          ))}
        </nav>
        <details ref={profileMenuRef} className="profile-menu">
          <summary className="profile-trigger" aria-label="Open profile menu">
            <Avatar
              userId={profileUserId}
              size={36}
              className={`profile-avatar profile-avatar-${gender}`}
              fallback={<span className={`profile-avatar profile-avatar-${gender}`}>{initials}</span>}
            />
            <span className="profile-name">
              {profile.name ? `Hi, ${profile.name.split(" ")[0]}` : "Profile"}
            </span>
          </summary>
          <div className="profile-dropdown">
            <strong>{profile.name || "Your STAG profile"}</strong>
            <Link href="/home/profile">Edit Profile</Link>
            <Link href="/home/credits">Request Credits</Link>
            <Link href="/home/subscriptions">Subscription Plans</Link>
            <button
              className="profile-dropdown-logout"
              type="button"
              onClick={() => setShowLogoutModal(true)}
            >
              Logout
            </button>
          </div>
        </details>
      </header>
      {requestAlert && (
        <div className="request-alert" role="status">
          <span>{requestAlert.message}</span>
          <Link
            href={`/home/requests/${encodeURIComponent(requestAlert.requestId)}`}
            onClick={() => {
              setRequestAlert(null);
              setHasUnreadRequestUpdate(false);
            }}
          >
            View request
          </Link>
          <button
            type="button"
            aria-label="Dismiss request update"
            onClick={() => setRequestAlert(null)}
          >
            ×
          </button>
        </div>
      )}
      <main className="app-main">{children}</main>
      {showLogoutModal && (
        <div
          className="action-modal-backdrop"
          role="presentation"
          onClick={() => setShowLogoutModal(false)}
        >
          <section
            className="action-modal logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">LOG OUT</p>
            <h2 id="logout-title">Leave STAG for now?</h2>
            <p className="action-modal-copy">
              You can sign back in whenever you are ready. Your profile and
              request history will remain saved.
            </p>
            <div className="action-modal-buttons">
              <button
                className="button button-quiet"
                type="button"
                onClick={() => setShowLogoutModal(false)}
              >
                Stay signed in
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function getRequestAlertMessage(request: ActiveRequest, role: string) {
  if (["accepted", "confirm_intended"].includes(request.status || ""))
    return "Your request was accepted.";
  if (request.status === "pending")
    return role === "female"
      ? "Your response is needed on a request."
      : "A request is waiting for a response.";
  if (request.status === "confirmed" || request.status === "verified")
    return "Your club entry request is confirmed.";
  return "Your club entry request has been updated.";
}
