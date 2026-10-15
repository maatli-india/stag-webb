"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGender } from "@/lib/hooks";
import { useEffect, useMemo, useState } from "react";
import { deleteVisitPlan, fetchMyVisitPlans, VisitPlan } from "@/lib/api";

function formatDate(value?: string) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function PlansPage() {
  const searchParams = useSearchParams();
  const gender = useGender();
  const [plans, setPlans] = useState<VisitPlan[]>([]);
  const [section, setSection] = useState<"upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(searchParams.get("published") === "1" ? "Your visit plan was published successfully. Members can now find it at this venue." : searchParams.get("updated") === "1" ? "Your visit plan was updated successfully." : "");
  const [planToDelete, setPlanToDelete] = useState<VisitPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMyVisitPlans().then(setPlans).catch(() => setError("We could not load your visit plans. Please try again.")).finally(() => setLoading(false));
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: plans.filter((plan) => new Date(plan.visitDatetime || "").getTime() >= now).sort(sortPlans),
      past: plans.filter((plan) => new Date(plan.visitDatetime || "").getTime() < now).sort(sortPlans),
    };
  }, [plans]);
  const visiblePlans = section === "upcoming" ? upcoming : past;

  const removePlan = async () => {
    const plan = planToDelete;
    if (!plan) return;
    if (!plan.id && !plan._id) return;
    setError("");
    setIsDeleting(true);
    try {
      await deleteVisitPlan(plan.id || plan._id || "");
      setPlans((current) => current.filter((item) => (item.id || item._id) !== (plan.id || plan._id)));
      setPlanToDelete(null);
      setMessage("Visit plan deleted successfully. Any associated requests remain unchanged.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "We could not delete this visit plan.");
    } finally {
      setIsDeleting(false);
    }
  };

  return <><section className="app-placeholder content-width profile-options-page plans-page"><Link className="text-link venue-back-link" href={"/home"}><span>←</span> Back to home</Link><header className="app-option-heading"><p className="eyebrow">MY PLANS</p><h1>Your visit plans.</h1><p className="lede">Upcoming and past plans, organized by date.</p></header>{message && <p className="form-message form-success plans-message" role="status">{message}</p>}{error && <p className="form-message form-error plans-message" role="alert">{error}</p>}<div className="plans-tabs" role="tablist" aria-label="Visit plan history"><button type="button" role="tab" aria-selected={section === "upcoming"} className={section === "upcoming" ? "plans-tab-active" : ""} onClick={() => setSection("upcoming")}>Upcoming</button><button type="button" role="tab" aria-selected={section === "past"} className={section === "past" ? "plans-tab-active" : ""} onClick={() => setSection("past")}>Past</button></div>{loading ? <div className="empty-panel"><span>Loading your plans...</span></div> : visiblePlans.length ? <div className="plans-list">{visiblePlans.map((plan, index) => <article className="plan-card" key={plan.id || plan._id || index}><div className="plan-date-tile"><strong>{formatMonth(plan.visitDatetime)}</strong><b>{formatDay(plan.visitDatetime)}</b><span>{formatWeekday(plan.visitDatetime)}</span></div><div className="plan-card-content"><div className="plan-card-topline"><span className={section === "past" ? "plan-status plan-status-past" : "plan-status"}>{section === "past" ? "Past visit" : getReminder(plan.visitDatetime)}</span></div><h2>{plan.clubName || "Selected club"}</h2><p>{formatDate(plan.visitDatetime)}</p><small>{plan.clubAddress || "Venue details unavailable"}</small><div className="plan-card-actions">{section === "upcoming" && plan.placeId && <Link className="button button-quiet" href={`/home/venues/${encodeURIComponent(plan.placeId)}/plan?plan=${encodeURIComponent(plan.id || plan._id || "")}`}>Modify plan</Link>}<button className="button button-secondary" type="button" onClick={() => setPlanToDelete(plan)}>Delete</button></div></div></article>)}</div> : <div className="empty-panel plans-empty"><strong>{section === "past" ? "No past plans" : "No upcoming plans"}</strong><span>{section === "past" ? "Your past visit plans will appear here." : "Choose a venue to publish your first visit plan."}</span>{section === "upcoming" && <Link className="button button-primary" href={"/home"}>Find a venue</Link>}</div>}</section>{planToDelete && <div className="action-modal-backdrop" role="presentation" onClick={() => !isDeleting && setPlanToDelete(null)}><section className="action-modal plan-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-plan-title" onClick={(event) => event.stopPropagation()}><p className="eyebrow">DELETE VISIT PLAN</p><h2 id="delete-plan-title">Remove this plan?</h2><p className="action-modal-copy">Deleting this plan will not cancel or change any associated requests. If you are no longer planning to go, cancel those requests separately.</p><div className="action-modal-buttons"><button className="button button-quiet" type="button" onClick={() => setPlanToDelete(null)} disabled={isDeleting}>Keep plan</button><button className="button button-secondary plan-delete-confirm" type="button" onClick={() => void removePlan()} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete plan"}</button></div></section></div>}</>;
}

function sortPlans(first: VisitPlan, second: VisitPlan) { return new Date(first.visitDatetime || "").getTime() - new Date(second.visitDatetime || "").getTime(); }
function formatMonth(value?: string) { return new Date(value || "").toLocaleDateString("en-IN", { month: "short" }).toUpperCase(); }
function formatDay(value?: string) { const date = new Date(value || ""); return Number.isNaN(date.getTime()) ? "--" : String(date.getDate()); }
function formatWeekday(value?: string) { return new Date(value || "").toLocaleDateString("en-IN", { weekday: "short" }); }
function getReminder(value?: string) { const date = new Date(value || ""); const today = new Date(); const days = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000); return days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`; }