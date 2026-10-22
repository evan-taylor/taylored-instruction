import { expect, test } from "@playwright/test";

const LOGIN_URL = /\/login/u;
const SUCCESS_URL = /\/registration\/success/u;
const PORTAL_URL = /\/registrations$/u;

test("public discovery excludes private sessions and shows the default material price", async ({
  page,
}) => {
  await page.goto("/classes");
  await expect(
    page.getByRole("link", {
      name: "Blended CPR public test session",
      exact: true,
    })
  ).toBeVisible();
  await expect(page.getByText("$130.00 per attendee")).toBeVisible();
  await expect(page.getByText("Blended CPR private test session")).toHaveCount(
    0
  );
  await expect(page.getByText("Blended CPR admin test session")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Calendar view", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "List view", exact: true })
  ).toBeVisible();
});
test("per-attendee waivers and optional selections update the itemized estimate", async ({
  page,
}) => {
  await page.goto("/s/registration-test-public");
  await page
    .getByRole("button", { name: "I am registering others", exact: true })
    .click();
  await page.getByLabel("First name", { exact: true }).fill("Safe");
  await page.getByLabel("Last name", { exact: true }).fill("Test Student");
  await page.getByLabel("Email", { exact: true }).fill("student@example.test");
  await page
    .getByLabel("I accept the course participation policy (required)")
    .check();
  await expect(
    page
      .locator("p", { hasText: "Estimated total" })
      .getByText("$130.00", { exact: true })
  ).toBeVisible();
  await page.getByLabel("I already have this material").check();
  await expect(
    page
      .locator("p", { hasText: "Estimated total" })
      .getByText("$110.00", { exact: true })
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Practice guide" }).check();
  await expect(
    page
      .locator("p", { hasText: "Estimated total" })
      .getByText("$125.00", { exact: true })
  ).toBeVisible();
});
test("free checkout completes without a card and the success page reads backend status", async ({
  page,
}) => {
  await page.goto("/s/registration-test-free");
  await page.getByLabel("Your first name", { exact: true }).fill("Safe");
  await page.getByLabel("Your last name", { exact: true }).fill("Test Buyer");
  await page
    .getByLabel("Your email", { exact: true })
    .fill(`buyer-${crypto.randomUUID()}@example.test`);
  await expect(
    page.getByRole("button", { name: "I am registering myself", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("First name", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Continue to payment",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(SUCCESS_URL);
  await expect(
    page.getByText(
      "Your registration is confirmed. Check your email for access instructions."
    )
  ).toBeVisible();
});
test("the portal asks visitors to sign in with the same code flow as staff", async ({
  page,
}) => {
  await page.goto("/registrations");
  await expect(page).toHaveURL(PORTAL_URL);
  await expect(
    page.getByRole("heading", { name: "Sign in to see your registrations" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Email me a sign-in code", exact: true })
  ).toBeVisible();
  await page.goto("/registrations/access");
  await expect(page.getByText("404", { exact: true })).toBeVisible();
});
test("existing login and contact routes still render without sending email", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Email me a sign-in code", exact: true })
  ).toBeVisible();
  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { name: "Contact us", exact: true })
  ).toBeVisible();
  await page.goto("/ecards");
  await expect(page).toHaveURL(LOGIN_URL);
});

test("self-registration reuses purchaser details and switching modes preserves attendee inputs", async ({
  page,
}) => {
  await page.goto("/s/registration-test-public");
  await page.getByLabel("Your first name", { exact: true }).fill("Self");
  await page.getByLabel("Your last name", { exact: true }).fill("Student");
  await page
    .getByLabel("Your email", { exact: true })
    .fill("self@example.test");
  await expect(page.getByLabel("First name", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "I am registering others", exact: true })
    .click();
  await page.getByLabel("First name", { exact: true }).fill("Other");
  await page.getByLabel("Last name", { exact: true }).fill("Student");
  await page.getByLabel("Email", { exact: true }).fill("other@example.test");
  await page
    .getByRole("button", { name: "I am registering myself", exact: true })
    .click();
  await expect(page.getByLabel("Your first name", { exact: true })).toHaveValue(
    "Self"
  );
  await expect(page.getByLabel("First name", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "I am registering others", exact: true })
    .click();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Other"
  );
});
