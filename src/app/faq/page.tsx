import { PageIntro } from "@/components/site-shell";

const faqs = [
  ["How do I find a club or pub?", "Use the search field on the Home screen to search by area, venue, or club name. You can also browse nearby venues using your current location, then open a venue to see its details and available people or plans."],
  ["How do I find someone to visit with?", "Open a venue from Home and browse nearby members or published visit plans for that place. Review the profile and planned date and time before sending a request."],
  ["How do I send a request?", "Open a member or visit plan, check the venue and visit time, then tap Send Request. Your request appears in My Requests as Pending until the other person responds."],
  ["What happens after I send a request?", "The recipient can Accept or Reject it. While it is Pending, you can open the request to review its details, and you will be notified when the status changes."],
  ["What happens after a request is accepted?", "The request becomes Confirmed. Use the request details to review the venue and time, contact your counterpart with Call or Message, and coordinate where to meet."],
  ["How does club entry confirmation work?", "When the request is Confirmed, each participant sees the entry confirmation code needed by the other participant. Meet at the club, share your code, and enter the code provided by your counterpart in the request details."],
  ["When is a request completed?", "The request becomes Completed after the entry confirmation code is successfully entered and the club entry is verified."],
  ["Can I cancel a request?", "You can cancel an accepted or confirmed request from the three-dot menu on its Request Details screen."],
  ["What is a visit plan?", "A visit plan lets you publish the venue, date, and time you are planning to visit. Other members can discover that plan and send a request to join you."],
  ["How do I manage a visit plan?", "Open My Visit Plans from the side menu to review, edit, or delete your upcoming plans. Deleting a plan does not automatically cancel requests that were already sent or accepted."],
  ["How do I publish a visit plan?", "Open Plan Your Visit, choose a club, select your visit date and time, and tap Publish Visit. Your plan can then be discovered by members looking for the same venue."],
  ["How do I review a request for my visit plan?", "Open the request from the Requests section on Home or My Requests. Review the person, venue, and requested time, read and accept the safety disclaimer, then choose Accept or Reject."],
  ["What happens after I accept a request?", "The request becomes Confirmed. Use Call or Message from Request Details to coordinate the meeting point and timing before going to the club."],
  ["Can I cancel a request or delete a visit plan?", "You can cancel an accepted or confirmed request from Request Details. You can also delete a visit plan from My Visit Plans, but existing requests are not cancelled automatically."],
  ["How do I block or report someone?", "Open the relevant profile or request, use the available options menu, and choose Block or Report. Include the venue, date, time, chat, or request details that can help Support investigate."],
  ["Is my personal information safe?", "Only the profile information needed for discovery and coordination is shown to matched users. Do not share passwords or verification codes in chat."],
  ["How do reward points and merchandise work?", "STAG may award points for eligible completed activity and qualifying referrals. Your points determine your reward level. When you have enough points, you can redeem available merchandise by selecting or adding a delivery address. We will notify you about delivery updates."],
  ["Can I redeem merchandise more than once?", "Yes. If an item is active, in stock, and you have enough points, you can redeem it again. Each redemption uses the points shown for the item and requires a delivery address."],
  ["What happens when I request account deletion?", "Your account remains recoverable for 30 days. Contact support during this period if you want to retain your account. After 30 days, your account will be permanently removed and cannot be restored. For deletion or privacy requests, email info@stag.org.in."],
  ["How do I get help?", "For account, app, safety, or event support, email support@stag.org.in. For privacy or account deletion requests, email info@stag.org.in. Include your registered email address and a clear description. Never send passwords or verification codes."],
];

export default function FaqPage() {
  return <><PageIntro eyebrow="FAQ" title="The useful answers, up front." description="A quick guide to accounts, events, plans, requests, verification, and support on STAG." /><section className="faq-list content-width">{faqs.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section></>;
}
