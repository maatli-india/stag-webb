"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  addBankAccount,
  fetchBankAccount,
  fetchNearbyVenues,
  fetchPaymentBreakdown,
  fetchSearchSuggestions,
  fetchUserDetails,
  searchVenues,
  updateCurrentUserLocation,
  updateEntryFee,
  Venue,
  PaymentBreakdown,
  UserProfile,
} from "@/lib/api";

const LOCATION_SYNC_MAX_AGE_MS = 30 * 60 * 1000;
const LOCATION_SYNC_MAX_DISTANCE_METERS = 250;

export default function MemberHome() {
  const params = useParams<{ gender: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = params.gender?.toLowerCase() === "female" ? "female" : "male";
  const [query, setQuery] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [nearbyVenues, setNearbyVenues] = useState<Venue[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Venue[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [locationNotice, setLocationNotice] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [profile, setProfile] = useState<UserProfile>({});
  const [showFuserSetup, setShowFuserSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<"menu" | "fee" | "bank">("menu");
  const [entryFee, setEntryFee] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [ifscBankName, setIfscBankName] = useState("");
  const [ifscError, setIfscError] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [pricingBreakdown, setPricingBreakdown] =
    useState<PaymentBreakdown | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const nearbyLoaded = useRef(false);

  useEffect(() => {
    if (nearbyLoaded.current) return;
    nearbyLoaded.current = true;

    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }

    const nearbyPromise = resolveLocation().then(
      async ({
        latitude,
        longitude,
        approximate,
        address,
        permissionDenied,
      }) => {
        if (permissionDenied)
          setLocationNotice(
            "Location access is off. Showing your approximate area.",
          );
        else if (approximate)
          setLocationNotice("Showing places near your approximate location.");
        let backendAddress =
          role === "female" && !approximate
            ? getCachedLocationAddress(latitude, longitude)
            : "";
        if (role === "female" && !approximate) {
          const cachedLocation = getCachedLocation(latitude, longitude);
          if (!cachedLocation) {
            try {
              const location = await updateCurrentUserLocation({
                lat: latitude,
                lng: longitude,
              });
              backendAddress = location.address || "";
              cacheLocation(latitude, longitude, backendAddress);
            } catch {
              // Nearby discovery and the local address fallback should still work if location sync fails.
            }
          }
        }
        const resolvedAddress =
          backendAddress ||
          address ||
          (await reverseGeocode(latitude, longitude));
        if (resolvedAddress) setCurrentAddress(resolvedAddress);
        return fetchNearbyVenues(latitude, longitude);
      },
    );

    nearbyPromise
      .then((nearby) => {
        const places = Array.isArray(nearby) ? nearby : [];
        setNearbyVenues(places);
        setVenues(places);
      })
      .catch(() => setError("We could not load your nearby clubs right now."))
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    if (role !== "female") return;
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId) return;

    Promise.all([fetchUserDetails(userId), fetchBankAccount(userId)])
      .then(([userDetails, bankResponse]) => {
        setProfile(userDetails);
        setEntryFee(
          userDetails.chargeAmount && userDetails.chargeAmount > 0
            ? String(userDetails.chargeAmount)
            : "",
        );
        setAccountHolderName(userDetails.name || "");
        const bankAccount = getBankAccount(bankResponse);
        if (bankAccount) {
          setAccountHolderName(
            bankAccount.accountHolderName ||
              bankAccount.account_holder_name ||
              userDetails.name ||
              "",
          );
          setAccountNumber(
            bankAccount.accountNumber || bankAccount.account_number || "",
          );
          setConfirmAccountNumber(
            bankAccount.accountNumber || bankAccount.account_number || "",
          );
          setIfsc(bankAccount.ifsc || "");
          setIfscBankName(bankAccount.ifsc ? "Bank details saved" : "");
        }
        if (
          window.localStorage.getItem("stag_new_fuser_onboarding") === "true"
        ) {
          window.localStorage.removeItem("stag_new_fuser_onboarding");
          setShowFuserSetup(true);
        }
      })
      .catch(() => {
        setProfile({});
      });
  }, [role]);

  useEffect(() => {
    if (role !== "female") return;
    const setupTarget = searchParams.get("setup");
    if (setupTarget !== "fee" && setupTarget !== "bank") return;
    setSetupError("");
    setSetupMessage("");
    setSetupStep(setupTarget);
    setShowFuserSetup(true);
  }, [role, searchParams]);

  useEffect(() => {
    if (role !== "female" || !showFuserSetup || setupStep !== "fee") return;
    const amount = Number(entryFee);
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      setPricingBreakdown(null);
      setPricingLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setPricingLoading(true);
      fetchPaymentBreakdown(userId, amount)
        .then(setPricingBreakdown)
        .catch(() => setPricingBreakdown(null))
        .finally(() => setPricingLoading(false));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [entryFee, role, setupStep, showFuserSetup]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const result = await fetchSearchSuggestions(query.trim());
        setSuggestions(Array.isArray(result) ? result.slice(0, 6) : []);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const runSearch = async (searchQuery: string, placeId: string) => {
    setSearching(true);
    setError("");
    try {
      if (!placeId) {
        setError("Select a place from the suggestions before searching.");
        return;
      }

      const result = await searchVenues(searchQuery, placeId);
      setVenues(Array.isArray(result) ? result : []);
      setHasSearched(true);
    } catch {
      setError("We could not complete that club search. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const searchQuery = query.trim();
    if (!searchQuery) return;

    try {
      let placeId = selectedPlaceId;
      if (!placeId) {
        const matches = await fetchSearchSuggestions(searchQuery);
        placeId = matches[0]?.place_id || "";
      }
      await runSearch(searchQuery, placeId);
    } catch {
      setError("We could not complete that club search. Please try again.");
    }
  };

  const handleIfscChange = async (value: string) => {
    const nextIfsc = value.toUpperCase().replace(/\s/g, "");
    setIfsc(nextIfsc);
    setIfscBankName("");
    setIfscError("");
    if (nextIfsc.length !== 11) return;
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(nextIfsc)) {
      setIfscError("Enter a valid 11-character IFSC code.");
      return;
    }
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${nextIfsc}`);
      if (!response.ok) throw new Error("Invalid IFSC code.");
      const details = (await response.json()) as {
        BANK?: string;
        BRANCH?: string;
      };
      setIfscBankName(
        [details.BANK, details.BRANCH].filter(Boolean).join(" • ") ||
          "Bank verified",
      );
    } catch {
      setIfscError("Invalid IFSC code. Please check and try again.");
    }
  };

  const handleSaveFee = async () => {
    const amount = Number(entryFee);
    if (!Number.isInteger(amount) || amount < 500) {
      setSetupError("Entry fee must be at least ₹500.");
      return;
    }
    setSetupBusy(true);
    setSetupError("");
    try {
      await updateEntryFee(amount);
      setProfile((current) => ({ ...current, chargeAmount: amount }));
      setSetupMessage("Entry fee updated.");
      setSetupStep("menu");
    } catch (requestError) {
      setSetupError(
        getErrorMessage(requestError, "We could not update your entry fee."),
      );
    } finally {
      setSetupBusy(false);
    }
  };

  const handleSaveBank = async () => {
    const accountNumberIsValid = /^\d{9,18}$/.test(accountNumber);
    const accountNumbersMatch = accountNumber === confirmAccountNumber;
    if (
      !accountHolderName.trim() ||
      !accountNumberIsValid ||
      !accountNumbersMatch ||
      !ifscBankName
    ) {
      setSetupError(
        !accountNumbersMatch
          ? "Account numbers do not match."
          : "Complete the bank details and verify the IFSC code.",
      );
      return;
    }
    setSetupBusy(true);
    setSetupError("");
    try {
      await addBankAccount({
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        confirmAccountNumber: confirmAccountNumber.trim(),
        ifsc,
      });
      setSetupMessage("Bank account added.");
      setSetupStep("menu");
    } catch (requestError) {
      setSetupError(
        getErrorMessage(requestError, "We could not add your bank account."),
      );
    } finally {
      setSetupBusy(false);
    }
  };

  const closeFuserSetup = () => {
    setShowFuserSetup(false);
    setSetupStep("menu");
    setSetupError("");
    if (searchParams.has("setup"))
      router.replace(`/home/${role}`, { scroll: false });
  };

  const payoutBreakdown = (() => {
    const amount = Number(entryFee);
    const baseAmount = Number(pricingBreakdown?.baseAmount);
    const platformFee = Number(pricingBreakdown?.platformFee);
    if (!amount || baseAmount <= 0 || !Number.isFinite(platformFee))
      return null;
    const fee = amount * (platformFee / baseAmount);
    return { fee, payout: amount - fee };
  })();
  const accountNumberInvalid =
    accountNumber.length > 0 && !/^\d{9,18}$/.test(accountNumber);
  const accountNumberMismatch =
    confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber;
  const hasSetupDetails =
    Number(entryFee) > 0 ||
    Boolean(accountNumber || confirmAccountNumber || ifsc);

  return (
    <section className="member-home content-width">
      <div className="member-home-heading">
        <div>
          <p className="eyebrow">
            {role === "female" ? "YOUR STAG HOME" : "WELCOME TO STAG"}
          </p>
          <h1>
            {role === "female"
              ? "Make club entry easier."
              : "Find your next club entry."}
          </h1>
          <p className="lede">
            {role === "female"
              ? "Keep your fee and payout details ready, then respond to nearby entry requests with clarity."
              : "Search clubs and lounges around you, then choose where you want to go."}
          </p>
          {role === "female" && (
            <div className="current-location-wrap">
              <span className="current-location-label">YOUR CURRENT AREA</span>
              <p className="current-location" aria-live="polite">
                <span aria-hidden="true">⌖</span>
                {currentAddress ||
                  (locationNotice
                    ? locationNotice
                    : "Locating your current address...")}
              </p>
              <small className="current-location-hint">
                Used to show nearby clubs and entry requests.
              </small>
            </div>
          )}
        </div>
        <span className="role-badge">
          {role === "female" ? "Entry-assistance member" : "Entry member"}
        </span>
      </div>

      <form className="club-search" onSubmit={handleSearch}>
        <div className="search-field">
          <input
            aria-label="Search areas and clubs"
            value={query}
            onFocus={() => setShowSuggestions(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedPlaceId("");
              setShowSuggestions(true);
            }}
            placeholder="Search an area, club, bar or lounge"
          />
          {query && (
            <button
              className="search-clear"
              type="button"
              aria-label="Clear search"
              title="Clear search"
              onClick={() => {
                setQuery("");
                setSelectedPlaceId("");
                setSuggestions([]);
                setShowSuggestions(false);
                setHasSearched(false);
                setError("");
                setVenues(nearbyVenues);
              }}
            >
              ×
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions" role="listbox">
              {suggestions.map((suggestion, index) => (
                <button
                  type="button"
                  className="search-suggestion"
                  key={suggestion.place_id || index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const selectedQuery =
                      suggestion.name || suggestion.address || "";
                    const placeId =
                      suggestion.place_id || suggestion.placeId || "";
                    setQuery(selectedQuery);
                    setSelectedPlaceId(placeId);
                    setSuggestions([]);
                    setShowSuggestions(false);
                    void runSearch(selectedQuery, placeId);
                  }}
                >
                  <span className="suggestion-icon">⌖</span>
                  <span>
                    <strong>{suggestion.name || "Area or venue"}</strong>
                    <small>
                      {suggestion.address ||
                        suggestion.vicinity ||
                        "Search result"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="button button-primary"
          type="submit"
          disabled={searching}
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}

      {!hasSearched && (
        <div className="home-section-header venue-heading">
          <div>
            <p className="eyebrow">DISCOVER NOW</p>
            <h2>Nearby places to explore</h2>
          </div>
        </div>
      )}

      {locationNotice && !hasSearched && (
        <p className="form-message">{locationNotice}</p>
      )}

      {isLoading ? (
        <div className="empty-panel">
          <span>Finding clubs near you...</span>
        </div>
      ) : venues.length > 0 ? (
        <div className="venue-grid">
          {venues.map((venue, index) => (
            <Link
              className="venue-card"
              href={`/home/${role}/venues/${encodeURIComponent(venue.place_id || venue.name || String(index))}`}
              key={venue.place_id || venue.name || index}
            >
              <div className="venue-card-image">
                <img src={getClubImage(index)} alt="" loading="lazy" />
              </div>
              <span className="venue-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{venue.name || "Club venue"}</h3>
              <p>
                {venue.address ||
                  venue.vicinity ||
                  "Venue details available after selection"}
              </p>
              <span className="venue-action">
                View venue <b>→</b>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <strong>No venues found nearby.</strong>
          <span>Search for a city, area, club, bar, or lounge above.</span>
        </div>
      )}

      {role === "female" && showFuserSetup && (
        <div
          className="action-modal-backdrop"
          role="presentation"
          onClick={closeFuserSetup}
        >
          <section
            className="action-modal fuser-setup-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fuser-setup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close-button"
              type="button"
              aria-label="Close setup"
              onClick={closeFuserSetup}
            >
              ×
            </button>
            {setupStep === "menu" && (
              <>
                <p className="eyebrow">WELCOME TO STAG</p>
                <h2 id="fuser-setup-title">Complete your setup.</h2>
                <p className="action-modal-copy">
                  Set your entry fee and add a bank account so you are ready to
                  respond to club entry requests.
                </p>
                <div className="fuser-setup-options">
                  <button
                    type="button"
                    className="fuser-setup-option"
                    onClick={() => {
                      setSetupError("");
                      setSetupStep("fee");
                    }}
                  >
                    <span>01</span>
                    <strong>Entry fee</strong>
                    <small>
                      {profile.chargeAmount && profile.chargeAmount > 0
                        ? `₹${profile.chargeAmount} per entry`
                        : "Set what you receive"}
                    </small>
                    <b>→</b>
                  </button>
                  <button
                    type="button"
                    className="fuser-setup-option"
                    onClick={() => {
                      setSetupError("");
                      setSetupStep("bank");
                    }}
                  >
                    <span>02</span>
                    <strong>Bank account</strong>
                    <small>Add where STAG sends your payout</small>
                    <b>→</b>
                  </button>
                </div>
                {setupMessage && (
                  <p className="form-message form-success" role="status">
                    {setupMessage}
                  </p>
                )}
                <p className="fuser-setup-hint">
                  You can update both details later from your account settings.
                </p>
                <button
                  className={`button ${hasSetupDetails ? "button-primary" : "button-quiet"} fuser-setup-later`}
                  type="button"
                  onClick={closeFuserSetup}
                >
                  {hasSetupDetails ? "Submit" : "I'll do this later"}
                </button>
              </>
            )}

            {setupStep === "fee" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSaveFee();
                }}
              >
                <p className="eyebrow">01 / ENTRY FEE</p>
                <h2>Set your entry fee.</h2>
                <p className="action-modal-copy">
                  Choose the amount you receive when you help a member enter a
                  venue.
                </p>
                <label>
                  Amount per entry
                  <input
                    type="number"
                    min="500"
                    step="1"
                    value={entryFee}
                    onChange={(event) => setEntryFee(event.target.value)}
                    placeholder="e.g. 500"
                    required
                  />
                </label>
                <p className="fee-breakdown-intro">
                  Your estimated payout after the STAG service fee:
                </p>
                {payoutBreakdown ? (
                  <div
                    className="fee-breakdown"
                    aria-label="Estimated payout breakdown"
                  >
                    <div>
                      <span>STAG platform fee</span>
                      <strong>{formatCurrency(payoutBreakdown.fee)}</strong>
                    </div>
                    <div className="fee-breakdown-total">
                      <span>Estimated STAG platform payout</span>
                      <strong>{formatCurrency(payoutBreakdown.payout)}</strong>
                    </div>
                  </div>
                ) : pricingLoading ? (
                  <p className="fee-breakdown-loading">
                    Calculating your estimated payout...
                  </p>
                ) : null}
                {setupError && (
                  <p className="form-message form-error" role="alert">
                    {setupError}
                  </p>
                )}
                <div className="action-modal-buttons">
                  <button
                    className="button button-quiet"
                    type="button"
                    onClick={() => setSetupStep("menu")}
                  >
                    Back
                  </button>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={setupBusy}
                  >
                    {setupBusy ? "Saving..." : "Save entry fee"}
                  </button>
                </div>
              </form>
            )}

            {setupStep === "bank" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSaveBank();
                }}
              >
                <p className="eyebrow">02 / BANK ACCOUNT</p>
                <h2>
                  {accountNumber
                    ? "Update your bank account."
                    : "Add your bank account."}
                </h2>
                <p className="action-modal-copy">
                  Your bank details are used only to process eligible STAG
                  payouts.
                </p>
                <label>
                  Account holder name
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(event) =>
                      setAccountHolderName(event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Account number
                  <input
                    type="password"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(event) =>
                      setAccountNumber(event.target.value.replace(/\D/g, ""))
                    }
                    minLength={9}
                    maxLength={18}
                    required
                  />
                  {accountNumberInvalid && (
                    <span className="ifsc-error">
                      Enter a valid account number with 9 to 18 digits.
                    </span>
                  )}
                </label>
                <label>
                  Confirm account number
                  <input
                    className={accountNumberMismatch ? "input-invalid" : ""}
                    type="text"
                    inputMode="numeric"
                    value={confirmAccountNumber}
                    onChange={(event) =>
                      setConfirmAccountNumber(
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                    minLength={9}
                    maxLength={18}
                    required
                  />
                  {accountNumberMismatch && (
                    <span className="ifsc-error">
                      Account numbers do not match.
                    </span>
                  )}
                </label>
                <label>
                  IFSC code
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(event) =>
                      void handleIfscChange(event.target.value)
                    }
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    required
                  />
                  {ifscBankName && (
                    <span className="ifsc-success">{ifscBankName}</span>
                  )}
                  {ifscError && <span className="ifsc-error">{ifscError}</span>}
                </label>
                {setupError && (
                  <p className="form-message form-error" role="alert">
                    {setupError}
                  </p>
                )}
                <div className="action-modal-buttons">
                  <button
                    className="button button-quiet"
                    type="button"
                    onClick={() => setSetupStep("menu")}
                  >
                    Back
                  </button>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={setupBusy || !ifscBankName}
                  >
                    {setupBusy
                      ? "Saving..."
                      : accountNumber
                        ? "Update bank account"
                        : "Save bank account"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

function getClubImage(index: number) {
  const imageNumber = String((index % 20) + 1).padStart(2, "0");
  return `/assets/images/clubImg/club-${imageNumber}.png`;
}

type LocationResult = {
  latitude: number;
  longitude: number;
  approximate?: boolean;
  address?: string;
  permissionDenied?: boolean;
};

type CachedLocation = {
  latitude: number;
  longitude: number;
  address?: string;
  syncedAt: number;
};

type BankAccount = {
  accountNumber?: string;
  account_number?: string;
  accountHolderName?: string;
  account_holder_name?: string;
  ifsc?: string;
};

function getBankAccount(response: unknown): BankAccount | null {
  const data = (response as { data?: unknown })?.data ?? response;
  if (Array.isArray(data)) return (data[0] as BankAccount | undefined) || null;
  const wrapped = data as {
    bankAccount?: BankAccount;
    account?: BankAccount;
  } | null;
  return (
    wrapped?.bankAccount || wrapped?.account || (data as BankAccount) || null
  );
}

function resolveLocation(): Promise<LocationResult> {
  if (navigator.geolocation) {
    return new Promise<LocationResult>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        (error) => reject(error),
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 15000 },
      );
    }).catch(async (error: GeolocationPositionError) => ({
      ...(await fetchApproximateLocation()),
      permissionDenied: error.code === 1,
    }));
  }
  return fetchApproximateLocation();
}

function getLocationCacheKey() {
  const userId = window.localStorage.getItem("stag_user_id");
  return userId ? `stag_fuser_location_sync:${userId}` : "";
}

function getCachedLocation(
  latitude: number,
  longitude: number,
): CachedLocation | null {
  const cacheKey = getLocationCacheKey();
  if (!cacheKey) return null;
  try {
    const cached = JSON.parse(
      window.localStorage.getItem(cacheKey) || "null",
    ) as CachedLocation | null;
    if (!cached || Date.now() - cached.syncedAt > LOCATION_SYNC_MAX_AGE_MS)
      return null;
    if (
      distanceInMeters(cached.latitude, cached.longitude, latitude, longitude) >
      LOCATION_SYNC_MAX_DISTANCE_METERS
    )
      return null;
    return cached;
  } catch {
    return null;
  }
}

function getCachedLocationAddress(latitude: number, longitude: number) {
  return getCachedLocation(latitude, longitude)?.address || "";
}

function cacheLocation(latitude: number, longitude: number, address: string) {
  const cacheKey = getLocationCacheKey();
  if (!cacheKey) return;
  const cachedLocation: CachedLocation = {
    latitude,
    longitude,
    address,
    syncedAt: Date.now(),
  };
  window.localStorage.setItem(cacheKey, JSON.stringify(cachedLocation));
}

function distanceInMeters(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
) {
  const earthRadius = 6371000;
  const latitudeDifference = ((secondLatitude - firstLatitude) * Math.PI) / 180;
  const longitudeDifference =
    ((secondLongitude - firstLongitude) * Math.PI) / 180;
  const firstLatitudeRadians = (firstLatitude * Math.PI) / 180;
  const secondLatitudeRadians = (secondLatitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDifference / 2) ** 2;
  return (
    2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`,
    );
    if (!response.ok) return "";
    const data = (await response.json()) as {
      locality?: string;
      city?: string;
      principalSubdivision?: string;
      countryName?: string;
      localities?: string[];
    };
    return [
      data.locality || data.city || data.localities?.[0],
      data.principalSubdivision,
      data.countryName,
    ]
      .filter(Boolean)
      .filter((part, index, parts) => parts.indexOf(part) === index)
      .join(", ");
  } catch {
    return "";
  }
}

async function fetchApproximateLocation(): Promise<LocationResult> {
  const response = await fetch("https://ipapi.co/json/");
  if (!response.ok) throw new Error("Approximate location lookup failed");
  const data = (await response.json()) as {
    latitude?: number;
    longitude?: number;
    city?: string;
    region?: string;
    country_name?: string;
  };
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    throw new Error("Approximate location was not available");
  }
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    approximate: true,
    address: [data.city, data.region, data.country_name]
      .filter(Boolean)
      .join(", "),
  };
}
