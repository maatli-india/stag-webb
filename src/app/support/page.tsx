import { PageIntro } from "@/components/site-shell";

export const metadata = { title: "Support | STAG" };

export default function SupportPage() {
  return (
    <>
      <PageIntro
        eyebrow="SUPPORT"
        title="Clear help when you need it."
        description="Contact STAG directly for help with your account, app, events, safety, privacy, or account deletion."
      />
      <section className="support-directory content-width">
        <article className="support-directory-card">
          <p className="eyebrow">GENERAL SUPPORT</p>
          <h2>Account, app, or event help</h2>
          <p>
            For questions about using STAG, requests, visit plans, events, or
            your account, contact our support team.
          </p>
          <a className="support-contact-link" href="mailto:support@stag.org.in">
            support@stag.org.in
          </a>
          <a className="support-contact-link" href="tel:+918426054904">
            +91 84260 54904
          </a>
        </article>
        <article className="support-directory-card">
          <p className="eyebrow">PRIVACY &amp; ACCOUNT DELETION</p>
          <h2>Privacy requests</h2>
          <p>
            For privacy questions, data requests, or account deletion and
            retention requests, contact our privacy team. Accounts remain
            recoverable for 30 days after a deletion request. After 30 days,
            the account is permanently removed.
          </p>
          <a className="support-contact-link" href="mailto:info@stag.org.in">
            info@stag.org.in
          </a>
        </article>
        <article className="support-directory-card">
          <p className="eyebrow">SAFETY REPORTS</p>
          <h2>Report an urgent concern</h2>
          <p>
            Report unsafe conduct, suspicious activity, or child-safety
            concerns immediately by email. Do not send passwords, OTPs, or
            other account credentials.
          </p>
          <a className="support-contact-link" href="mailto:support@stag.org.in">
            support@stag.org.in
          </a>
          <p className="support-emergency-note">
            STAG support is not an emergency service. If someone is in
            immediate danger, contact local emergency services first.
          </p>
        </article>
      </section>
    </>
  );
}
