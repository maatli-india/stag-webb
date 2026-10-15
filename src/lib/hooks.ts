"use client";

import { useEffect, useState } from "react";

/** Returns the signed-in user's gender from localStorage. SSR-safe: defaults to "male" on first render. */
export function useGender(): "female" | "male" {
  const [gender, setGender] = useState<"female" | "male">("male");
  useEffect(() => {
    const stored = window.localStorage.getItem("stag_gender");
    setGender(stored === "female" ? "female" : "male");
  }, []);
  return gender;
}
