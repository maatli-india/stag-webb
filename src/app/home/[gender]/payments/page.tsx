"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { addBankAccount, fetchBankAccount, fetchPaymentBreakdown, fetchUserDetails, updateEntryFee, PaymentBreakdown, UserProfile } from "@/lib/api";

type BankAccount = {
  accountNumber?: string;
  account_number?: string;
  accountHolderName?: string;
  account_holder_name?: string;
  ifsc?: string;
};

export default function PaymentsPage() {
  const params = useParams<{ gender: string }>();
  const gender = params.gender?.toLowerCase() === "female" ? "female" : "male";
  const [profile, setProfile] = useState<UserProfile>({});
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeEditor, setActiveEditor] = useState<"fee" | "bank" | null>(null);
  const [entryFee, setEntryFee] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [ifscBankName, setIfscBankName] = useState("");
  const [ifscError, setIfscError] = useState("");
  const [editorError, setEditorError] = useState("");
  const [editorBusy, setEditorBusy] = useState(false);
  const [pricingBreakdown, setPricingBreakdown] = useState<PaymentBreakdown | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  useEffect(() => {
    const userId = window.localStorage.getItem("stag_user_id");
    if (!userId) {
      setIsLoading(false);
      return;
    }

    Promise.allSettled([
      fetchUserDetails(userId),
      fetchBankAccount(userId),
    ]).then(([userResult, bankResult]) => {
      if (userResult.status === "fulfilled") {
        const userDetails = userResult.value;
        setProfile(userDetails);
        setEntryFee(userDetails.chargeAmount && userDetails.chargeAmount > 0 ? String(userDetails.chargeAmount) : "");
      }

      if (bankResult.status === "fulfilled") {
        const account = getBankAccount(bankResult.value);
        setBankAccount(account);
        populateBankForm(account, userResult.status === "fulfilled" ? userResult.value.name || "" : "");
      } else {
        setBankAccount(null);
        if (userResult.status === "fulfilled") populateBankForm(null, userResult.value.name || "");
      }
    }).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (activeEditor !== "fee") return;
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
  }, [activeEditor, entryFee]);

  const populateBankForm = (account: BankAccount | null, fallbackName: string) => {
    setAccountHolderName(account?.accountHolderName || account?.account_holder_name || fallbackName);
    setAccountNumber(account?.accountNumber || account?.account_number || "");
    setConfirmAccountNumber(account?.accountNumber || account?.account_number || "");
    setIfsc(account?.ifsc || "");
    setIfscBankName(account?.ifsc ? "Bank details saved" : "");
  };

  const openEditor = (editor: "fee" | "bank") => {
    setEditorError("");
    setIfscError("");
    if (editor === "fee") {
      setEntryFee(profile.chargeAmount && profile.chargeAmount > 0 ? String(profile.chargeAmount) : "");
    } else {
      populateBankForm(bankAccount, profile.name || "");
    }
    setActiveEditor(editor);
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
      const details = await response.json() as { BANK?: string; BRANCH?: string };
      setIfscBankName([details.BANK, details.BRANCH].filter(Boolean).join(" • ") || "Bank verified");
    } catch {
      setIfscError("Invalid IFSC code. Please check and try again.");
    }
  };

  const handleSaveFee = async () => {
    const amount = Number(entryFee);
    if (!Number.isInteger(amount) || amount < 500) {
      setEditorError("Entry fee must be at least ₹500.");
      return;
    }
    setEditorBusy(true);
    setEditorError("");
    try {
      await updateEntryFee(amount);
      setProfile((current) => ({ ...current, chargeAmount: amount }));
      setActiveEditor(null);
    } catch (error) {
      setEditorError(getErrorMessage(error, "We could not update your entry fee."));
    } finally {
      setEditorBusy(false);
    }
  };

  const handleSaveBank = async () => {
    const accountNumberIsValid = /^\d{9,18}$/.test(accountNumber);
    if (!accountHolderName.trim() || !accountNumberIsValid || accountNumber !== confirmAccountNumber || !ifscBankName) {
      setEditorError(accountNumber !== confirmAccountNumber ? "Account numbers do not match." : "Complete the bank details and verify the IFSC code.");
      return;
    }
    setEditorBusy(true);
    setEditorError("");
    try {
      await addBankAccount({ accountHolderName: accountHolderName.trim(), accountNumber: accountNumber.trim(), confirmAccountNumber: confirmAccountNumber.trim(), ifsc });
      setBankAccount({ accountHolderName: accountHolderName.trim(), accountNumber: accountNumber.trim(), ifsc });
      setActiveEditor(null);
    } catch (error) {
      setEditorError(getErrorMessage(error, "We could not update your bank account."));
    } finally {
      setEditorBusy(false);
    }
  };

  const savedAccountNumber = bankAccount?.accountNumber || bankAccount?.account_number || "";
  const accountHolder = bankAccount?.accountHolderName || bankAccount?.account_holder_name;
  const payoutBreakdown = (() => {
    const amount = Number(entryFee);
    const baseAmount = Number(pricingBreakdown?.baseAmount);
    const platformFee = Number(pricingBreakdown?.platformFee);
    if (!amount || baseAmount <= 0 || !Number.isFinite(platformFee)) return null;
    const fee = amount * (platformFee / baseAmount);
    return { fee, payout: amount - fee };
  })();

  return (
    <section className="app-placeholder content-width payments-page">
      <Link className="text-link" href={`/home/${gender}`}>← Back to home</Link>
      <header className="app-option-heading">
        <p className="eyebrow">MY PAYMENTS</p>
        <h1>Fees and payouts.</h1>
        <p className="lede">Review the entry fee you have set and the bank account used for eligible STAG payouts.</p>
      </header>

      {isLoading ? <div className="empty-panel"><span>Loading your payment details...</span></div> : (
        <div className="payments-grid">
          <button className="profile-option profile-option-static payments-edit-card" type="button" onClick={() => openEditor("fee")}>
            <div className="profile-option-heading">
              <strong>Entry fee</strong>
              <small>The amount shown for your entry assistance.</small>
              <strong className="payments-amount">{profile.chargeAmount && profile.chargeAmount > 0 ? `₹${profile.chargeAmount}` : "Not set"}</strong>
            </div>
          </button>
          <button className="profile-option profile-option-static payments-edit-card" type="button" onClick={() => openEditor("bank")}>
            <div className="profile-option-heading">
              <strong>Bank account</strong>
              <small>{savedAccountNumber ? `Payout account${accountHolder ? ` for ${accountHolder}` : ""}.` : "Add a bank account to receive eligible payouts."}</small>
              <strong className="payments-amount">{savedAccountNumber ? `•••• ${savedAccountNumber.slice(-4)}` : "Not added"}</strong>
            </div>
            {bankAccount?.ifsc && <p className="payments-ifsc">IFSC {bankAccount.ifsc}</p>}
          </button>
        </div>
      )}

      <Link className="payments-earnings-card" href={`/home/${gender}/payments/earnings`}>
        <span>
          <strong>My Earnings</strong>
          <small>View your processed earnings, payouts and deductions.</small>
        </span>
        <b aria-hidden="true">›</b>
      </Link>

      <div className="payments-actions">
        <Link className="button button-quiet" href={`/home/${gender}/support`}>Payment support</Link>
      </div>

      {activeEditor && <div className="action-modal-backdrop" role="presentation" onClick={() => setActiveEditor(null)}>
        <section className="action-modal payment-edit-modal" role="dialog" aria-modal="true" aria-labelledby="payment-editor-title" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close-button" type="button" aria-label="Close editor" onClick={() => setActiveEditor(null)}>×</button>
          {activeEditor === "fee" ? <form onSubmit={(event) => { event.preventDefault(); void handleSaveFee(); }}>
            <p className="eyebrow">ENTRY FEE</p>
            <h2 id="payment-editor-title">Update your entry fee.</h2>
            <p className="action-modal-copy">Choose the amount you receive when you help a member enter a venue.</p>
            <label>Amount per entry<input type="number" min="500" step="1" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} placeholder="e.g. 500" required /></label>
            <p className="fee-breakdown-intro">Your estimated payout after the STAG service fee:</p>
            {payoutBreakdown ? <div className="fee-breakdown" aria-label="Estimated payout breakdown"><div><span>STAG platform fee</span><strong>{formatCurrency(payoutBreakdown.fee)}</strong></div><div className="fee-breakdown-total"><span>Estimated STAG platform payout</span><strong>{formatCurrency(payoutBreakdown.payout)}</strong></div></div> : pricingLoading ? <p className="fee-breakdown-loading">Calculating your estimated payout...</p> : null}
            {editorError && <p className="form-message form-error" role="alert">{editorError}</p>}
            <div className="action-modal-buttons"><button className="button button-quiet" type="button" onClick={() => setActiveEditor(null)}>Cancel</button><button className="button button-primary" type="submit" disabled={editorBusy}>{editorBusy ? "Saving..." : "Update entry fee"}</button></div>
          </form> : <form onSubmit={(event) => { event.preventDefault(); void handleSaveBank(); }}>
            <p className="eyebrow">BANK ACCOUNT</p>
            <h2 id="payment-editor-title">Update your bank account.</h2>
            <p className="action-modal-copy">Your bank details are used only to process eligible STAG payouts.</p>
            <label>Account holder name<input type="text" value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)} required /></label>
            <label>Account number<input type="password" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))} minLength={9} maxLength={18} required /></label>
            <label>Confirm account number<input className={accountNumber !== confirmAccountNumber ? "input-invalid" : ""} type="text" inputMode="numeric" value={confirmAccountNumber} onChange={(event) => setConfirmAccountNumber(event.target.value.replace(/\D/g, ""))} minLength={9} maxLength={18} required /></label>
            <label>IFSC code<input type="text" value={ifsc} onChange={(event) => void handleIfscChange(event.target.value)} maxLength={11} placeholder="e.g. HDFC0001234" required />{ifscBankName && <span className="ifsc-success">{ifscBankName}</span>}{ifscError && <span className="ifsc-error">{ifscError}</span>}</label>
            {editorError && <p className="form-message form-error" role="alert">{editorError}</p>}
            <div className="action-modal-buttons"><button className="button button-quiet" type="button" onClick={() => setActiveEditor(null)}>Cancel</button><button className="button button-primary" type="submit" disabled={editorBusy || !ifscBankName}>{editorBusy ? "Saving..." : "Update bank account"}</button></div>
          </form>}
        </section>
      </div>}
    </section>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

function getBankAccount(response: unknown): BankAccount | null {
  const data = (response as { data?: unknown })?.data ?? response;
  if (Array.isArray(data)) return (data[0] as BankAccount | undefined) || null;
  const wrapped = data as { bankAccount?: BankAccount; account?: BankAccount } | null;
  return wrapped?.bankAccount || wrapped?.account || (data as BankAccount) || null;
}
