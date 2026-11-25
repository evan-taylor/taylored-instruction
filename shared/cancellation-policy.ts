/**
 * Versioned cancellation and refund policy for course registrations. The
 * /terms page, the registration checkbox, the permanent version pages, the
 * acknowledgement snapshots, emails, and invoices all render from here.
 *
 * Published versions are immutable: never edit one. To change the policy,
 * append a new version and point CURRENT_CANCELLATION_POLICY at it. Every
 * stored acknowledgement keeps the version, hash, and text it was given, and
 * tests pin each published version's hash.
 */

export type PolicyBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

export type CancellationPolicy = {
  version: string;
  publishedAt: string;
  title: string;
  /** Key refund terms shown beside the agreement checkbox. */
  keyTerms: string[];
  blocks: PolicyBlock[];
};

/** The exact label beside the checkbox; stored with each click-through. */
export const AGREEMENT_LABEL =
  "I have read and agree to the Cancellation Policy";

const VERSION_2026_11_25: CancellationPolicy = {
  version: "2026-11-25",
  publishedAt: "2026-11-25",
  title: "Cancellation and refund policy",
  keyTerms: [
    "We do not offer refunds for course registrations; you may reschedule instead.",
    "Rescheduling 7 or more days before the start date is free. Less than 7 days before, a $20 administrative fee applies.",
    "Refunds are only provided if no course of the type you registered for is forecasted within the next 3 months, minus a $20 administrative fee.",
  ],
  blocks: [
    { kind: "heading", text: "Reschedule and refund policy" },
    {
      kind: "paragraph",
      text: "At Taylored Instruction, we do not offer refunds for course registrations. Instead, we provide the flexibility to reschedule your registration. Please review the following guidelines:",
    },
    { kind: "heading", text: "Rescheduling policy" },
    {
      kind: "list",
      items: [
        "Rescheduling requests made **7 or more days** before the scheduled start date will incur no additional charges.",
        "Rescheduling requests made **less than 7 days** before the scheduled start date will incur a $20 administrative fee.",
      ],
    },
    { kind: "heading", text: "Refund exceptions" },
    {
      kind: "paragraph",
      text: "Refunds are only provided if no courses of the type you registered for are forecasted to be available within the next 3 months. In such cases, a refund will be issued minus a $20 administrative fee.",
    },
    { kind: "heading", text: "eLearning policy" },
    {
      kind: "paragraph",
      text: "Blended learning courses require completion of eLearning modules prior to the in-person session. Failure to complete the eLearning will prevent participation in the course. Refunds are not available in these cases, but we encourage you to contact us for assistance if you anticipate delays in completing the required materials.",
    },
    { kind: "heading", text: "Prerequisites" },
    {
      kind: "paragraph",
      text: "Some of our courses may have prerequisites. Please review the course description carefully when you sign up for a course. We are not able to offer a refund in the event that you are not able to complete the course due to not meeting the prerequisites. If you have any questions about the prerequisites, please contact us at info@tayloredinstruction.com.",
    },
    { kind: "heading", text: "Late arrivals" },
    {
      kind: "paragraph",
      text: "All of our courses begin on time and promptly. If you arrive more than 10 minutes late to your course, you will have already missed content, and may not be eligible to participate. In such a case, you may reschedule your registration for a fee of $20.",
    },
    {
      kind: "paragraph",
      text: "In exceptional cases, refunds or adjustments may be considered at Taylored Instruction's sole discretion. Please contact us for individual review.",
    },
  ],
};

export const CANCELLATION_POLICIES: readonly CancellationPolicy[] = [
  VERSION_2026_11_25,
];

/** The version new registrations agree to. */
export const CURRENT_CANCELLATION_POLICY = VERSION_2026_11_25;

export function cancellationPolicy(version: string) {
  return CANCELLATION_POLICIES.find((policy) => policy.version === version);
}

const BOLD = /\*\*(.+?)\*\*/gu;

export function plainPolicyText(text: string) {
  return text.replace(BOLD, "$1");
}

/** Permanent public URL of one version. */
export function cancellationPolicyUrl(origin: string, version: string) {
  return new URL(`/cancellation-policy/v/${version}`, origin).href;
}

/**
 * The exact text a purchaser is shown for a version, as stored in each
 * acknowledgement and hashed: the full policy, then the key terms shown
 * beside the checkbox.
 */
export function policySnapshot(policy: CancellationPolicy) {
  const body = policy.blocks.map((block) => {
    if (block.kind === "list") {
      return block.items.map((item) => `- ${plainPolicyText(item)}`).join("\n");
    }
    return plainPolicyText(block.text);
  });
  return [
    `Taylored Instruction LLC: ${policy.title}`,
    `Version ${policy.version}`,
    ...body,
    "Key terms shown beside the agreement checkbox:",
    policy.keyTerms.map((term) => `- ${term}`).join("\n"),
  ].join("\n\n");
}

export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

export function policyDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    dateStyle: "long",
    timeZone: "America/Los_Angeles",
  });
}
