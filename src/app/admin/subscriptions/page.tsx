"use client";

import { useEffect, useState } from "react";
import {
  fetchSubscriptionPlans,
  SubscriptionPlan,
  updateSubscriptionPlanDescription,
} from "@/lib/api";

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubscriptionPlans()
      .then((items) => {
        setPlans(items);
        if (items.length > 0) {
          setSelectedPlanId(items[0].id || null);
          setDescription(items[0].description || "");
        }
      })
      .catch(() => setError("We could not load subscription plans."))
      .finally(() => setLoading(false));
  }, []);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  const selectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlanId(plan.id || null);
    setDescription(plan.description || "");
    setMessage("");
    setError("");
  };

  const saveDescription = async () => {
    if (!selectedPlanId || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateSubscriptionPlanDescription(
        selectedPlanId,
        description.trim(),
      );
      setPlans((current) =>
        current.map((plan) =>
          plan.id === selectedPlanId
            ? { ...plan, description: updated?.description ?? description.trim() }
            : plan,
        ),
      );
      setMessage("Plan description updated.");
    } catch {
      setError("We could not save this description. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (plan?: SubscriptionPlan) =>
    `${plan?.currency || "INR"} ${Number(plan?.cost || 0).toLocaleString("en-IN")}`;

  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Not available";

  return (
    <section className="member-home content-width">
      <div className="member-home-heading">
        <div>
          <p className="eyebrow">STAG ADMIN</p>
          <h1>Manage plan descriptions.</h1>
          <p className="lede">
            Update the customer-facing description for each request credit
            plan.
          </p>
        </div>
      </div>

      {message && (
        <p className="form-message form-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="empty-panel">
          <span>Loading subscription plans...</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="empty-panel">
          <strong>No subscription plans found.</strong>
        </div>
      ) : (
        <div className="user-profile-layout">
          <div className="user-profile-main">
            <div className="plans-tabs" role="tablist" aria-label="Subscription plans">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedPlanId === plan.id}
                  className={selectedPlanId === plan.id ? "plans-tab-active" : ""}
                  onClick={() => selectPlan(plan)}
                >
                  {plan.name || "Plan"}
                </button>
              ))}
            </div>

            {selectedPlan && (
              <section className="request-detail-section request-detail-panel">
                <p className="request-detail-heading">
                  {selectedPlan.name || "Subscription plan"}
                </p>
                <div>
                  <span>Price</span>
                  <strong>{formatPrice(selectedPlan)}</strong>
                </div>
                <div>
                  <span>Request credits</span>
                  <strong>{selectedPlan.creditCount || 0}</strong>
                </div>
                <div>
                  <span>Purpose</span>
                  <strong>{selectedPlan.purpose || "Not specified"}</strong>
                </div>
                <div>
                  <span>Validity</span>
                  <strong>
                    {selectedPlan.neverExpires
                      ? "Never expires"
                      : `${selectedPlan.expiryDays || 0} days`}
                  </strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{selectedPlan.status || "Not specified"}</strong>
                </div>
                <div>
                  <span>Last updated</span>
                  <strong>{formatDate(selectedPlan.updatedAt)}</strong>
                </div>

                <label style={{ display: "block", marginTop: "20px" }}>
                  Customer-facing description
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={500}
                    rows={5}
                    placeholder="Enter a description for this plan"
                  />
                </label>
                <small className="field-hint">{description.length}/500</small>
                <div className="action-modal-buttons" style={{ justifyContent: "flex-start" }}>
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={() => void saveDescription()}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save description"}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
