/** Automated review of an attendee's pre-class completion certificate. */

export const DEFAULT_JEV_MODEL = "typesafe/jev-1.14";
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;
/** Completion must fall within this many days before the class starts. */
export const CERTIFICATE_MAX_AGE_DAYS = 90;
/** Jev rejects images outside 280-1568 px per side. */
export const JEV_MIN_SIDE = 280;
export const JEV_MAX_SIDE = 1568;

const INSTRUCTION_SUFFIX =
  /\s*[-–—:]\s*(?:please\s+)?(?:upload|submit|attach|send)\b.*$|\s*(?:[-–—:]\s*)?(?:completion\s+)?certificate(?:\s+(?:upload|required))?\s*$/iu;

/**
 * The course a certificate should name, without the instruction to the
 * attendee that requirement titles often carry ("— upload completion
 * certificate").
 */
export function certificateCourseName(title: string) {
  return title.replace(INSTRUCTION_SUFFIX, "").trim() || title.trim();
}

export const VERIFICATION_CHECKS = [
  {
    id: "genuine",
    label: "Genuine completion certificate",
    instructions:
      "`certificate` is a course completion certificate or completion record issued by a training provider, not an unrelated photo, receipt, or screenshot of something else.",
  },
  {
    id: "course",
    label: "Matches the expected course",
    instructions:
      "`certificate` is for `expected_course`, the online portion of `course`, or for `course` itself.",
    criteria: {
      true: 'Names `expected_course` or `course`, an abbreviation of either, or the provider\'s own name for the online portion of the same course, such as "Lifeguarding Online Session", "Lifeguarding online session r.24", "Blended Learning Online Content", or "HeartCode BLS Online". Version or revision suffixes, provider prefixes, and notes about an in-person skills session still match.',
      false:
        "Names a different course or discipline, such as a CPR, First Aid, or Water Safety course when Lifeguarding is expected, or names no course at all.",
    },
  },
  {
    id: "name",
    label: "Name matches the attendee",
    instructions:
      "The person named on `certificate` is `attendee_name`, allowing nicknames, middle names or initials, and a different name order.",
  },
  {
    id: "date",
    label: "Completion date is acceptable",
    instructions:
      "`certificate` shows a completion date that is on or before `today` and on or after `earliest_completion_date`.",
  },
  {
    id: "readable",
    label: "Readable image",
    instructions:
      "`certificate` is clear enough to read the person's name, the course, and the completion date.",
  },
] as const;

export type VerificationCheckId = (typeof VERIFICATION_CHECKS)[number]["id"];

export function verificationConfig(env: {
  JEV_MODEL?: string;
  JEV_CONFIDENCE_THRESHOLD?: string;
}) {
  const threshold = Number(env.JEV_CONFIDENCE_THRESHOLD);
  return {
    model: env.JEV_MODEL?.trim() || DEFAULT_JEV_MODEL,
    threshold:
      threshold >= 0.5 && threshold <= 1
        ? threshold
        : DEFAULT_CONFIDENCE_THRESHOLD,
  };
}

/** Passes only when every check is true with at least the threshold probability. */
export function decide(
  answers: { check: string; probability: number }[],
  threshold: number
) {
  return VERIFICATION_CHECKS.every((check) => {
    const probability = answers.find(
      (answer) => answer.check === check.id
    )?.probability;
    return probability !== undefined && probability >= threshold;
  });
}

export function checkVerdict(
  probability: number,
  threshold: number
): "passed" | "uncertain" | "failed" {
  if (probability >= threshold) {
    return "passed";
  }
  return probability < 0.5 ? "failed" : "uncertain";
}

/**
 * Scales an image to fit Jev's per-side limits. A side still under the
 * minimum after scaling is padded onto a larger canvas instead.
 */
export function fitForJev(width: number, height: number) {
  const scale = Math.min(
    JEV_MAX_SIDE / width,
    JEV_MAX_SIDE / height,
    Math.max(1, JEV_MIN_SIDE / Math.min(width, height))
  );
  const drawWidth = Math.max(1, Math.round(width * scale));
  const drawHeight = Math.max(1, Math.round(height * scale));
  return {
    drawWidth,
    drawHeight,
    canvasWidth: Math.max(drawWidth, JEV_MIN_SIDE),
    canvasHeight: Math.max(drawHeight, JEV_MIN_SIDE),
  };
}
