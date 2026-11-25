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
    "Rescheduling 7 or more days before the class is free. Less than 7 days before, a $20 administrative fee applies.",
    "If we cancel or reschedule your class, you choose a full refund or a free reschedule.",
    "Course materials are non-refundable once issued.",
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
        "A rescheduled registration must be used within **12 months** of the original class date, after which it expires. Each reschedule follows the same 7-day and $20 rule.",
      ],
    },
    { kind: "heading", text: "Substitutions" },
    {
      kind: "paragraph",
      text: "You may transfer your registration to another person at no charge up to **48 hours** before the scheduled start time. The substitute must meet the course prerequisites and provide their details for certification. Course materials already issued to the original registrant may not transfer.",
    },
    { kind: "heading", text: "If we cancel or reschedule a class" },
    {
      kind: "paragraph",
      text: "If Taylored Instruction cancels or reschedules a class for any reason, such as instructor illness, weather, facility closure, or low enrollment, you may choose either a free reschedule or a full refund, including any fees and course materials, with no administrative fee. Refunds are returned to the original payment method.",
    },
    { kind: "heading", text: "Refund exceptions" },
    {
      kind: "paragraph",
      text: "A refund is available only if we have no class of the same course type scheduled within **90 days** of your original class date. In that case, the refund is issued minus a $20 administrative fee and the cost of any course materials already issued.",
    },
    { kind: "heading", text: "Course materials" },
    {
      kind: "paragraph",
      text: "Digital course access (eLearning or online course codes, eCards, and certifying agency online access) and physical materials are non-refundable once issued or delivered. Any refund, including the exceptions above, deducts the cost of materials already issued, except a refund when we cancel a class, which is always in full.",
    },
    { kind: "heading", text: "No-shows" },
    {
      kind: "paragraph",
      text: "If you miss your class without notice, your registration is forfeited. If you contact us within 7 days after the class date, you may reschedule once for a $20 administrative fee.",
    },
    { kind: "heading", text: "Late arrivals" },
    {
      kind: "paragraph",
      text: "All of our courses begin on time and promptly. If you arrive more than 10 minutes late to your course, you will have already missed content, and may not be eligible to participate. In such a case, you may reschedule your registration for a fee of $20.",
    },
    { kind: "heading", text: "Certification requirements" },
    {
      kind: "paragraph",
      text: "Not meeting the certification requirements, including the skills test, written exam, or attendance, is not grounds for a refund. Where the certifying agency's rules allow, you may retest once within 30 days at no charge. Otherwise, you may register for another class.",
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
