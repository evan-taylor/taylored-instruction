"use node";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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

/** Share of a mostly white page that must carry ink before Jev sees it. */
const MIN_PAGE_INK = 0.002;
/** Share of the PDF's text boxes that must carry ink once rendered. */
const MIN_TEXT_INK = 0.02;
const MAX_TEXT_CHARS = 4000;
const WHITESPACE = /\s+/gu;

type Box = { left: number; top: number; right: number; bottom: number };

/**
 * pdf.js draws non-embedded standard fonts (Helvetica, Times, Courier) from
 * this font data. Without it, those fonts fall back to system fonts the
 * Convex runtime doesn't have, and every line of text renders blank. Convex
 * installs an external package only when the bundle imports it, so the
 * manifest is imported before its directory is resolved.
 */
async function standardFontDataUrl() {
  await import("pdfjs-dist/package.json", { with: { type: "json" } });
  const require = createRequire(import.meta.url);
  return join(
    dirname(require.resolve("pdfjs-dist/package.json")),
    "standard_fonts/"
  );
}

/** Page one rendered within Jev's size limits, with its text and where it sits. */
async function firstPage(bytes: Uint8Array) {
  const { getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes, {
    standardFontDataUrl: await standardFontDataUrl(),
  });
  const page = await pdf.getPage(1);
  const unit = page.getViewport({ scale: 1 });
  const scale = Math.min(JEV_MAX_SIDE / unit.width, JEV_MAX_SIDE / unit.height);
  const viewport = page.getViewport({ scale });
  const items = (await page.getTextContent()).items.flatMap((item) =>
    "str" in item && item.str.trim() ? [item] : []
  );
  const boxes = items.map(({ transform, width, height }) => {
    const [x, y] = [transform[4] ?? 0, transform[5] ?? 0];
    const size = height || Math.hypot(transform[2] ?? 0, transform[3] ?? 0);
    const [ax, ay] = viewport.convertToViewportPoint(x, y);
    const [bx, by] = viewport.convertToViewportPoint(x + width, y + size);
    return {
      left: Math.min(ax, bx),
      top: Math.min(ay, by),
      right: Math.max(ax, bx),
      bottom: Math.max(ay, by),
    };
  });
  return {
    png: await renderPageAsImage(pdf, 1, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale,
    }),
    text: items
      .map((item) => item.str)
      .join(" ")
      .replace(WHITESPACE, " ")
      .trim()
      .slice(0, MAX_TEXT_CHARS),
    boxes,
  };
}

/** Share of pixels in the given boxes, or the whole image, that aren't near-white. */
function inkRatio(
  {
    data,
    width,
    height,
  }: { data: Uint8ClampedArray; width: number; height: number },
  boxes: Box[] = [{ left: 0, top: 0, right: width, bottom: height }]
) {
  let inked = 0;
  let total = 0;
  for (const box of boxes) {
    const right = Math.min(width, Math.ceil(box.right));
    const bottom = Math.min(height, Math.ceil(box.bottom));
    for (let y = Math.max(0, Math.floor(box.top)); y < bottom; y += 1) {
      for (let x = Math.max(0, Math.floor(box.left)); x < right; x += 1) {
        const i = (y * width + x) * 4;
        total += 1;
        if (
          Math.min(data[i] ?? 255, data[i + 1] ?? 255, data[i + 2] ?? 255) < 200
        ) {
          inked += 1;
        }
      }
    }
  }
  return total ? inked / total : 0;
}

/**
 * Page one of a PDF, or the photo itself (already turned upright from its
 * EXIF orientation by the decoder), as a JPEG within Jev's size limits. A
 * render with no visible content, or a PDF whose text didn't draw, is refused
 * so staff review it instead of Jev judging a blank page.
 */
async function certificateImage(bytes: Uint8Array, type: string) {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const page = type === "application/pdf" ? await firstPage(bytes) : undefined;
  const image = await loadImage(Buffer.from(page ? page.png : bytes));
  const rendered = createCanvas(image.width, image.height);
  const draw = rendered.getContext("2d");
  draw.fillStyle = "#ffffff";
  draw.fillRect(0, 0, image.width, image.height);
  draw.drawImage(image, 0, 0);
  const pixels = draw.getImageData(0, 0, image.width, image.height);
  if (
    inkRatio(pixels) < MIN_PAGE_INK ||
    (page?.boxes.length && inkRatio(pixels, page.boxes) < MIN_TEXT_INK)
  ) {
    return { error: "render_failed" as const };
  }
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
  return {
    image: canvas.toBuffer("image/jpeg", 90).toString("base64"),
    text: page?.text,
  };
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
            certificate: state.certificate_text
              ? "The completion certificate image that follows. `certificate_text` is the text embedded in the same PDF."
              : "The completion certificate image that follows.",
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
    let rendered: Awaited<ReturnType<typeof certificateImage>> | undefined;
    try {
      const blob = await ctx.storage.get(input.storageId);
      rendered = blob
        ? await certificateImage(
            new Uint8Array(await blob.arrayBuffer()),
            input.type
          )
        : undefined;
    } catch {
      rendered = undefined;
    }
    let outcome: Outcome;
    if (!rendered) {
      outcome = { error: "unsupported_file" };
    } else if (rendered.error) {
      outcome = { error: rendered.error };
    } else {
      outcome = await askJev(
        model,
        {
          expected_course: input.expectedCourse,
          attendee_name: input.attendeeName,
          today: input.today,
          earliest_completion_date: input.earliestCompletionDate,
          ...(rendered.text ? { certificate_text: rendered.text } : {}),
        },
        rendered.image
      );
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
