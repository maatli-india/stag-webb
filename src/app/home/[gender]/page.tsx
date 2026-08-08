"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchNearbyVenues, fetchSearchSuggestions, searchVenues, Venue } from "@/lib/api";

export default function MemberHome() {
  const params = useParams<{ gender: string }>();
  const router = useRouter();
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
  const nearbyLoaded = useRef(false);

  useEffect(() => {
    if (nearbyLoaded.current) return;
    nearbyLoaded.current = true;

    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }

    const nearbyPromise = resolveLocation()
      .then(({ latitude, longitude, approximate }) => {
        if (approximate) setLocationNotice("Showing places near your approximate location.");
        return fetchNearbyVenues(latitude, longitude);
      });

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

  return (
    <section className="member-home content-width">
      <div className="member-home-heading">
        <div>
          <p className="eyebrow">{role === "female" ? "MEMBER HOME" : "WELCOME TO STAG"}</p>
          <h1>Find your next club entry.</h1>
          <p className="lede">Search clubs and lounges around you, then choose where you want to go.</p>
        </div>
        <span className="role-badge">{role === "female" ? "Entry-assistance member" : "Entry member"}</span>
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
                    const selectedQuery = suggestion.name || suggestion.address || "";
                    const placeId = suggestion.place_id || suggestion.placeId || "";
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
                    <small>{suggestion.address || suggestion.vicinity || "Search result"}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="button button-primary" type="submit" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="form-message form-error" role="alert">{error}</p>}

      {!hasSearched && (
        <div className="home-section-header venue-heading">
          <div>
            <p className="eyebrow">DISCOVER NOW</p>
            <h2>Nearby places to explore</h2>
          </div>
        </div>
      )}

      {locationNotice && !hasSearched && <p className="form-message">{locationNotice}</p>}

      {isLoading ? (
        <div className="empty-panel"><span>Finding clubs near you...</span></div>
      ) : venues.length > 0 ? (
        <div className="venue-grid">
          {venues.map((venue, index) => (
            <Link
              className="venue-card"
              href={`/home/${role}/venues/${encodeURIComponent(venue.place_id || venue.name || String(index))}`}
              key={venue.place_id || venue.name || index}
            >
              <div className="venue-card-image">
                <img
                  src={getClubImage(index)}
                  alt=""
                  loading="lazy"
                />
              </div>
              <span className="venue-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{venue.name || "Club venue"}</h3>
              <p>{venue.address || venue.vicinity || "Venue details available after selection"}</p>
              <span className="venue-action">View venue <b>→</b></span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <strong>No venues found nearby.</strong>
          <span>Search for a city, area, club, bar, or lounge above.</span>
        </div>
      )}
    </section>
  );
}

function getClubImage(index: number) {
  const imageNumber = String((index % 20) + 1).padStart(2, "0");
  return `/assets/images/clubImg/club-${imageNumber}.png`;
}

type LocationResult = {
  latitude: number;
  longitude: number;
  approximate?: boolean;
};

function resolveLocation(): Promise<LocationResult> {
  if (navigator.geolocation) {
    return new Promise<LocationResult>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        reject,
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 15000 },
      );
    }).catch(() => fetchApproximateLocation());
  }
  return fetchApproximateLocation();
}

async function fetchApproximateLocation(): Promise<LocationResult> {
  const response = await fetch("https://ipapi.co/json/");
  if (!response.ok) throw new Error("Approximate location lookup failed");
  const data = (await response.json()) as { latitude?: number; longitude?: number };
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    throw new Error("Approximate location was not available");
  }
  return { latitude: data.latitude, longitude: data.longitude, approximate: true };
}
