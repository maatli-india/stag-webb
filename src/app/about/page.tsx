import { PageIntro } from "@/components/site-shell";

export const metadata = { title: "About STAG | Club entry, handled with clarity" };

export default function AboutPage() {
  return <><PageIntro eyebrow="ABOUT STAG" title="A clearer way to arrange club entry." description="STAG is a platform for adults who want a more transparent, venue-focused way to arrange club entry assistance." /><section className="legal-page content-width"><h2>Built around the venue</h2><p>STAG keeps the experience focused on the club, the scheduled visit, and the steps required for entry. Members can discover venues, review requests, and confirm what happens next without relying on vague promises or informal arrangements.</p><h2>Payments through the platform</h2><p>Members pay STAG through the secure payment gateway. STAG acts as the platform intermediary, processes the transaction, and manages eligible refunds and payouts under the applicable policy. Users do not pay each other directly.</p><h2>Choice and clarity</h2><p>Registered entry-assistance members decide which requests they accept. Every request should show the relevant venue, timing, and fee details before it moves forward.</p><h2>Made by Maatli Tech</h2><p>STAG is developed and maintained by Maatli Tech Private Limited. For support, contact <a className="text-link" href="mailto:info@stag.org.in">info@stag.org.in</a>.</p></section></>;
}
