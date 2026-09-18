"use client";

import { useEffect, useState } from "react";
import {
  AdminEvent,
  createEvent,
  deleteEvent,
  EventPayload,
  fetchMyEvents,
  updateEvent,
} from "@/lib/api";

const CATEGORIES = [
  "Club Night",
  "DJ Night",
  "Live Music",
  "Pool Party",
  "Rooftop",
  "Networking",
  "Other",
];

const emptyForm = {
  name: "",
  description: "",
  additionalInformation: "",
  date: "",
  startTime: "",
  endTime: "",
  venue: "",
  category: "",
  entryType: "free" as "free" | "paid",
  price: "",
  capacity: "",
  contactNumber: "",
};

type FormState = typeof emptyForm;

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  const loadEvents = () => {
    setLoading(true);
    fetchMyEvents({ page: 1, limit: 50 })
      .then(setEvents)
      .catch(() => setError("We could not load your events. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const eventKey = (event: AdminEvent) => event.id || event._id || event.eventId || "";

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (event: AdminEvent) => {
    setEditingId(eventKey(event));
    setForm({
      name: event.name || "",
      description: event.description || "",
      additionalInformation: event.additionalInformation || "",
      date: toDateInputValue(event.date),
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      venue: event.venue || "",
      category: event.category || "",
      entryType: event.entryType === "paid" ? "paid" : "free",
      price: event.price ? String(event.price) : "",
      capacity: event.capacity ? String(event.capacity) : "",
      contactNumber: event.contactNumber || "",
    });
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const buildPayload = (status: "draft" | "posted"): EventPayload => ({
    name: form.name.trim(),
    description: form.description.trim(),
    additionalInformation: form.additionalInformation.trim(),
    date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
    startTime: form.startTime,
    endTime: form.endTime,
    venue: form.venue.trim(),
    category: form.category || "Other",
    entryType: form.entryType,
    price: form.entryType === "paid" ? Number(form.price || 0) : 0,
    capacity: Number(form.capacity || 0),
    contactNumber: form.contactNumber.replace(/\D/g, ""),
    status,
  });

  const validate = () => {
    if (!form.name.trim()) return "Please enter the event name.";
    if (!form.date) return "Please select a date.";
    if (!form.startTime) return "Please select a start time.";
    if (form.endTime && form.startTime && form.endTime <= form.startTime)
      return "End time should be after start time.";
    if (!form.venue.trim()) return "Please enter the venue.";
    if (form.entryType === "paid" && !form.price.trim())
      return "Please enter the entry price.";
    if (form.contactNumber) {
      const digits = form.contactNumber.replace(/\D/g, "");
      if (digits.length !== 10) return "Contact number must be exactly 10 digits.";
    }
    return "";
  };

  const submitForm = async (status: "draft" | "posted") => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = buildPayload(status);
      if (editingId) await updateEvent(editingId, payload);
      else await createEvent(payload);
      setMessage(editingId ? "Event updated." : "Event created.");
      closeForm();
      loadEvents();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not save this event. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const togglePostStatus = async (targetEvent: AdminEvent) => {
    const id = eventKey(targetEvent);
    if (!id) return;
    setBusyEventId(id);
    setError("");
    try {
      const nextStatus = targetEvent.status === "posted" ? "draft" : "posted";
      await updateEvent(id, {
        name: targetEvent.name || "",
        description: targetEvent.description || "",
        additionalInformation: targetEvent.additionalInformation || "",
        date: targetEvent.date || new Date().toISOString(),
        startTime: targetEvent.startTime || "",
        endTime: targetEvent.endTime || "",
        venue: targetEvent.venue || "",
        category: targetEvent.category || "Other",
        entryType: targetEvent.entryType === "paid" ? "paid" : "free",
        price: targetEvent.price || 0,
        capacity: targetEvent.capacity || 0,
        contactNumber: targetEvent.contactNumber || "",
        status: nextStatus,
      });
      loadEvents();
    } catch {
      setError("We could not update this event's status. Please try again.");
    } finally {
      setBusyEventId(null);
    }
  };

  const removeEvent = async () => {
    if (!deleteTarget) return;
    const id = eventKey(deleteTarget);
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteEvent(id);
      setEvents((current) => current.filter((item) => eventKey(item) !== id));
      setDeleteTarget(null);
      setMessage("Event deleted.");
    } catch {
      setError("We could not delete this event. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="member-home content-width">
      <div className="member-home-heading">
        <div>
          <p className="eyebrow">STAG ADMIN</p>
          <h1>Manage events.</h1>
          <p className="lede">Create, edit, post, or remove STAG events.</p>
        </div>
        <button className="button button-primary" type="button" onClick={openCreateForm}>
          + Create event
        </button>
      </div>

      {message && (
        <p className="form-message form-success" role="status">
          {message}
        </p>
      )}
      {error && !showForm && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="empty-panel">
          <span>Loading events...</span>
        </div>
      ) : events.length > 0 ? (
        <div className="plans-list">
          {events.map((eventItem) => {
            const id = eventKey(eventItem);
            return (
              <article className="plan-card" key={id}>
                <div className="plan-card-content" style={{ width: "100%" }}>
                  <div className="plan-card-topline">
                    <span className="plan-status">
                      {eventItem.status === "posted" ? "Posted" : "Draft"}
                    </span>
                    <strong>
                      {eventItem.entryType === "paid"
                        ? `₹${eventItem.price ?? 0}`
                        : "Free entry"}
                    </strong>
                  </div>
                  <h2>{eventItem.name || "Untitled event"}</h2>
                  <p>
                    {formatDisplayDate(eventItem.date)} · {eventItem.startTime || "--"}
                    {eventItem.endTime ? ` – ${eventItem.endTime}` : ""}
                  </p>
                  <small>{eventItem.venue || "Venue not set"}</small>
                  <div className="plan-card-actions">
                    <button
                      className="button button-quiet"
                      type="button"
                      onClick={() => openEditForm(eventItem)}
                    >
                      Edit
                    </button>
                    <button
                      className="button button-quiet"
                      type="button"
                      disabled={busyEventId === id}
                      onClick={() => void togglePostStatus(eventItem)}
                    >
                      {busyEventId === id
                        ? "Updating..."
                        : eventItem.status === "posted"
                          ? "Unpost"
                          : "Post"}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => setDeleteTarget(eventItem)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-panel">
          <strong>No events yet.</strong>
          <span>Create your first event to get started.</span>
        </div>
      )}

      {showForm && (
        <div
          className="action-modal-backdrop"
          role="presentation"
          onClick={() => !submitting && closeForm()}
        >
          <form
            className="action-modal fuser-setup-modal"
            onSubmit={(event) => event.preventDefault()}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close-button"
              type="button"
              aria-label="Close"
              onClick={closeForm}
            >
              ×
            </button>
            <p className="eyebrow">{editingId ? "EDIT EVENT" : "CREATE EVENT"}</p>
            <h2>{editingId ? "Update this event." : "Set up a new event."}</h2>

            <label>
              Event name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </label>
            <label>
              Additional information
              <textarea
                value={form.additionalInformation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, additionalInformation: e.target.value }))
                }
                rows={2}
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </label>
            <label>
              Start time
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                required
              />
            </label>
            <label>
              End time
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </label>
            <label>
              Venue
              <input
                type="text"
                value={form.venue}
                onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                placeholder="Venue name and address"
                required
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Entry type
              <select
                value={form.entryType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, entryType: e.target.value as "free" | "paid" }))
                }
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            {form.entryType === "paid" && (
              <label>
                Entry price (₹)
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </label>
            )}
            <label>
              Capacity
              <input
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </label>
            <label>
              Contact number
              <input
                type="text"
                value={form.contactNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactNumber: e.target.value.replace(/\D/g, "") }))
                }
                maxLength={10}
                placeholder="10-digit contact number"
              />
            </label>

            {error && (
              <p className="form-message form-error" role="alert">
                {error}
              </p>
            )}

            <div className="action-modal-buttons">
              <button
                className="button button-quiet"
                type="button"
                onClick={() => void submitForm("draft")}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save as draft"}
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => void submitForm("posted")}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save and post"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div
          className="action-modal-backdrop"
          role="presentation"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <section
            className="action-modal plan-delete-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">DELETE EVENT</p>
            <h2>Remove {deleteTarget.name || "this event"}?</h2>
            <p className="action-modal-copy">
              This cannot be undone. Members will no longer see this event.
            </p>
            <div className="action-modal-buttons">
              <button
                className="button button-quiet"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Keep event
              </button>
              <button
                className="button button-secondary plan-delete-confirm"
                type="button"
                onClick={() => void removeEvent()}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete event"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function toDateInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplayDate(value?: string) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
