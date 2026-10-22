import { expect, type Page, test } from "@playwright/test";

/**
 * Staff browser acceptance against an isolated fixture deployment. Requires
 * NEXT_PUBLIC_REGISTRATION_TEST_LOGIN=true on the web app and
 * REGISTRATION_ALLOW_TEST_FIXTURES=true on the Convex deployment, which enable
 * the test-only password provider. Skipped otherwise.
 */
const ADMIN_EMAIL = "admin@tayloredinstruction.com";
const SHOTS = ".context/shots";
const enabled = process.env.ADMIN_QA === "true";
const RE_COURSE_U = /Course/u;
const RE_OVERBOOK_U = /Overbook/u;
const RE_ENROLL_3_ATTENDEES_U = /Enroll 3 attendees/u;
const RE_HOW_WAS_IT_PAID_U = /How was it paid/u;
const RE_PASTE_THE_ROSTER_U = /Paste the roster/u;
const RE_PAYMENT_RECORDED_FOR_TI_U = /Payment recorded for TI-/u;
const RE_REQUEST_SEND_SUBMIT_U = /Request|Send|Submit/u;
const RE_TI_D_4_D_4_U = /TI-\d{4}-\d{4}/u;
const RE_THANKS_U = /Thanks/u;
const RE_WHY_THIS_PRICE_U = /Why this price/u;
const RE_BILL_TO_U = /^Bill to/u;
const RE_BILLING_EMAIL_U = /^Billing email/u;
const RE_CITY_U = /^City/u;
const RE_CONTACT_NAME_U = /^Contact name/u;
const RE_EMAIL_U = /^Email/u;
const RE_ORDER_U = /^Order/u;
const RE_ORGANIZATION_U = /^Organization/u;
const RE_PRICE_PER_SEAT_U = /^Price per seat/u;
const RE_PURCHASER_EMAIL_U = /^Purchaser email/u;
const RE_PURCHASER_NAME_U = /^Purchaser name/u;
const RE_REASON_U = /^Reason/u;
const RE_SESSION_U = /^Session/u;
const RE_STATE_U = /^State/u;
const RE_STREET_ADDRESS_U = /^Street address/u;
const RE_ZIP_U = /^ZIP/u;

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
test.skip(!enabled, "ADMIN_QA=true enables staff browser acceptance");

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByTestId("test-email").fill(ADMIN_EMAIL);
  await page.getByTestId("test-password").fill("local-test-password-123");
  await page.getByTestId("test-sign-in").click();
  await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible({
    timeout: 20_000,
  });
}

test("admin dashboard and every admin page render for an administrator", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Next sessions")).toBeVisible();
  await page.screenshot({
    path: `${SHOTS}/admin-dashboard.png`,
    fullPage: true,
  });
  const pages: [string, string][] = [
    ["/admin/courses", "Course templates"],
    ["/admin/sessions", "Sessions"],
    ["/admin/materials", "Materials & keycodes"],
    ["/admin/coupons", "Coupons"],
    ["/admin/registrations", "Registrations"],
    ["/admin/registration-activity", "Activity & attention"],
    ["/admin/groups", "Groups & invoices"],
  ];
  await pages.reduce(async (prior, [path, heading]) => {
    await prior;
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: heading })
    ).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `${SHOTS}${path.replaceAll("/", "-")}.png`,
      fullPage: true,
    });
  }, Promise.resolve());
});

test("course and session editors open with fixture data", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/courses");
  await expect(page.getByText("Blended CPR test course")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/admin-course-editor.png` });
  await page.keyboard.press("Escape");
  await page.goto("/admin/sessions");
  await expect(page.getByText("Blended CPR public test session")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/admin-session-editor.png` });
  await page.keyboard.press("Escape");
});

test("group enrollment wizard creates an unpaid order, invoices it, and records payment", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/admin/groups?tab=enroll");
  await expect(page.getByText("Scheduled session")).toBeVisible();
  const sessionSelect = page.getByRole("combobox", { name: RE_SESSION_U });
  const sessionOption = await sessionSelect
    .locator("option", { hasText: "Blended CPR public test session" })
    .first()
    .getAttribute("value");
  await sessionSelect.selectOption(sessionOption ?? "");
  await page.getByRole("button", { name: "Continue" }).click();
  const stamp = Date.now();
  await page
    .getByRole("textbox", { name: RE_PASTE_THE_ROSTER_U })
    .fill(
      [
        `Alice Group, alice-${stamp}@example.test`,
        `Bob Group <bob-${stamp}@example.test>`,
        `carol-${stamp}@example.test, Carol Group`,
      ].join("\n")
    );
  await expect(page.getByText("3 ready")).toBeVisible();
  const overbook = page.getByRole("checkbox", { name: RE_OVERBOOK_U });
  if (await overbook.isVisible()) {
    await overbook.check();
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I accept the course participation policy").check();
  await page.getByLabel("Use a custom group price per seat").check();
  await page.getByRole("textbox", { name: RE_PRICE_PER_SEAT_U }).fill("90.00");
  await page
    .getByRole("textbox", { name: RE_WHY_THIS_PRICE_U })
    .fill("Volume rate");
  await page.screenshot({
    path: `${SHOTS}/admin-wizard-pricing.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("combobox", { name: RE_ORGANIZATION_U })
    .selectOption({ label: "Example Dental Group" });
  await page
    .getByRole("textbox", { name: RE_PURCHASER_NAME_U })
    .fill("Pat Example");
  await page
    .getByRole("textbox", { name: RE_PURCHASER_EMAIL_U })
    .fill(`ap-${stamp}@example.test`);
  await page.getByText("Hold seats, decide later").click();
  await page
    .getByRole("textbox", { name: RE_REASON_U })
    .fill("Browser acceptance");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Template pricing")).toHaveCount(0);
  await page.screenshot({
    path: `${SHOTS}/admin-wizard-review.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: RE_ENROLL_3_ATTENDEES_U }).click();
  await expect(page.getByText("Group enrolled")).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({ path: `${SHOTS}/admin-wizard-done.png` });

  await page.goto("/admin/groups?tab=invoices");
  await page.getByRole("button", { name: "Create invoice" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: RE_ORDER_U })
    .selectOption({ index: 1 });
  await dialog
    .getByRole("textbox", { name: RE_BILL_TO_U })
    .fill("Example Dental Group");
  await dialog
    .getByRole("textbox", { name: RE_BILLING_EMAIL_U })
    .fill(`ap-${stamp}@example.test`);
  await dialog
    .getByRole("textbox", { name: RE_STREET_ADDRESS_U })
    .fill("100 Test Street");
  await dialog.getByRole("textbox", { name: RE_CITY_U }).fill("Vancouver");
  await dialog.getByRole("textbox", { name: RE_STATE_U }).fill("WA");
  await dialog.getByRole("textbox", { name: RE_ZIP_U }).fill("98660");
  await dialog
    .getByLabel("Send the invoice email now with a hosted pay link")
    .uncheck();
  await dialog.getByRole("button", { name: "Create draft" }).click();
  await expect(dialog.getByText("Invoice created as a draft")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(RE_TI_D_4_D_4_U).first()).toBeVisible();
  await page.screenshot({
    path: `${SHOTS}/admin-invoices.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Record payment" }).first().click();
  await page
    .getByRole("textbox", { name: RE_HOW_WAS_IT_PAID_U })
    .fill("Check #1001");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Record payment" })
    .click();
  await expect(page.getByText(RE_PAYMENT_RECORDED_FOR_TI_U)).toBeVisible();
  await expect(page.getByText("Paid Offline").first()).toBeVisible();
});

test("group request page submits and appears in the admin queue", async ({
  page,
}) => {
  await page.goto("/group-training");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: `${SHOTS}/public-group-training.png`,
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: RE_ORGANIZATION_U })
    .fill("Browser QA Org");
  await page
    .getByRole("textbox", { name: RE_CONTACT_NAME_U })
    .fill("QA Person");
  await page
    .getByRole("textbox", { name: RE_EMAIL_U })
    .fill(`qa-${Date.now()}@example.test`);
  await page
    .getByRole("combobox", { name: RE_COURSE_U })
    .first()
    .selectOption({ index: 1 });
  await page.getByRole("spinbutton").first().fill("12");
  await page.getByRole("button", { name: RE_REQUEST_SEND_SUBMIT_U }).click();
  await expect(page.getByText(RE_THANKS_U)).toBeVisible();
  await signIn(page);
  await page.goto("/admin/groups");
  await expect(page.getByText("Browser QA Org").first()).toBeVisible();
});
