import { expect, test } from "@playwright/test";

const LOGIN_URL = /\/login/u;
const SUCCESS_URL = /\/registration\/success/u;

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
  await page.getByRole("button", { name: "Add attendee", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Safe Test Student");
  await page.getByLabel("Email", { exact: true }).fill("student@example.test");
  await page
    .getByLabel("I accept the course participation policy (required)")
    .check();
  await expect(
    page.getByText("Estimated total before coupon: $130.00")
  ).toBeVisible();
  await page.getByLabel("I already have this material").check();
  await expect(
    page.getByText("Estimated total before coupon: $110.00")
  ).toBeVisible();
  await page.getByLabel("Add this material").check();
  await expect(
    page.getByText("Estimated total before coupon: $125.00")
  ).toBeVisible();
});
test("free checkout completes without a card and the success page reads backend status", async ({
  page,
}) => {
  await page.goto("/s/registration-test-free");
  await page.getByLabel("Your name", { exact: true }).fill("Safe Test Buyer");
  await page
    .getByLabel("Your email", { exact: true })
    .fill(`buyer-${crypto.randomUUID()}@example.test`);
  await page.getByRole("button", { name: "Add attendee", exact: true }).click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Safe Test Attendee");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`attendee-${crypto.randomUUID()}@example.test`);
  await page
    .getByRole("button", {
      name: "Review final total and reserve seats",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(SUCCESS_URL);
  await page
    .getByRole("button", { name: "Check this order", exact: true })
    .click();
  await expect(
    page.getByText(
      "Your registration is confirmed. Check your email for access instructions."
    )
  ).toBeVisible();
});
test("guest access is explicit and a scanned link does not exchange its token", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/api/registration/portal")
    ) {
      requests.push(request.url());
    }
  });
  await page.goto("/registrations/access#invalid-test-token");
  await expect(
    page.getByRole("button", { name: "Confirm secure access" })
  ).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Confirm secure access" }).click();
  await expect(
    page.getByText(
      "Unable to complete access. Request another link or try again later."
    )
  ).toBeVisible();
});
test("existing login and contact routes still render without sending email", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByText("Continue with Google", { exact: false })
  ).toBeVisible();
  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { name: "Contact Us", exact: true })
  ).toBeVisible();
  await page.goto("/ecards");
  await expect(page).toHaveURL(LOGIN_URL);
});
