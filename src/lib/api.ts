const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/stag/v1/").replace(/\/$/, "");
const PROFILE_UPLOAD_API_BASE_URL = API_BASE_URL;

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

export function updateUserDetailsForProfileUpload(userId: string, payload: { name: string; email: string; gender?: string; phone?: string; dateOfBirth: string; profilePicId?: string }) {
  return requestWithBase<UserProfile>(PROFILE_UPLOAD_API_BASE_URL, `users/${encodeURIComponent(userId)}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function toggleUserAvailability() {
  return request<{ message?: string }>("users/toggle-available", { method: "PATCH", body: JSON.stringify({}) });
}

export function updateEntryFee(chargeAmount: number) {
  return request<{ message?: string }>("users/fee", { method: "PATCH", body: JSON.stringify({ chargeAmount }) });
}

export function addBankAccount(payload: { accountHolderName: string; accountNumber: string; confirmAccountNumber: string; ifsc: string }) {
  return request<{ message?: string }>("users/bank-account", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchBankAccount(userId: string) {
  return request<unknown>(`users/${encodeURIComponent(userId)}/bank-account`, { method: "GET" });
}

export type LedgerItem = {
  id?: string;
  type?: "EARNING" | "PAYOUT" | "PENALTY" | string;
  finalAmount?: number;
  basePrice?: number;
  platformFee?: number;
  gst?: number;
  penalty?: number;
  createdAt?: string;
  settlementStatus?: string;
  metadata?: { reason?: string };
  requestId?: string;
  requestIds?: string[];
  referenceId?: string;
};

export type LedgerResponse = {
  items?: LedgerItem[];
  total?: number;
  limit?: number;
  summary?: { totalEarning?: number };
};

export function fetchUserLedger(userId: string, page = 1, limit = 50) {
  return request<LedgerResponse>(`payment/users/${encodeURIComponent(userId)}/ledger?page=${page}&limit=${limit}`, { method: "GET" });
}

export function requestAccountDeletion() {
  return request<{ message?: string }>("users/delete", { method: "DELETE" });
}

export function confirmAccountDeletion(otp: string) {
  return request<{ message?: string }>("validate_otp_delete", { method: "POST", body: JSON.stringify({ otp }) });
}

export function getProfilePicUploadUrl(userId: string, fileContentType: string) {
  return requestWithBase<{ uploadUrl?: string; url?: string; presignedUrl?: string; fileId?: string }>(PROFILE_UPLOAD_API_BASE_URL, `file/upload-url?fileType=profile_pic&fileContentType=${encodeURIComponent(fileContentType)}&userId=${encodeURIComponent(userId)}`, { method: "GET" });
}

export async function uploadProfilePicture(file: File, userId: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userId", userId);
  const accessToken = typeof window !== "undefined" ? window.localStorage.getItem("stag_access_token") : null;
  const response = await fetch("/api/profile-picture-upload", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || "Profile picture upload failed.");
  return payload as { fileId: string };
}

export function deleteFile(fileId: string) {
  return request<{ message?: string }>(`file/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}

export type UserProfile = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  status?: string;
  profilePicUrl?: string;
  profilePicId?: string;
  profilePic?: string;
  profilePicture?: string;
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

export function confirmRequestForPayment(requestId: string, fUserId: string) {
  return request<ActiveRequest>(`request/${encodeURIComponent(requestId)}/confirm`, {
    method: "POST",
    body: JSON.stringify({ fUserId }),
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

export type PaymentBreakdown = {
  baseAmount?: number;
  mUserBaseAmount?: number;
  fUserBaseAmount?: number;
  platformFee?: number;
  gst?: number;
  total?: number;
  role?: "male" | "female";
};

export type PaymentOrder = {
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  key?: string;
};

export function createPaymentOrder(payload: {
  amount: number;
  currency: string;
  description: string;
  entityType: "request";
  entityDetails: { requestId: string; fUserId?: string };
}) {
  return request<PaymentOrder>("payment/create-order", { method: "POST", body: JSON.stringify(payload) });
}

export function verifyPayment(payload: { orderId: string; requestId: string; status: "completed" }) {
  return request<{ message?: string; request?: ActiveRequest }>("payment/verify", { method: "POST", body: JSON.stringify(payload) });
}

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
  payment?: RequestPayment;
};

export type RequestUser = {
  id?: string;
  username?: string;
  name?: string;
  profilePicUrl?: string;
  phone?: string;
  entryCount?: number;
  otp?: string;
};

export type RequestPayment = {
  fUserBaseAmount?: number;
  mUserBaseAmount?: number;
  mUserPlatformFee?: number;
  mUserGST?: number;
  mUserTotalPayable?: number;
  fUserPlatformFee?: number;
  fUserGST?: number;
  fUserNetPayout?: number;
  paymentStatus?: string;
  payoutStatus?: string;
  refundAmount?: number;
  refundId?: string;
  refundStatus?: string;
  refundProcessedAt?: string;
};

export type CompanionUser = {
  id?: string;
  name?: string;
  profilePicUrl?: string;
  distance?: number;
  selfieVerified?: boolean;
  isPlannedVisit?: boolean;
  plannedVisitAt?: string;
  plannedEntryFee?: number;
  companionFee?: number;
  chargeAmount?: number;
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

export function publishVisitPlan(payload: { lat: number; lng: number; placeId: string; clubName: string; clubAddress: string; visitDatetime: string; entryFee: number; platformFee: number; netPayout: number }) {
  return request<{ message?: string }>("club-visit-plans", { method: "POST", body: JSON.stringify(payload) });
}

export function updateVisitPlan(planId: string, payload: { lat: number; lng: number; placeId: string; clubName: string; clubAddress: string; visitDatetime: string; entryFee: number; platformFee: number; netPayout: number }) {
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
  entryFee?: number;
  netPayout?: number;
};

export function fetchMyVisitPlans() {
  return request<VisitPlan[] | { items?: VisitPlan[] }>("club-visit-plans/mine/all", { method: "GET" }).then((response) => Array.isArray(response) ? response : response.items || []);
}

export function deleteVisitPlan(planId: string) {
  return request<{ message?: string }>(`club-visit-plans/${encodeURIComponent(planId)}`, { method: "DELETE" });
}

export function fetchPaymentBreakdown(fUserId: string, entryFee?: number) {
  const query = entryFee == null ? "" : `?entryFee=${encodeURIComponent(entryFee)}`;
  return request<PaymentBreakdown>(`pricing-breakdown/${encodeURIComponent(fUserId)}${query}`, { method: "GET" });
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
