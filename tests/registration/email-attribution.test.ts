import type { PostHog } from "posthog-js";
import { describe, expect, it, vi } from "vitest";
import { rememberEmailClick } from "../../lib/email-attribution";
import {
  analyticsSafeEvent,
  analyticsSafeUrl,
} from "../../shared/analytics-urls";
import {
  attributedUrl,
  attributeEmail,
  EMAIL_ATTRIBUTION_WINDOW_MS,
  emailClick,
  registrationEmailCampaign,
} from "../../shared/email-attribution";
import { certificateEmail } from "../../shared/registration/certificate-email";

const origin = "https://tayloredinstruction.com";
const reminder = { campaign: "cert_reminder_30d", send: "job123" };

describe("email link attribution", () => {
  it("tags first-party links with the campaign and send id", () => {
    const tagged = new URL(
      attributedUrl(`${origin}/courses/bls?ref=a`, reminder, origin)
    );
    expect(Object.fromEntries(tagged.searchParams)).toEqual({
      ref: "a",
      utm_source: "email",
      utm_medium: "email",
      utm_campaign: "cert_reminder_30d",
      utm_content: "job123",
    });
    expect(
      attributedUrl(
        "https://form.tayloredinstruction.com/aha-course-feedback",
        reminder,
        origin
      )
    ).toContain("utm_campaign=cert_reminder_30d");
  });

  it("leaves token, opt-out, external and already tagged links alone", () => {
    for (const url of [
      `${origin}/unsubscribe?token=abc`,
      `${origin}/registration/pay?key=secret`,
      `${origin}/s/abc#invitation=secret`,
      `${origin}/classes?utm_source=newsletter`,
      "https://search.google.com/local/writereview?placeid=x",
      "https://www.redcross.org/take-a-class/digital-certificate",
      "https://example.convex.cloud/api/storage/file",
      "mailto:info@tayloredinstruction.com",
      "tel:+13605551234",
    ]) {
      expect(attributedUrl(url, reminder, origin)).toBe(url);
    }
  });

  it("rewrites escaped hrefs and plain-text links without touching the rest", () => {
    const email = attributeEmail(
      {
        html: `<a href="${origin}/classes?a=1&amp;b=2">Book</a><a href="${origin}/unsubscribe?token=t">Unsubscribe</a>`,
        text: `Book: ${origin}/classes.\nUnsubscribe: ${origin}/unsubscribe?token=t`,
      },
      reminder,
      origin
    );
    expect(email.html).toContain(
      `href="${origin}/classes?a=1&amp;b=2&amp;utm_source=email&amp;utm_medium=email&amp;utm_campaign=cert_reminder_30d&amp;utm_content=job123"`
    );
    expect(email.html).toContain(`href="${origin}/unsubscribe?token=t"`);
    expect(email.text).toContain(
      `${origin}/classes?utm_source=email&utm_medium=email&utm_campaign=cert_reminder_30d&utm_content=job123.`
    );
    expect(email.text).toContain(`${origin}/unsubscribe?token=t`);
  });

  it("tags a rendered expiry reminder's renewal link but not its unsubscribe link", () => {
    const rendered = attributeEmail(
      certificateEmail(
        {
          kind: "reminder",
          firstName: "Ava",
          course: "BLS Provider",
          agency: "aha",
          certificateId: "111122223333",
          issuedOn: "2025-01-31",
          expiresOn: "2027-01-31",
          review: false,
          renewPath: "/courses/bls",
          today: "2027-01-01",
          unsubscribeToken: "token-value",
        },
        origin
      ),
      reminder,
      origin
    );
    expect(rendered.html).toContain(
      "/courses/bls?utm_source=email&amp;utm_medium=email&amp;utm_campaign=cert_reminder_30d"
    );
    expect(rendered.html).toContain('/unsubscribe?token=token-value"');
    expect(rendered.html).not.toContain("token-value&amp;utm");
  });
});

describe("email campaigns", () => {
  it("names each registration email by its job key", () => {
    expect(registrationEmailCampaign("certificate-reminder:c1:60")).toBe(
      "cert_reminder_60d"
    );
    expect(registrationEmailCampaign("certificate-reminder:c1:0")).toBe(
      "cert_reminder_0d"
    );
    expect(registrationEmailCampaign("certificate:c1", { agency: "arc" })).toBe(
      "post_class_arc"
    );
    expect(
      registrationEmailCampaign("step:s1:welcome:0", { afterClass: true })
    ).toBe("class_followup");
    expect(registrationEmailCampaign("step:s1:welcome:0")).toBe(
      "class_reminder"
    );
    expect(registrationEmailCampaign("confirmation:s1")).toBe(
      "registration_confirmation"
    );
    expect(registrationEmailCampaign("something-new:1")).toBe(
      "registration_email"
    );
  });

  it("reads a click only from well-formed email UTMs", () => {
    expect(
      emailClick(
        "?utm_source=email&utm_campaign=post_class_aha&utm_content=job123"
      )
    ).toEqual({ campaign: "post_class_aha", send: "job123" });
    expect(emailClick("?utm_source=email&utm_campaign=invoice")).toEqual({
      campaign: "invoice",
    });
    expect(emailClick("?utm_source=google&utm_campaign=invoice")).toBeNull();
    expect(emailClick("?utm_source=email&utm_campaign=<script>")).toBeNull();
  });
});

function fakePostHog(properties: Record<string, unknown> = {}) {
  const store = { ...properties };
  return {
    store,
    client: {
      register: vi.fn((props: Record<string, unknown>) => {
        Object.assign(store, props);
        return true;
      }),
      unregister: vi.fn((key: string) => {
        store[key] = undefined;
      }),
      get_property: vi.fn((key: string) => store[key]),
    } as unknown as PostHog,
  };
}

describe("email click memory", () => {
  it("keeps the last clicked email as super properties", () => {
    const { client, store } = fakePostHog({ email_send: "old" });
    rememberEmailClick(
      client,
      "?utm_source=email&utm_campaign=cert_reminder_0d",
      1000
    );
    expect(store).toEqual({
      email_send: undefined,
      email_campaign: "cert_reminder_0d",
      email_clicked_at: 1000,
    });
  });

  it("drops the credit once the attribution window passes", () => {
    const { client, store } = fakePostHog({
      email_campaign: "invoice",
      email_send: "job1",
      email_clicked_at: 0,
    });
    rememberEmailClick(client, "", EMAIL_ATTRIBUTION_WINDOW_MS);
    expect(store.email_campaign).toBe("invoice");
    rememberEmailClick(client, "", EMAIL_ATTRIBUTION_WINDOW_MS + 1);
    expect(store.email_campaign).toBeUndefined();
    expect(store.email_send).toBeUndefined();
  });
});

describe("analytics URL hygiene", () => {
  it("strips credentials and invitation fragments from captured URLs", () => {
    expect(
      analyticsSafeUrl(`${origin}/ecards/success?session_id=cs_live_1&x=1`)
    ).toBe(`${origin}/ecards/success?x=1`);
    expect(analyticsSafeUrl(`${origin}/s/abc#invitation=secret`)).toBe(
      `${origin}/s/abc`
    );
    expect(analyticsSafeUrl(`${origin}/classes?utm_source=email`)).toBe(
      `${origin}/classes?utm_source=email`
    );
  });

  it("cleans event and person URL properties", () => {
    const event = analyticsSafeEvent({
      uuid: "u",
      event: "$pageview",
      properties: { $current_url: `${origin}/unsubscribe?token=t`, a: 1 },
      $set_once: { $initial_current_url: `${origin}/s/x#invitation=t` },
    });
    expect(event.properties).toEqual({
      $current_url: `${origin}/unsubscribe`,
      a: 1,
    });
    expect(event.$set_once).toEqual({
      $initial_current_url: `${origin}/s/x`,
    });
  });
});
