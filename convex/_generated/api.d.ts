/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as admin from "../admin.js";
import type * as aligned from "../aligned.js";
import type * as alignedSchema from "../alignedSchema.js";
import type * as alignmentMigration from "../alignmentMigration.js";
import type * as auth from "../auth.js";
import type * as certificateVerification from "../certificateVerification.js";
import type * as crons from "../crons.js";
import type * as emailPreferences from "../emailPreferences.js";
import type * as http from "../http.js";
import type * as instructorCertifications from "../instructorCertifications.js";
import type * as instructorInvitations from "../instructorInvitations.js";
import type * as mcp from "../mcp.js";
import type * as migration from "../migration.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as products from "../products.js";
import type * as profiles from "../profiles.js";
import type * as registration from "../registration.js";
import type * as registrationAttendees from "../registrationAttendees.js";
import type * as registrationBilling from "../registrationBilling.js";
import type * as registrationBillingLedger from "../registrationBillingLedger.js";
import type * as registrationCertificates from "../registrationCertificates.js";
import type * as registrationCustomerBackfill from "../registrationCustomerBackfill.js";
import type * as registrationCustomers from "../registrationCustomers.js";
import type * as registrationDashboard from "../registrationDashboard.js";
import type * as registrationDisputes from "../registrationDisputes.js";
import type * as registrationEmailWebhook from "../registrationEmailWebhook.js";
import type * as registrationEngagement from "../registrationEngagement.js";
import type * as registrationEvidence from "../registrationEvidence.js";
import type * as registrationExternal from "../registrationExternal.js";
import type * as registrationFixtures from "../registrationFixtures.js";
import type * as registrationGroups from "../registrationGroups.js";
import type * as registrationHelpers from "../registrationHelpers.js";
import type * as registrationInvoiceActions from "../registrationInvoiceActions.js";
import type * as registrationMail from "../registrationMail.js";
import type * as registrationMaterialOrders from "../registrationMaterialOrders.js";
import type * as registrationMaterialSelection from "../registrationMaterialSelection.js";
import type * as registrationMigration from "../registrationMigration.js";
import type * as registrationOperations from "../registrationOperations.js";
import type * as registrationPayments from "../registrationPayments.js";
import type * as registrationPolicy from "../registrationPolicy.js";
import type * as registrationPortal from "../registrationPortal.js";
import type * as registrationRefundAllocation from "../registrationRefundAllocation.js";
import type * as registrationSchema from "../registrationSchema.js";
import type * as registrationTransfers from "../registrationTransfers.js";
import type * as registrationWaitlist from "../registrationWaitlist.js";
import type * as registrationWebhook from "../registrationWebhook.js";
import type * as studentCertificateFiles from "../studentCertificateFiles.js";
import type * as studentCertificateSchema from "../studentCertificateSchema.js";
import type * as studentCertificates from "../studentCertificates.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  admin: typeof admin;
  aligned: typeof aligned;
  alignedSchema: typeof alignedSchema;
  alignmentMigration: typeof alignmentMigration;
  auth: typeof auth;
  certificateVerification: typeof certificateVerification;
  crons: typeof crons;
  emailPreferences: typeof emailPreferences;
  http: typeof http;
  instructorCertifications: typeof instructorCertifications;
  instructorInvitations: typeof instructorInvitations;
  mcp: typeof mcp;
  migration: typeof migration;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  products: typeof products;
  profiles: typeof profiles;
  registration: typeof registration;
  registrationAttendees: typeof registrationAttendees;
  registrationBilling: typeof registrationBilling;
  registrationBillingLedger: typeof registrationBillingLedger;
  registrationCertificates: typeof registrationCertificates;
  registrationCustomerBackfill: typeof registrationCustomerBackfill;
  registrationCustomers: typeof registrationCustomers;
  registrationDashboard: typeof registrationDashboard;
  registrationDisputes: typeof registrationDisputes;
  registrationEmailWebhook: typeof registrationEmailWebhook;
  registrationEngagement: typeof registrationEngagement;
  registrationEvidence: typeof registrationEvidence;
  registrationExternal: typeof registrationExternal;
  registrationFixtures: typeof registrationFixtures;
  registrationGroups: typeof registrationGroups;
  registrationHelpers: typeof registrationHelpers;
  registrationInvoiceActions: typeof registrationInvoiceActions;
  registrationMail: typeof registrationMail;
  registrationMaterialOrders: typeof registrationMaterialOrders;
  registrationMaterialSelection: typeof registrationMaterialSelection;
  registrationMigration: typeof registrationMigration;
  registrationOperations: typeof registrationOperations;
  registrationPayments: typeof registrationPayments;
  registrationPolicy: typeof registrationPolicy;
  registrationPortal: typeof registrationPortal;
  registrationRefundAllocation: typeof registrationRefundAllocation;
  registrationSchema: typeof registrationSchema;
  registrationTransfers: typeof registrationTransfers;
  registrationWaitlist: typeof registrationWaitlist;
  registrationWebhook: typeof registrationWebhook;
  studentCertificateFiles: typeof studentCertificateFiles;
  studentCertificateSchema: typeof studentCertificateSchema;
  studentCertificates: typeof studentCertificates;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
