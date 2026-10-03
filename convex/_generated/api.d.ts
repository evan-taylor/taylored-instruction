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
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as migration from "../migration.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as products from "../products.js";
import type * as profiles from "../profiles.js";
import type * as registration from "../registration.js";
import type * as registrationExternal from "../registrationExternal.js";
import type * as registrationFixtures from "../registrationFixtures.js";
import type * as registrationHelpers from "../registrationHelpers.js";
import type * as registrationMail from "../registrationMail.js";
import type * as registrationOperations from "../registrationOperations.js";
import type * as registrationPayments from "../registrationPayments.js";
import type * as registrationPortal from "../registrationPortal.js";
import type * as registrationRefundAllocation from "../registrationRefundAllocation.js";
import type * as registrationSchema from "../registrationSchema.js";
import type * as registrationTransfers from "../registrationTransfers.js";
import type * as registrationWaitlist from "../registrationWaitlist.js";
import type * as registrationWebhook from "../registrationWebhook.js";
import type * as seoContent from "../seoContent.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  admin: typeof admin;
  analytics: typeof analytics;
  auth: typeof auth;
  crons: typeof crons;
  http: typeof http;
  migration: typeof migration;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  products: typeof products;
  profiles: typeof profiles;
  registration: typeof registration;
  registrationExternal: typeof registrationExternal;
  registrationFixtures: typeof registrationFixtures;
  registrationHelpers: typeof registrationHelpers;
  registrationMail: typeof registrationMail;
  registrationOperations: typeof registrationOperations;
  registrationPayments: typeof registrationPayments;
  registrationPortal: typeof registrationPortal;
  registrationRefundAllocation: typeof registrationRefundAllocation;
  registrationSchema: typeof registrationSchema;
  registrationTransfers: typeof registrationTransfers;
  registrationWaitlist: typeof registrationWaitlist;
  registrationWebhook: typeof registrationWebhook;
  seoContent: typeof seoContent;
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
