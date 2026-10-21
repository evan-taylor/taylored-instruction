import { expect, it } from "vitest";
import {
  brandedEmail,
  registrationEmail,
} from "../../shared/registration/email";

it("escapes all customer content and rejects executable action URLs", () => {
  const content = {
    eyebrow: "Receipt",
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

it("keeps the access token and expiry in both HTML and plain text", () => {
  const url = "https://example.com/registrations/access#one-time-token";
  const result = brandedEmail({
    eyebrow: "Secure access",
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
    eyebrow: "Invoice",
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
  expect(result.html).toContain('<html lang="en" dir="ltr">');
  expect(result.html).toContain('table lang="en" dir="ltr"');
  expect(result.html).toContain('alt="Taylored Instruction"');
  expect(result.html).toContain('<th scope="row"');
  expect(result.html).toContain("Transaction details</caption>");
  expect(result.html.match(/<h1\b/gu)).toHaveLength(1);
  expect(result.html.match(/\$108\.90/gu)).toHaveLength(1);
  expect(new TextEncoder().encode(result.html).byteLength).toBeLessThan(
    102_000
  );
  expect(result.text).toContain("Invoice total: $108.90");
  expect(result.text).toContain("Due date: November 20, 2026");
});
