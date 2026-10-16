"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGender } from "@/lib/hooks";

const memberFaqs = [["How do I send an event request?", "Browse an event or plan, review the date and venue, then send a request to attend together."], ["What happens after my request is accepted?", "The accepted plan and its next steps appear on the request details page."], ["Can I cancel a confirmed request?", "Yes, when cancellation is available for the request status. Review the request details or contact support for help."], ["How do I report a user?", "Open the relevant profile or request and use Report profile. Include specific details and never share passwords or verification codes."], ["Why is my request still pending?", "The person who created the plan has not responded yet. You will receive an update when the request status changes."]];

const fuserFaqs = [["How do I accept an event request?", "Open the request from the Requests section on your home screen and tap Accept or Reject."], ["How do I enter the Entry Code?", "Open the request details and enter the code provided at the venue when prompted."], ["How do I block a user?", "Open the user's profile and tap Block User. You can unblock the user later from Blocked Users in the side menu."], ["How do I report a user?", "Open the user profile and tap Report User. Select the reason that best describes the issue, then continue to the support email with the relevant details. Do not include passwords or verification codes."], ["What is a visit plan?", "A visit plan lets you share that you are planning to attend a specific event or venue. People interested in the same plan can find it and send you a request to attend together."], ["How do I publish a visit plan?", "Open Plan Your Visit, choose an event or venue, select the date and time, and tap Publish Visit."], ["How do I manage my visit plans?", "Open My Visit Plans from the side menu to view your upcoming plans. You can edit or delete a plan when needed."], ["Can I delete a visit plan after receiving a request?", "Yes. Deleting the plan does not cancel or change requests that were already sent. Review those requests separately."], ["What happens when someone sends a request for my visit plan?", "The request appears in the Requests section, where you can review the details and choose whether to accept it."]];

export default function SupportPage() {
  const gender = useGender();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const faqs = (!mounted || gender === "male") ? memberFaqs : fuserFaqs;

  return (
    <section className="app-placeholder content-width profile-options-page">
      <Link className="text-link venue-back-link" href="/home"><span>←</span> Back to home</Link>
      <header className="app-option-heading">
        <p className="eyebrow">SUPPORT</p>
        <h1>Useful answers, right here.</h1>
        <p className="lede">Have a problem using STAG or want to suggest how we can improve? Find answers about events, plans, requests, and safety.</p>
      </header>
      <div className="support-page-content">
        <div className="support-faq-list">
          {faqs.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}<span>+</span></summary>
              <p>{answer}</p>
            </details>
          ))}
          <Link className="support-policy-link" href="/settings/policy">Safety and request guidelines <span>›</span></Link>
        </div>
        <section className="support-contact">
          <p className="request-detail-heading">NEED MORE HELP?</p>
          <p>For account, app, safety, or event support, email <a className="text-link" href="mailto:support@stag.org.in">support@stag.org.in</a>. For privacy or account deletion requests, email <a className="text-link" href="mailto:info@stag.org.in">info@stag.org.in</a>.</p>
          <a className="button button-primary" href="mailto:support@stag.org.in">Email support</a>
          <p className="support-note">Never send passwords, OTPs, or verification codes.</p>
        </section>
      </div>
    </section>
  );
}
