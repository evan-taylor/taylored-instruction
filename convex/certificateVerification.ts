"use node";
import { getServiceToken } from "convex/server";
import { type Infer, v } from "convex/values";
import {
  fitForJev,
  JEV_MAX_SIDE,
  VERIFICATION_CHECKS,
  verificationConfig,
} from "../shared/registration/certificate-verification";
import type { certificateVerification } from "../shared/registration/validators";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const DECISIONS_URL = "https://ai-gateway.convex.dev/alpha/decisions";
const REQUEST_TIMEOUT_MS = 60_000;
const RETRY_DELAYS_MS = [30_000, 120_000];

type VerificationError = NonNullable<
  Infer<typeof certificateVerification>["error"]
>;
type Outcome =
  | { answers: { check: string; probability: number }[]; model?: string }
  | { error: VerificationError; transient?: boolean };

async function firstPage(bytes: Uint8Array) {
  const { getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { width, height } = (await pdf.getPage(1)).getViewport({ scale: 1 });
  return await renderPageAsImage(pdf, 1, {
    canvasImport: () => import("@napi-rs/canvas"),
    scale: Math.min(JEV_MAX_SIDE / width, JEV_MAX_SIDE / height),
  });
}

/** Page one of a PDF, or the photo itself, as a JPEG within Jev's size limits. */
async function certificateImage(bytes: Uint8Array, type: string) {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(
    Buffer.from(type === "application/pdf" ? await firstPage(bytes) : bytes)
  );
  const fit = fitForJev(image.width, image.height);
  const canvas = createCanvas(fit.canvasWidth, fit.canvasHeight);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, fit.canvasWidth, fit.canvasHeight);
  context.drawImage(
    image,
    Math.floor((fit.canvasWidth - fit.drawWidth) / 2),
    Math.floor((fit.canvasHeight - fit.drawHeight) / 2),
    fit.drawWidth,
    fit.drawHeight
  );
  return canvas.toBuffer("image/jpeg", 90).toString("base64");
}

function answersFrom(body: unknown) {
  const response = (body ?? {}) as {
    model?: unknown;
    answers?: Record<string, { type?: unknown; noul?: unknown }>;
  };
  const answers = VERIFICATION_CHECKS.flatMap((check) => {
    const probability = response.answers?.[check.id]?.noul;
    return typeof probability === "number" &&
      probability >= 0 &&
      probability <= 1
      ? [{ check: check.id, probability }]
      : [];
  });
  return {
    answers,
    model: typeof response.model === "string" ? response.model : undefined,
  };
}

async function askJev(
  model: string,
  state: Record<string, string>,
  image: string
): Promise<Outcome> {
  let token: string;
  try {
    token = await getServiceToken("ai-gateway");
  } catch {
    return { error: "gateway_unavailable" };
  }
  let response: Response;
  try {
    response = await fetch(DECISIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "TypeSafe-Danger-Zone-Images": "true",
      },
      body: JSON.stringify({
        model,
        state: [
          {
            ...state,
            certificate: "The completion certificate image that follows.",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${image}` },
          },
        ],
        questions: Object.fromEntries(
          VERIFICATION_CHECKS.map((check) => [
            check.id,
            { type: "noul", instructions: check.instructions },
          ])
        ),
        provider: { zdr: true, data_collection: "deny" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return { error: timedOut ? "timeout" : "gateway_error", transient: true };
  }
  if (response.status === 401 || response.status === 403) {
    return { error: "gateway_unavailable" };
  }
  if (!response.ok) {
    return {
      error: "gateway_error",
      transient: response.status === 429 || response.status >= 500,
    };
  }
  const parsed = answersFrom(await response.json().catch(() => null));
  return parsed.answers.length === VERIFICATION_CHECKS.length
    ? parsed
    : { error: "invalid_response" };
}

/**
 * Asks Jev, through the Convex AI Gateway, whether an attendee's upload is a
 * genuine, matching, recent, readable completion certificate. Anything other
 * than a confident yes to every check is left for staff to review.
 */
export const verify = internalAction({
  args: { fileId: v.id("registrationSessionFiles"), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { fileId, attempt }) => {
    const input = await ctx.runQuery(
      internal.registrationCertificates.verificationInput,
      { fileId }
    );
    if (!input) {
      return null;
    }
    const { model, threshold } = verificationConfig({
      JEV_MODEL: process.env.JEV_MODEL,
      JEV_CONFIDENCE_THRESHOLD: process.env.JEV_CONFIDENCE_THRESHOLD,
    });
    let outcome: Outcome;
    let image: string | undefined;
    try {
      const blob = await ctx.storage.get(input.storageId);
      image = blob
        ? await certificateImage(
            new Uint8Array(await blob.arrayBuffer()),
            input.type
          )
        : undefined;
    } catch {
      image = undefined;
    }
    if (image) {
      outcome = await askJev(
        model,
        {
          expected_course: input.expectedCourse,
          attendee_name: input.attendeeName,
          today: input.today,
          earliest_completion_date: input.earliestCompletionDate,
        },
        image
      );
    } else {
      outcome = { error: "unsupported_file" };
    }
    const delay = RETRY_DELAYS_MS[attempt - 1];
    if ("error" in outcome && outcome.transient && delay !== undefined) {
      await ctx.scheduler.runAfter(
        delay,
        internal.certificateVerification.verify,
        { fileId, attempt: attempt + 1 }
      );
      return null;
    }
    await ctx.runMutation(
      internal.registrationCertificates.recordVerification,
      {
        fileId,
        threshold,
        checkedFrom: input.earliestCompletionDate,
        ...("error" in outcome ? { error: outcome.error } : outcome),
      }
    );
    return null;
  },
});
