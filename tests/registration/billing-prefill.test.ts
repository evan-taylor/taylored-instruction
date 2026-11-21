import { describe, expect, it } from "vitest";
import {
  applyPrefill,
  invoicePrefill,
  missingOrganizationBilling,
  type OrganizationBilling,
  purchaserPrefill,
} from "../../components/admin/billing-prefill";
import {
  emptyInvoiceDraft,
  type InvoiceDraft,
} from "../../components/admin/invoices";

const acme: OrganizationBilling = {
  name: "Acme Dental Group",
  contactName: "Pat Example",
  contactEmail: "ap@acme.test",
  address: "100 Test Street",
  city: "Vancouver",
  state: "WA",
  postalCode: "98660",
  country: "US",
};
const harbor: OrganizationBilling = {
  name: "Harbor Pediatrics",
  contactName: "",
  contactEmail: "billing@harbor.test",
  address: "",
};

function prefilled(organization: OrganizationBilling) {
  return applyPrefill(
    emptyInvoiceDraft,
    emptyInvoiceDraft,
    {},
    invoicePrefill(organization)
  );
}

describe("organization billing prefill", () => {
  it("maps an organization onto the invoice and purchaser fields", () => {
    expect(invoicePrefill(acme)).toEqual({
      billToName: "Acme Dental Group",
      billToEmail: "ap@acme.test",
      billToAddress: "100 Test Street",
      city: "Vancouver",
      state: "WA",
      postalCode: "98660",
      country: "US",
    });
    expect(purchaserPrefill(acme)).toEqual({
      name: "Pat Example",
      email: "ap@acme.test",
    });
    expect(invoicePrefill(harbor)).toEqual({
      billToName: "Harbor Pediatrics",
      billToEmail: "billing@harbor.test",
    });
    expect(invoicePrefill(undefined)).toEqual({});
    expect(purchaserPrefill(null)).toEqual({});
  });

  it("fills empty fields and keeps terms, PO, and notes", () => {
    const draft = prefilled(acme);
    expect(draft).toEqual({ ...emptyInvoiceDraft, ...invoicePrefill(acme) });
  });

  it("never overwrites a value the person typed", () => {
    const typed: InvoiceDraft = {
      ...emptyInvoiceDraft,
      billToName: "Acme Accounts Payable",
      postalCode: "98661",
    };
    const draft = applyPrefill(
      typed,
      emptyInvoiceDraft,
      {},
      invoicePrefill(acme)
    );
    expect(draft.billToName).toBe("Acme Accounts Payable");
    expect(draft.postalCode).toBe("98661");
    expect(draft.billToAddress).toBe("100 Test Street");
    expect(draft.city).toBe("Vancouver");
  });

  it("swaps prefilled values when the organization changes but keeps edits", () => {
    const edited = { ...prefilled(acme), city: "Camas" };
    const draft = applyPrefill(
      edited,
      emptyInvoiceDraft,
      invoicePrefill(acme),
      invoicePrefill(harbor)
    );
    expect(draft).toEqual({
      ...emptyInvoiceDraft,
      billToName: "Harbor Pediatrics",
      billToEmail: "billing@harbor.test",
      city: "Camas",
    });
  });

  it("clears prefilled values when the organization is removed", () => {
    const draft = applyPrefill(
      prefilled(acme),
      emptyInvoiceDraft,
      invoicePrefill(acme),
      {}
    );
    expect(draft).toEqual(emptyInvoiceDraft);
  });

  it("offers to save only the fields the organization is missing", () => {
    const draft = {
      ...prefilled(harbor),
      billToEmail: "ap@harbor.test",
      billToAddress: "1 Harbor Way",
      city: "Seattle",
      state: "WA",
      postalCode: "98101",
    };
    expect(missingOrganizationBilling(harbor, draft)).toEqual({
      patch: {
        address: "1 Harbor Way",
        city: "Seattle",
        state: "WA",
        postalCode: "98101",
        country: "US",
      },
      labels: ["street address", "city", "state", "ZIP", "country"],
    });
    expect(missingOrganizationBilling(acme, prefilled(acme)).labels).toEqual(
      []
    );
    expect(missingOrganizationBilling(undefined, draft).labels).toEqual([]);
  });
});
