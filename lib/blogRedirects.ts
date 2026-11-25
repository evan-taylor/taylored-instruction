export const blogRedirects = {
  "/expired-cpr-certification-renewal":
    "/what-to-do-when-cpr-certification-expires",
  "/cpr-certification-expired-what-to-do":
    "/what-to-do-when-cpr-certification-expires",
  "/how-to-maintain-cpr-certification": "/how-long-does-cpr-certification-last",
  "/first-aid-certification-for-teachers": "/first-aid-training-for-teachers",
  "/american-heart-association-certification-vs-red-cross":
    "/red-cross-vs-aha-certification",
  "/american-red-cross-vs-american-heart-association-cpr":
    "/red-cross-vs-aha-certification",
  "/difference-between-bls-and-cpr-certification":
    "/difference-between-cpr-and-bls",
  "/healthcare-provider-cpr-renewal": "/bls-recertification-requirements",
  "/best-cpr-certification-for-healthcare-workers":
    "/bls-certification-for-healthcare-providers",
  "/best-cpr-training-for-healthcare-workers":
    "/bls-certification-for-healthcare-providers",
  "/how-much-does-bls-certification-cost":
    "/basic-life-support-certification-cost",
  "/cpr-certification-for-nurses": "/cpr-certification-requirements-for-nurses",
  "/cpr-certification-for-daycare-providers":
    "/cpr-certification-for-childcare-providers",
  "/cpr-training-for-dental-office": "/cpr-certification-for-dental-office",
  "/cpr-training-for-dental-assistants": "/cpr-certification-for-dental-office",
  "/cpr-training-for-fitness-trainers":
    "/cpr-certification-for-personal-trainers",
  "/cpr-training-for-fitness-instructors":
    "/cpr-certification-for-personal-trainers",
  "/how-to-respond-to-choking-emergency": "/choking-emergency-response-steps",
  "/aed-maintenance-and-training": "/aed-maintenance-and-inspection",
  "/cpr-instructor-training-program": "/how-to-become-cpr-instructor",
  "/lifeguard-certification": "/lifeguard-certification-requirements",
  "/lifeguard-training-classes-near-me": "/lifeguard-training-near-me",
  "/water-safety-instructor-course": "/water-safety-instructor-certification",
  "/osha-first-aid-requirements": "/osha-first-aid-training-requirements",
  "/osha-first-aid-training-compliance":
    "/osha-first-aid-training-requirements",
  "/workplace-first-aid-compliance": "/osha-first-aid-training-requirements",
  "/first-aid-kit-checklist-for-workplace":
    "/workplace-first-aid-kit-requirements",
  "/what-to-include-in-workplace-first-aid-kit":
    "/workplace-first-aid-kit-requirements",
  "/onsite-cpr-training-for-companies": "/group-cpr-training-for-companies",
  "/onsite-cpr-training-for-businesses": "/group-cpr-training-for-companies",
  "/onsite-cpr-training-for-staff": "/group-cpr-training-for-companies",
  "/corporate-safety-training-programs": "/corporate-safety-training-solutions",
  "/employee-safety-training-programs": "/corporate-safety-training-solutions",
  "/workplace-safety-compliance-training":
    "/workplace-safety-training-requirements",
  "/workplace-compliance-safety-training":
    "/workplace-safety-training-requirements",
  "/workplace-accident-no-one-knew-cpr": "/what-happens-if-no-one-knows-cpr",
  "/liability-without-safety-certified-staff":
    "/liability-without-cpr-trained-staff",
  "/emergency-preparedness-training-for-business":
    "/emergency-response-training-for-employees",
  "/employee-needs-emergency-training":
    "/emergency-response-training-for-employees",
  "/cpr-certification-same-day": "/how-to-get-cpr-certified-quickly",
  "/best-cpr-certification-program": "/how-to-choose-cpr-training-provider",
  "/cpr-certification-near-me": "/how-to-choose-cpr-training-provider",
} as const satisfies Record<string, string>;

const redirectTargets: Record<string, string> = blogRedirects;

export const getBlogRedirectTarget = (canonicalPath: string) =>
  Object.hasOwn(redirectTargets, canonicalPath)
    ? redirectTargets[canonicalPath]
    : undefined;
