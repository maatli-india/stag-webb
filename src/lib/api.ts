import { getApiBaseUrl } from "@/lib/config";

// Exported so client components (Avatar) can build the profile-pic redirect URL.
export const API_BASE_URL = getApiBaseUrl();

type ApiError = Error & { status?: number; data?: unknown };

async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  return requestWithBase<T>(API_BASE_URL, endpoint, options);
}

async function requestWithBase<T>(baseUrl: string, endpoint: string, options: RequestInit): Promise<T> {
  const accessToken = typeof window !== "undefined" ? window.localStorage.getItem("stag_access_token") : null;
  const response = await fetch(`${baseUrl}/${endpoint.replace(/^\//, "")}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const payload = data as { message?: string; error?: string } | null;
    const error = new Error(payload?.message || payload?.error || `Request failed (${response.status})`) as ApiError;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export type OtpValidationResponse = {
  isNewUser?: boolean;
  message?: string;
  token?: { accessToken?: string; refreshToken?: string };
  userDetails?: { id?: string; gender?: string };
};

export function generateOtp(phone: string) {
  return request<{ message?: string }>("generate_otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function validateOtp(phone: string, otp: string) {
  return request<OtpValidationResponse>("validate_otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp, deviceCountry: "IN" }),
  });
}

export function createUser(payload: {
  name: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  chargeAmount: number;
  profilePicId?: string;
}) {
  return request<OtpValidationResponse>("users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchUserDetails(userId: string) {
  return request<UserProfile>(`users/${encodeURIComponent(userId)}`, { method: "GET" });
}

export function updateCurrentUserLocation(payload: { lat: number; lng: number }) {
  return request<{ address?: string; lat?: number; lng?: number }>("userlocation/add-location", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUserDetails(userId: string, payload: { name: string; email: string; gender?: string; phone?: string; dateOfBirth: string; profilePicId?: string }) {
  return request<UserProfile>(`users/${encodeURIComponent(userId)}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function toggleUserAvailability() {
  return request<{ message?: string }>("users/toggle-available", { method: "PATCH", body: JSON.stringify({}) });
}

export function requestAccountDeletion() {
  return request<{ message?: string }>("users/delete", { method: "DELETE" });
}

export function confirmAccountDeletion(otp: string) {
  return request<{ message?: string }>("validate_otp_delete", { method: "POST", body: JSON.stringify({ otp }) });
}

type ProfilePicUploadUrlResponse = { fileId: string; uploadUrl: string; expiresInSeconds?: number; expiresAt?: string; requiredHeaders?: Record<string, string> };
type FileStatusResponse = { fileId: string; status: "PENDING" | "READY" | "FAILED"; downloadUrl?: string };

// Identity for /file/upload-url and /file/{id}/status comes purely from whichever JWT is
// attached (temp JWT pre-signup, or access JWT once logged in) — no userId param.
export function getProfilePicUploadUrl(fileContentType: string) {
  return request<ProfilePicUploadUrlResponse>(`file/upload-url?fileType=profile_pic&fileContentType=${encodeURIComponent(fileContentType)}`, { method: "GET" });
}

export function getProfilePicUploadStatus(fileId: string) {
  return request<FileStatusResponse>(`file/${encodeURIComponent(fileId)}/status`, { method: "GET" });
}

const PROFILE_PIC_STATUS_POLL_INTERVAL_MS = 1500;
const PROFILE_PIC_STATUS_POLL_TIMEOUT_MS = 20000;

// Uploads straight to Kosh from the browser (no server-side proxy — a prior implementation
// double-hopped through a Next.js API route that silently dropped the caller's Authorization
// header on the way to the backend), then confirms processing status.
export async function uploadProfilePictureToKosh(file: File): Promise<{ fileId: string; status: "ready" | "pending" | "failed" }> {
  const { uploadUrl, fileId, requiredHeaders } = await getProfilePicUploadUrl(file.type || "image/jpeg");
  if (!uploadUrl || !fileId) throw new Error("Unable to get upload URL");

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/jpeg", ...(requiredHeaders || {}) },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error("Failed to upload image to storage");

  const startedAt = Date.now();
  while (Date.now() - startedAt < PROFILE_PIC_STATUS_POLL_TIMEOUT_MS) {
    const { status } = await getProfilePicUploadStatus(fileId);
    if (status === "READY") return { fileId, status: "ready" };
    if (status === "FAILED") return { fileId, status: "failed" };
    await new Promise((resolve) => setTimeout(resolve, PROFILE_PIC_STATUS_POLL_INTERVAL_MS));
  }
  // Still PENDING after our short poll window — caller may proceed anyway per contract;
  // profilePicFileId lands on the user record later via the backend's webhook.
  return { fileId, status: "pending" };
}

export function deleteProfilePicture() {
  return request<{ message?: string }>("file/profile-picture", { method: "DELETE" });
}

export type UserProfile = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  status?: string;
  // Presence marker only — never a URL. Display always loads live via
  // GET /users/{id}/profile-pic-url (see components/Avatar.tsx).
  profilePicFileId?: string;
  entryCount?: number;
  selfieVerified?: boolean;
  chargeAmount?: number;
};

export function fetchBlockedUsers() {
  return request<UserProfile[] | { data?: UserProfile[] }>("users/list-blocked", { method: "GET" }).then((result) => Array.isArray(result) ? result : result.data || []);
}

export function toggleBlockUser(userId: string, payload: { reason?: string; comment?: string } = {}) {
  return request<{ message?: string }>(`users/${encodeURIComponent(userId)}/toggle-block`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function createEntryRequest(payload: {
  mUserId: string;
  fUserId: string;
  datetime: string;
  timezone: string;
  coordinates?: number[];
  clubName?: string;
  clubAddress?: string;
  placeId: string;
}) {
  return request<Record<string, unknown>>("request", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchRequestDetails(requestId: string) {
  return request<ActiveRequest>(`request/${encodeURIComponent(requestId)}`, { method: "GET" });
}

export function cancelRequest(requestId: string) {
  return request<{ message?: string }>(`request/${encodeURIComponent(requestId)}/cancel`, { method: "POST" });
}

export function respondToRequest(requestId: string, status: "accepted" | "rejected") {
  return request<{ message?: string }>(`request/${encodeURIComponent(requestId)}/respond`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function verifyMeetupEntryCode(requestId: string, otp: string, coordinates?: number[]) {
  return request<ActiveRequest | { status?: string; request?: ActiveRequest }>(`request/${encodeURIComponent(requestId)}/verifyOtp`, {
    method: "POST",
    body: JSON.stringify({ otp, ...(coordinates ? { coordinates } : {}) }),
  });
}

export type Venue = {
  place_id?: string;
  name?: string;
  address?: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  open_now?: boolean;
  photos?: string[];
  distance_km?: number;
  description?: string;
  main_text?: string;
  secondary_text?: string;
  placeId?: string;
  mainText?: string;
  secondaryText?: string;
};

export type PlaceDetails = {
  name?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  international_phone_number?: string;
  url?: string;
  types?: string[];
  geometry?: { location?: { lat?: number; lng?: number } };
  opening_hours?: { open_now?: boolean; weekday_text?: string[] };
};

export type ActiveRequest = {
  id?: string;
  status?: string;
  clubName?: string;
  clubAddress?: string;
  placeId?: string;
  datetime?: string;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  visitPlanId?: string;
  chatId?: string;
  mUser?: RequestUser;
  fUser?: RequestUser;
};

export type RequestUser = {
  id?: string;
  username?: string;
  name?: string;
  profilePicFileId?: string;
  phone?: string;
  entryCount?: number;
  otp?: string;
};

export type CompanionUser = {
  id?: string;
  name?: string;
  profilePicFileId?: string;
  distance?: number;
  selfieVerified?: boolean;
  isPlannedVisit?: boolean;
  plannedVisitAt?: string;
};

export type PagedRequests = {
  total?: number;
  page?: number;
  limit?: number;
  items?: ActiveRequest[];
};

export function fetchNearbyVenues(latitude: number, longitude: number) {
  return request<Venue[]>(`places/nearby?lat=${latitude}&lon=${longitude}&radius=5000`, { method: "GET" });
}

export function fetchCompanionsNearPlace(placeId: string) {
  return request<CompanionUser[]>(`places/users-near-place?place_id=${encodeURIComponent(placeId)}`, { method: "GET" });
}

export function fetchPlaceDetails(placeId: string) {
  return request<PlaceDetails>(`places/details?place_id=${encodeURIComponent(placeId)}`, { method: "GET" });
}

export function publishVisitPlan(payload: { lat: number; lng: number; placeId: string; clubName: string; clubAddress: string; visitDatetime: string }) {
  return request<{ message?: string }>("club-visit-plans", { method: "POST", body: JSON.stringify(payload) });
}

export function updateVisitPlan(planId: string, payload: { lat: number; lng: number; placeId: string; clubName: string; clubAddress: string; visitDatetime: string }) {
  return request<{ message?: string }>(`club-visit-plans/${encodeURIComponent(planId)}`, { method: "PUT", body: JSON.stringify(payload) });
}

export type VisitPlan = {
  id?: string;
  _id?: string;
  placeId?: string;
  clubName?: string;
  clubAddress?: string;
  lat?: number;
  lng?: number;
  visitDatetime?: string;
};

export type RewardHistoryEntry = {
  id?: string;
  points?: number;
  type?: string;
  description?: string;
  createdAt?: string;
};

export type RewardLevel = {
  name?: string;
  minimumPoints?: number;
  credits?: number;
  merchandise?: string;
  imageUrl?: string;
};

export type Merchandise = {
  id?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  pointsRequired?: number;
  variants?: Array<{ id?: string; name?: string; stock?: number }>;
  stock?: number;
  active?: boolean;
};

export type RewardsResponse = {
  points?: number;
  level?: string;
  levelPoints?: number;
  nextLevelPoints?: number;
  levelRewards?: RewardLevel[];
  merchandise?: Merchandise[];
  leaderboardRank?: number;
  leaderboard?: Array<{ rank?: number; userId?: string; name?: string; points?: number }>;
  history?: RewardHistoryEntry[];
  referralCode?: string;
};

export type DeliveryAddress = {
  id?: string;
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export type RedemptionOrder = {
  id?: string;
  orderId?: string;
  merchandiseName?: string;
  variantName?: string;
  points?: number;
  status?: string;
  trackingNumber?: string;
  createdAt?: string;
};

export function fetchRewards() {
  return request<RewardsResponse>("request/rewards", { method: "GET" });
}

export function fetchRewardHistory() {
  return request<RewardHistoryEntry[] | { items?: RewardHistoryEntry[]; data?: RewardHistoryEntry[] }>("request/rewards/history", { method: "GET" }).then((response) =>
    Array.isArray(response) ? response : response.items || response.data || [],
  );
}

export function fetchMerchandise() {
  return request<{ items?: Merchandise[] } | Merchandise[]>("request/merchandise", { method: "GET" }).then((response) => Array.isArray(response) ? response : response.items || []);
}

export type UserSubscription = SubscriptionPlan & {
  planId?: string;
  creditsLeft?: number;
  status?: string;
  expiresAt?: string;
};

export type UserSubscriptionsResponse = {
  dailyAllowance?: number;
  dailyUsed?: number;
  live?: { items?: UserSubscription[] };
  older?: { items?: UserSubscription[] };
};

export function fetchUserSubscriptions(userId: string) {
  return request<UserSubscriptionsResponse>(`subscription/user/${encodeURIComponent(userId)}`, { method: "GET" });
}

export function fetchRewardAddresses() {
  return request<{ items?: DeliveryAddress[] }>("request/rewards/addresses", { method: "GET" }).then((response) => response.items || []);
}

export function createRewardAddress(payload: Omit<DeliveryAddress, "id">) {
  return request<DeliveryAddress>("request/rewards/addresses", { method: "POST", body: JSON.stringify(payload) });
}

export function redeemReward(payload: { merchandiseId: string; variantId?: string; addressId: string }) {
  return request<RedemptionOrder>("request/rewards/redeem", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchRewardOrders() {
  return request<{ items?: RedemptionOrder[] }>("request/rewards/orders", { method: "GET" }).then((response) => response.items || []);
}

export function fetchMyVisitPlans() {
  return request<VisitPlan[] | { items?: VisitPlan[] }>("club-visit-plans/mine/all", { method: "GET" }).then((response) => Array.isArray(response) ? response : response.items || []);
}

export function deleteVisitPlan(planId: string) {
  return request<{ message?: string }>(`club-visit-plans/${encodeURIComponent(planId)}`, { method: "DELETE" });
}

export function fetchSearchSuggestions(input: string) {
  return request<Venue[]>(`places/search-suggestions?input=${encodeURIComponent(input)}&limit=6`, { method: "GET" }).then((suggestions) => suggestions.map((suggestion) => ({
    ...suggestion,
    place_id: suggestion.place_id || suggestion.placeId,
    name: suggestion.name || suggestion.description || suggestion.main_text || suggestion.mainText,
    address: suggestion.address || suggestion.secondary_text || suggestion.secondaryText || suggestion.description,
  })));
}

export function searchVenues(query: string, selectedPlaceId = "") {
  return request<Venue[] | { items?: Array<{ place?: Venue; distance_km?: number }> }>(`places/search-venues?query=${encodeURIComponent(query)}&selected_place_id=${encodeURIComponent(selectedPlaceId)}&radius=20000`, { method: "GET" }).then((result) => {
    if (Array.isArray(result)) return result;
    return (result.items || [])
      .filter((item): item is { place: Venue; distance_km?: number } => Boolean(item.place))
      .map(({ place, distance_km }) => ({ ...place, distance_km }));
  });
}

export function fetchActiveRequests(userId: string) {
  return fetchUserRequests(userId, { status: "pending,accepted,confirm_intended,payment_initiated,confirmed,verified,cancelled,canceled" }).then((result) => result.items || []);
}

export function fetchUserRequests(userId: string, options: { status?: string; timeline?: "all" | "past" | "upcoming"; page?: number; limit?: number } = {}) {
  const params = new URLSearchParams({ timezone: "Asia/Kolkata" });
  if (options.status) params.set("status", options.status);
  if (options.timeline) params.set("timeline", options.timeline);
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  return request<PagedRequests>(`request/user/${encodeURIComponent(userId)}?${params.toString()}`, { method: "GET" });
}

// ── Admin: session role ──────────────────────────────────────────────────

export function decodeJwtRole(token: string | null): string | undefined {
  if (!token) return undefined;
  try {
    const base64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!base64) return undefined;
    const payload = JSON.parse(atob(base64)) as { role?: string };
    return payload.role;
  } catch {
    return undefined;
  }
}

// ── Admin: events ─────────────────────────────────────────────────────────

export type AdminEvent = {
  id?: string;
  _id?: string;
  eventId?: string;
  name?: string;
  description?: string;
  additionalInformation?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  category?: string;
  entryType?: "free" | "paid" | string;
  price?: number;
  capacity?: number;
  contactNumber?: string;
  status?: "draft" | "posted" | string;
};

export function fetchMyEvents(options: { page?: number; limit?: number; status?: string } = {}) {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 50),
  });
  if (options.status) params.set("status", options.status);
  return request<
    { items?: AdminEvent[]; events?: AdminEvent[]; data?: { items?: AdminEvent[] } } | AdminEvent[]
  >(`event?${params.toString()}`, { method: "GET" }).then((response) =>
    Array.isArray(response)
      ? response
      : response?.data?.items || response?.items || response?.events || [],
  );
}

export type EventPayload = {
  name: string;
  description?: string;
  additionalInformation?: string;
  date: string;
  startTime: string;
  endTime?: string;
  venue: string;
  category?: string;
  entryType: "free" | "paid";
  price?: number;
  capacity?: number;
  contactNumber?: string;
  status: "draft" | "posted";
};

export function createEvent(payload: EventPayload) {
  return request<AdminEvent>("event", { method: "POST", body: JSON.stringify(payload) });
}

export function updateEvent(eventId: string, payload: EventPayload) {
  return request<AdminEvent>(`event/${encodeURIComponent(eventId)}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteEvent(eventId: string) {
  return request<{ message?: string }>(`event/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}

// ── Payments ─────────────────────────────────────────────────────────────

export type PaymentOrder = {
  amount?: number;
  currency?: string;
  entityId?: string;
  entityType?: string;
  furl?: string;
  gateway?: string;
  isProduction?: boolean;
  keyId?: string;
  orderId?: string;
  payuTxnId?: string;
  productInfo?: string;
  surl?: string;
  udf5?: string; // service routing tag; pass verbatim in checkout hash and bolt.js params
};

// Creates a gateway order. For subscriptions, amount/currency are ignored — BE uses plan breakdown.
export function createPaymentOrder(entityType: "subscription" | "request", entityDetails: Record<string, string>) {
  return request<PaymentOrder>("payment/create-order", {
    method: "POST",
    body: JSON.stringify({ entityType, entityDetails }),
  });
}

// Fetches a server-signed PayU hash. The hash is never computed on the client — salt stays on BE only.
export function fetchPayuHash(orderId: string, name: string) {
  return request<{ hash: string; hashName: string }>("payment/hashes", {
    method: "POST",
    body: JSON.stringify({ orderId, name }),
  });
}

// Notifies BE of the client-side payment outcome. Credits are granted by webhook, not this call.
export function verifyPaymentFromUI(orderId: string, status: "completed" | "failed" | "pending") {
  return request<string>("payment/verify", {
    method: "POST",
    body: JSON.stringify({ orderId, status }),
  });
}

// ── Admin: subscription plans ────────────────────────────────────────────

export type SubscriptionPlan = {
  id?: string;
  name?: string;
  description?: string;
  cost?: number;
  currency?: string;
  creditCount?: number;
  purpose?: string;
  neverExpires?: boolean;
  expiryDays?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function fetchSubscriptionPlans() {
  return request<
    SubscriptionPlan[] | { items?: SubscriptionPlan[]; data?: { items?: SubscriptionPlan[] } }
  >("subscription/plans", { method: "GET" }).then((response) =>
    Array.isArray(response) ? response : response?.data?.items || response?.items || [],
  );
}

export function updateSubscriptionPlanDescription(planId: string, description: string) {
  return request<SubscriptionPlan>(`subscription/plans/${encodeURIComponent(planId)}`, {
    method: "PATCH",
    body: JSON.stringify({ description }),
  });
}
