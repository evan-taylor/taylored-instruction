import type Stripe from "stripe";

const CUSTOMER_PAGE = 100;
const CUSTOMER_LIMIT = 1000;

export type CustomerDetails = {
  email: string;
  name?: string;
  phone?: string;
  address?: Stripe.AddressParam;
  /** An organization's bill-to Customer never matches a person's Customer, even with the same email. */
  organizationId?: string;
};

/** Maps `metadata.registrationInvoice` ids to the organization each invoice billed. */
export type InvoiceOrganizations = (
  invoiceIds: string[]
) => Promise<Record<string, string>>;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** One key per purchaser, shared by every path that creates a Customer. */
export function customerKey(details: CustomerDetails) {
  return details.organizationId
    ? `organization:${details.organizationId}`
    : `email:${normalizeEmail(details.email)}`;
}

function escapeSearch(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

/**
 * Stripe Customers that belong to this purchaser, oldest first. Listing by
 * email is strongly consistent, so a Customer created a moment ago is found;
 * search is case-insensitive, so Customers saved with a mixed-case email are
 * found too. Customers made by the old per-invoice flow carry only
 * `registrationInvoice`, so `invoiceOrganizations` says which of them
 * belong to an organization.
 */
export async function matchingCustomers(
  client: Stripe,
  details: CustomerDetails,
  invoiceOrganizations?: InvoiceOrganizations
) {
  const email = normalizeEmail(details.email);
  const [listed, searched] = await Promise.all([
    client.customers
      .list({ email, limit: CUSTOMER_PAGE })
      .autoPagingToArray({ limit: CUSTOMER_LIMIT }),
    client.customers
      .search({ query: `email:"${escapeSearch(email)}"`, limit: CUSTOMER_PAGE })
      .autoPagingToArray({ limit: CUSTOMER_LIMIT }),
  ]);
  const candidates = new Map<string, Stripe.Customer>();
  for (const customer of [...listed, ...searched]) {
    if (normalizeEmail(customer.email ?? "") === email) {
      candidates.set(customer.id, customer);
    }
  }
  const legacy = [...candidates.values()]
    .filter((c) => !c.metadata?.registrationOrganization)
    .flatMap((c) => c.metadata?.registrationInvoice ?? []);
  const owners =
    legacy.length && invoiceOrganizations
      ? await invoiceOrganizations(legacy)
      : {};
  return [...candidates.values()]
    .filter(
      (c) =>
        (c.metadata?.registrationOrganization ??
          owners[c.metadata?.registrationInvoice ?? ""]) ===
        details.organizationId
    )
    .sort((a, b) => a.created - b.created);
}

/**
 * Reuses the purchaser's oldest matching Stripe Customer or creates one. The
 * create request carries only the email and owner under an idempotency key
 * derived from the purchaser, so concurrent or retried creates from any path
 * return the same Customer; name, phone and address follow in an update.
 */
export async function findOrCreateCustomer(
  client: Stripe,
  details: CustomerDetails,
  invoiceOrganizations?: InvoiceOrganizations
) {
  const [existing] = await matchingCustomers(
    client,
    details,
    invoiceOrganizations
  );
  const metadata: Record<string, string> = details.organizationId
    ? { registrationOrganization: details.organizationId }
    : {};
  const customer =
    existing ??
    (await client.customers.create(
      { email: normalizeEmail(details.email), metadata },
      { idempotencyKey: `stripe-customer:${customerKey(details)}` }
    ));
  const missing = {
    ...(!customer.name && details.name ? { name: details.name } : {}),
    ...(!customer.phone && details.phone ? { phone: details.phone } : {}),
    ...(!customer.address && details.address
      ? { address: details.address }
      : {}),
    ...(details.organizationId && !customer.metadata?.registrationOrganization
      ? { metadata }
      : {}),
  };
  if (Object.keys(missing).length) {
    await client.customers.update(customer.id, missing);
  }
  return customer.id;
}
