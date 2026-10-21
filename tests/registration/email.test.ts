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
  expect(result.html).toContain("Your training invoice.");
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
