import { expect, it } from "vitest";
import {
  brandedEmail,
  registrationEmail,
} from "../../shared/registration/email";

it("escapes all customer content and rejects executable action URLs", () => {
  const content = {
    title: '<script>alert("x")</script>',
    preview: "Preview",
    paragraphs: ["<img src=x onerror=alert(1)>"],
    details: [{ label: "<b>Total</b>", value: "$10.89" }],
  };
  const rendered = brandedEmail(content);
  expect(rendered.html).not.toContain("<script>");
  expect(rendered.html).toContain("&lt;img");
  expect(rendered.text).toContain("$10.89");
  expect(() =>
    brandedEmail({
      ...content,
      action: { label: "Open", url: "javascript:alert(1)" },
    })
  ).toThrow("HTTP");
});

it("keeps the action link and expiry in both HTML and plain text", () => {
  const url = "https://example.com/registrations";
  const result = brandedEmail({
    title: "Your registrations",
    preview: "Expires in 30 minutes",
    paragraphs: ["Confirm access on the next page."],
    action: { label: "Open registrations", url },
    note: "Expires in 30 minutes.",
  });
  expect(result.html).toContain(url);
  expect(result.text).toContain(url);
  expect(result.text).toContain("30 minutes");
});

it("points the portal button at sign-in and explains the one-time code", () => {
  const job = {
    category: "Registration confirmed",
    subject: "You’re registered",
    body: "Hi {{attendeeName}}, see {{portalLink}}",
    name: "Sam",
    title: "BLS",
    schedule: "",
    materials: [],
    details: [],
  };
  const result = registrationEmail(job, "https://example.com");
  expect(result.html).toContain('href="https://example.com/registrations"');
  expect(result.html).toContain("one-time code");
  expect(result.html).not.toContain("/registrations/access");
  expect(result.text).toContain("see https://example.com/registrations");
});

it("renders billing details and preserves the invoice destination", () => {
  const result = registrationEmail(
    {
      category: "Invoice",
      subject: "Invoice TI-1",
      body: "Hello {{attendeeName}}",
      name: "Evan & Co",
      title: "BLS",
      schedule: "",
      materials: [],
      details: [{ label: "Invoice total", value: "$10.89" }],
      link: { label: "Pay invoice", url: "https://invoice.stripe.com/test" },
    },
    "https://example.com"
  );
  expect(result.html).toContain("Your training invoice");
  expect(result.html).toContain("Evan &amp; Co");
  expect(result.html).toContain('href="https://invoice.stripe.com/test"');
  expect(result.text).toContain("Invoice total: $10.89");
  expect(result.text).not.toContain("calendar invitation is attached");
});

it("preserves invitation actions and includes readable schedules and material titles", () => {
  const result = registrationEmail(
    {
      category: "Your training",
      subject: "A seat is available",
      body: "Register at /s/class#invitation=token",
      name: "Evan",
      title: "BLS",
      schedule: "Saturday at 9 AM (Pacific)",
      calendar: "ics",
      materials: [{ title: "Preparation guide", url: null }],
      details: [],
    },
    "https://example.com"
  );
  expect(result.html).toContain(
    'href="https://example.com/s/class#invitation=token"'
  );
  expect(result.text).toContain("Preparation guide");
  expect(result.text).toContain("Saturday at 9 AM");
  expect(result.text).toContain("calendar invitation is attached");
});

it("keeps branded emails accessible and below inbox clipping limits", () => {
  const result = brandedEmail({
    title: "Your training invoice",
    preview: "Your invoice is ready",
    paragraphs: ["Review your training invoice."],
    details: [
      { label: "Invoice total", value: "$108.90" },
      { label: "Due date", value: "November 20, 2026" },
    ],
    action: {
      label: "View and pay invoice",
      url: "https://example.com/invoice",
    },
  });
  expect(result.html).toContain('<html dir="ltr" lang="en">');
  expect(result.html).toContain('alt="Taylored Instruction"');
  expect(result.html).toContain('<th scope="row"');
  expect(result.html).toContain('href="tel:+13606858199"');
  expect(result.html.match(/<h1\b/gu)).toHaveLength(1);
  expect(result.html.match(/\$108\.90/gu)).toHaveLength(1);
  expect(new TextEncoder().encode(result.html).byteLength).toBeLessThan(
    102_000
  );
  expect(result.text).toContain("Invoice total: $108.90");
  expect(result.text).toContain("Due date: November 20, 2026");
});

const receiptJob = (details: { label: string; value: string }[]) => ({
  category: "Payment receipt",
  subject: "Receipt",
  body: "Thank you for your payment.",
  name: "Sam",
  title: "BLS",
  schedule: "",
  materials: [],
  details: [{ label: "Course", value: "BLS" }, ...details],
});
const count = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1;

it("moves receipt amounts into the totals box exactly once", () => {
  const amounts = [
    { label: "Subtotal", value: "$170.00" },
    { label: "Sales tax", value: "$14.62" },
    { label: "Total paid", value: "$184.62" },
  ];
  const result = registrationEmail(
    receiptJob([...amounts, { label: "Attendees", value: "Sam\nAlex" }]),
    "https://example.com"
  );
  for (const { label, value } of amounts) {
    expect(count(result.html, `>${label}</th>`)).toBe(1);
    expect(count(result.html, `>${value}</td>`)).toBe(1);
    expect(count(result.text, `${label}: ${value}`)).toBe(1);
  }
  // Amounts render before the remaining details, which keep their rows.
  expect(result.html.indexOf(">Total paid</th>")).toBeLessThan(
    result.html.indexOf(">Course</th>")
  );
  expect(count(result.html, ">Attendees</th>")).toBe(1);
  expect(count(result.html, ">Course</th>")).toBe(1);
});

it("shows a waived payment alongside a zero total", () => {
  const amounts = [
    { label: "Payment waived", value: "$170.00" },
    { label: "Subtotal", value: "$170.00" },
    { label: "Sales tax", value: "$0.00" },
    { label: "Total paid", value: "$0.00" },
  ];
  const result = registrationEmail(receiptJob(amounts), "https://example.com");
  for (const { label, value } of amounts) {
    expect(count(result.html, `>${label}</th>`)).toBe(1);
    expect(count(result.text, `${label}: ${value}`)).toBe(1);
  }
  expect(count(result.html, ">$170.00</td>")).toBe(2);
  expect(count(result.html, ">$0.00</td>")).toBe(2);
});

it("renders nested lists, emphasis, underline and safe links in workflow mail", () => {
  const result = registrationEmail(
    {
      category: "Your training",
      subject: "Preparation",
      name: "<img src=x> **Sam**",
      title: "BLS",
      schedule: "Saturday",
      materials: [],
      details: [],
      body: "Hello {{attendeeName}}\n\n- **Bring ID**\n    - ++Photo ID++\n    - *Arrive early*\n\n3. Review\n4. [Open portal]({{portalLink}})\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert%281%29)",
    },
    "https://example.com"
  );
  expect(result.html.match(/<ul /gu)).toHaveLength(2);
  expect(result.html).toContain('<ol start="3"');
  expect(result.html).toContain("<strong>Bring ID</strong>");
  expect(result.html).toContain("<u>Photo ID</u>");
  expect(result.html).toContain("<em>Arrive early</em>");
  expect(result.html).toContain("&lt;img src=x&gt; **Sam**");
  expect(result.html).toContain("&lt;script&gt;");
  expect(result.html).not.toContain('href="javascript:');
  expect(result.html).toContain('href="https://example.com/registrations"');
  expect(result.text).toContain("Photo ID");
  expect(result.text).not.toContain("++Photo ID++");
  expect(result.text).toContain("3. Review");
});
