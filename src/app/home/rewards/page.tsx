"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGender } from "@/lib/hooks";
import {
  createRewardAddress,
  DeliveryAddress,
  fetchRewardAddresses,
  fetchRewardOrders,
  fetchRewardHistory,
  fetchRewards,
  fetchMerchandise,
  Merchandise,
  redeemReward,
  RedemptionOrder,
  RewardHistoryEntry,
  RewardsResponse,
} from "@/lib/api";

const fallbackRewards: RewardsResponse = {
  points: 0,
  level: "Starter",
  levelPoints: 0,
  nextLevelPoints: 100,
  leaderboardRank: 0,
  levelRewards: [
    { name: "Starter", minimumPoints: 0 },
    { name: "Pro", minimumPoints: 100 },
    { name: "Legend", minimumPoints: 250 },
    { name: "GOAT", minimumPoints: 500 },
  ],
  leaderboard: [],
  history: [],
  merchandise: [],
};

export default function RewardsPage() {
  const router = useRouter();
  const gender = useGender();
  const [rewards, setRewards] = useState<RewardsResponse>(fallbackRewards);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [orders, setOrders] = useState<RedemptionOrder[]>([]);
  const [selectedMerchandise, setSelectedMerchandise] = useState<Merchandise | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<RewardHistoryEntry | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [address, setAddress] = useState<Omit<DeliveryAddress, "id">>({ name: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("stag_access_token")) {
      router.replace("/signup");
      return;
    }
    Promise.all([fetchRewards(), fetchRewardHistory(), fetchMerchandise(), fetchRewardAddresses(), fetchRewardOrders()])
      .then(([rewardData, rewardHistory, catalogue, savedAddresses, rewardOrders]) => {
        setRewards({ ...fallbackRewards, ...rewardData, history: rewardHistory.length ? rewardHistory : rewardData.history, merchandise: catalogue.length ? catalogue : rewardData.merchandise });
        setAddresses(savedAddresses);
        setOrders(rewardOrders);
      })
      .catch(() => setError("We could not load your rewards right now."))
      .finally(() => setLoading(false));
  }, [router]);

  const points = Number(rewards.points || 0);
  const levels = rewards.levelRewards?.length ? rewards.levelRewards : fallbackRewards.levelRewards || [];
  const currentIndex = Math.max(0, levels.reduce((index, level, position) => points >= Number(level.minimumPoints || 0) ? position : index, 0));
  const currentLevel = levels[currentIndex];
  const nextLevel = levels[currentIndex + 1];
  const progress = nextLevel ? Math.min(100, Math.max(0, ((points - Number(currentLevel?.minimumPoints || 0)) / Math.max(1, Number(nextLevel.minimumPoints || 0) - Number(currentLevel?.minimumPoints || 0))) * 100)) : 100;
  const merchandise = useMemo(() => (rewards.merchandise || []).filter((item) => item.active !== false), [rewards.merchandise]);

  const saveAddress = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const saved = await createRewardAddress(address);
      setAddresses((current) => [...current, saved]);
      setAddress({ name: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" });
      setShowAddressForm(false);
      setMessage("Delivery address saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not save this address.");
    } finally {
      setWorking(false);
    }
  };

  const redeem = async (addressId: string) => {
    if (!selectedMerchandise?.id) return;
    setWorking(true);
    setError("");
    try {
      const order = await redeemReward({ merchandiseId: selectedMerchandise.id, addressId, variantId: selectedMerchandise.variants?.[0]?.id });
      setOrders((current) => [order, ...current]);
      setMessage(`${selectedMerchandise.name || "Merchandise"} redeemed successfully.`);
      setSelectedMerchandise(null);
      const refreshed = await fetchRewards();
      setRewards({ ...fallbackRewards, ...refreshed });
    } catch (redeemError) {
      setError(redeemError instanceof Error ? redeemError.message : "We could not redeem this item.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="app-placeholder content-width rewards-page">
      <Link className="text-link venue-back-link" href={"/home"}><span>←</span> Back to home</Link>
      <header className="app-option-heading rewards-heading">
        <div>
          <p className="eyebrow">YOUR REWARDS</p>
          <h1>Earn your way up.</h1>
          <p className="lede">Complete eligible club entries, follow your progress, and redeem STAG merchandise with your points.</p>
        </div>
        {rewards.referralCode && <div className="reward-code"><span>REFERRAL CODE</span><strong>{rewards.referralCode}</strong></div>}
      </header>
      {message && <p className="form-message form-success" role="status">{message}</p>}
      {error && <p className="form-message form-error" role="alert">{error}</p>}
      {loading ? <div className="empty-panel"><span>Loading your rewards...</span></div> : (
        <>
          <div className="rewards-overview">
            <section className="reward-progress-card">
              <p className="eyebrow">CURRENT LEVEL</p>
              <div className="reward-score"><strong>{points.toLocaleString("en-IN")}</strong><span>POINTS</span></div>
              <h2>{rewards.level || currentLevel?.name || "Starter"}</h2>
              <div className="reward-progress-track"><span style={{ width: `${progress}%` }} /></div>
              <p className="reward-progress-copy">{nextLevel ? `${Math.max(0, Number(nextLevel.minimumPoints || 0) - points)} points to ${nextLevel.name}` : "You have reached the maximum level."}</p>
              <div className="reward-levels">{levels.map((level, index) => <span className={index <= currentIndex ? "reward-level-active" : ""} key={`${level.name}-${index}`}><b>{level.name}</b><small>{level.minimumPoints}+</small></span>)}</div>
            </section>
            <section className="reward-rank-card">
              <p className="eyebrow">LEADERBOARD</p>
              <strong className="reward-rank">#{rewards.leaderboardRank || "-"}</strong>
              <span>Your current rank</span>
              <div className="reward-leaderboard">{(rewards.leaderboard || []).slice(0, 3).map((member, index) => <div key={member.userId || index}><b>{member.rank || index + 1}</b><span>{member.name || "STAG member"}</span><strong>{member.points || 0} pts</strong></div>)}{!rewards.leaderboard?.length && <small>Complete your first shared entry to appear here.</small>}</div>
            </section>
          </div>

          <section className="rewards-section" id="merchandise">
            <div className="rewards-section-heading"><div><p className="eyebrow">REDEEM YOUR POINTS</p><h2>STAG merchandise.</h2></div><div className="rewards-section-actions"><span>{points.toLocaleString("en-IN")} points available</span><a className="text-link" href="#merchandise">View merchandise</a></div></div>
            {merchandise.length ? <div className="merchandise-grid">{merchandise.map((item) => <article className="merchandise-card" key={item.id || item.name}><div className="merchandise-image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>STAG</span>}</div><div className="merchandise-copy"><h3>{item.name || "STAG merchandise"}</h3><p>{item.description || "A reward for showing up together."}</p><div className="merchandise-meta"><strong>{item.pointsRequired || 0} points</strong><span>{(item.stock || 0) > 0 ? `${item.stock} available` : "Out of stock"}</span></div><button className="button button-primary" type="button" disabled={!item.id || !item.pointsRequired || points < item.pointsRequired || !item.stock} onClick={() => setSelectedMerchandise(item)}>{points < (item.pointsRequired || 0) ? "More points needed" : item.stock ? "Redeem item" : "Out of stock"}</button></div></article>)}</div> : <div className="empty-panel"><strong>No merchandise is available yet.</strong><span>New rewards will appear here when the catalogue is updated.</span></div>}
          </section>

          <div className="rewards-lower-grid">
            <section className="rewards-section reward-history-section"><div className="rewards-section-heading"><div><p className="eyebrow">ACTIVITY</p><h2>Points history.</h2></div></div>{rewards.history?.length ? <div className="reward-history-list">{rewards.history.slice(0, 8).map((entry, index) => <button className="reward-history-row" type="button" key={entry.id || index} onClick={() => setSelectedHistoryEntry(entry)}><span className={Number(entry.points || 0) < 0 ? "reward-history-negative" : ""}>{Number(entry.points || 0) > 0 ? "+" : ""}{entry.points || 0}</span><span className="reward-history-copy"><strong>{entry.description || "Reward points update"}</strong><small>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-IN") : ""}</small></span></button>)}</div> : <div className="empty-panel"><span>Your points activity will appear here.</span></div>}</section>
            <section className="rewards-section"><div className="rewards-section-heading"><div><p className="eyebrow">DELIVERY</p><h2>Your orders.</h2></div></div>{orders.length ? <div className="reward-orders">{orders.slice(0, 5).map((order, index) => <div className="reward-order" key={order.orderId || order.id || index}><strong>{order.merchandiseName || "Merchandise"}</strong><span>{order.status || "Processing"}</span><small>{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : ""}</small></div>)}</div> : <div className="empty-panel"><span>Redeemed items and delivery updates will appear here.</span></div>}</section>
          </div>
        </>
      )}

      {selectedMerchandise && <div className="action-modal-backdrop" role="presentation" onClick={() => !working && setSelectedMerchandise(null)}><section className="action-modal reward-modal" role="dialog" aria-modal="true" aria-labelledby="redeem-title" onClick={(event) => event.stopPropagation()}><div className="settings-modal-heading"><div><p className="eyebrow">REDEEM MERCHANDISE</p><h2 id="redeem-title">{selectedMerchandise.name}</h2></div><button className="settings-modal-close" type="button" onClick={() => setSelectedMerchandise(null)} aria-label="Close">×</button></div>{addresses.length ? <div className="reward-address-list">{addresses.map((savedAddress) => <button className="reward-address" type="button" key={savedAddress.id} disabled={working} onClick={() => savedAddress.id && void redeem(savedAddress.id)}><strong>{savedAddress.name}</strong><span>{savedAddress.line1}, {savedAddress.city}, {savedAddress.state} {savedAddress.postalCode}</span></button>)}</div> : <p className="action-modal-copy">Add a delivery address before redeeming this item.</p>}{!showAddressForm ? <button className="button button-quiet" type="button" onClick={() => setShowAddressForm(true)}>Add delivery address</button> : <form className="reward-address-form" onSubmit={saveAddress}>{(["name", "phone", "line1", "line2", "city", "state", "postalCode"] as const).map((field) => <label key={field}>{field === "line1" ? "Address line" : field === "postalCode" ? "Postal code" : field[0].toUpperCase() + field.slice(1)}<input value={address[field] || ""} required={field !== "line2"} onChange={(event) => setAddress((current) => ({ ...current, [field]: event.target.value }))} /></label>)}<button className="button button-primary" type="submit" disabled={working}>{working ? "Saving..." : "Save address"}</button></form>}</section></div>}
      {selectedHistoryEntry && <div className="action-modal-backdrop" role="presentation" onClick={() => setSelectedHistoryEntry(null)}><section className="action-modal reward-modal" role="dialog" aria-modal="true" aria-labelledby="history-detail-title" onClick={(event) => event.stopPropagation()}><div className="settings-modal-heading"><div><p className="eyebrow">POINTS ACTIVITY</p><h2 id="history-detail-title">{selectedHistoryEntry.description || "Reward points update"}</h2></div><button className="settings-modal-close" type="button" onClick={() => setSelectedHistoryEntry(null)} aria-label="Close points detail">×</button></div><div className="reward-history-detail"><div><span>Points</span><strong className={Number(selectedHistoryEntry.points || 0) < 0 ? "reward-history-negative" : ""}>{Number(selectedHistoryEntry.points || 0) > 0 ? "+" : ""}{selectedHistoryEntry.points || 0}</strong></div><div><span>Activity type</span><strong>{selectedHistoryEntry.type || "Reward activity"}</strong></div><div><span>Date</span><strong>{selectedHistoryEntry.createdAt ? new Date(selectedHistoryEntry.createdAt).toLocaleString("en-IN") : "Not available"}</strong></div></div></section></div>}
    </section>
  );
}
