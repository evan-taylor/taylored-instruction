import type Stripe from "stripe";

const CUSTOMER_PAGE = 100;

export type CustomerDetails = {
  email: string;
  name?: string;
  phone?: string;
  address?: Stripe.AddressParam;
  /** An organization's bill-to Customer never matches a person's Customer, even with the same email. */
  organizationId?: string;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Stripe Customers that belong to this purchaser, oldest first. Listing by
 * email is strongly consistent (unlike search), so a Customer created a moment
 * ago is found. The email filter is case-sensitive, so the address as typed is
 * checked too when it differs from the normalized one.
 */
export async function matchingCustomers(
  client: Stripe,
  details: CustomerDetails
) {
  const email = normalizeEmail(details.email);
  const typed = details.email.trim();
  const pages = await Promise.all(
    [...new Set([email, typed])].map((address) =>
      client.customers.list({ email: address, limit: CUSTOMER_PAGE })
    )
  );
  const seen = new Map<string, Stripe.Customer>();
  for (const customer of pages.flatMap((page) => page.data)) {
    if (
      normalizeEmail(customer.email ?? "") === email &&
      customer.metadata?.registrationOrganization === details.organizationId
    ) {
      seen.set(customer.id, customer);
    }
  }
  return [...seen.values()].sort((a, b) => a.created - b.created);
}

/**
 * Reuses the purchaser's oldest matching Stripe Customer or creates one. The
 * idempotency key makes concurrent or retried creates return the same Customer.
 */
export async function findOrCreateCustomer(
  client: Stripe,
  details: CustomerDetails,
  idempotencyKey: string
) {
  const [existing] = await matchingCustomers(client, details);
  if (existing) {
    return existing.id;
  }
  const created = await client.customers.create(
    {
      email: normalizeEmail(details.email),
      name: details.name || undefined,
      phone: details.phone || undefined,
      address: details.address,
      metadata: details.organizationId
        ? { registrationOrganization: details.organizationId }
        : {},
    },
    { idempotencyKey }
  );
  return created.id;
}
