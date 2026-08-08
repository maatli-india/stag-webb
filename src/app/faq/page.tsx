import { PageIntro } from "@/components/site-shell";

const faqs = [
  ["What is STAG?", "STAG helps adults arrange club entry assistance around a specific venue and time. The platform keeps the request, payment, and confirmation steps visible."],
  ["Who can use STAG?", "STAG is for adults aged 18 or older. Users must provide accurate information and follow venue and platform rules."],
  ["How does payment work?", "Once a request is accepted, the requesting member pays STAG through the secure payment gateway. STAG processes the platform payment; users do not pay each other directly."],
  ["When is a payout processed?", "After the club entry is completed and verified, STAG processes any eligible platform payout to the registered member's bank account according to the applicable policy."],
  ["What are the arrival and entry codes?", "The codes are venue-based verification steps. They are used at the club entrance to confirm arrival and entry for the specific request, not as a social meetup feature."],
  ["Can I cancel a request?", "Cancellation and refund eligibility depend on the request status and timing. Review the cancellation policy or contact support before cancelling."],
  ["How do I get help?", "Email info@stag.org.in with your account email, request details, and a clear description. Never send passwords, payment PINs, or verification codes."],
];

export default function FaqPage() {
  return <><PageIntro eyebrow="FAQ" title="The useful answers, up front." description="A quick guide to accounts, requests, payments, verification, and support on STAG." /><section className="faq-list content-width">{faqs.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section></>;
}
