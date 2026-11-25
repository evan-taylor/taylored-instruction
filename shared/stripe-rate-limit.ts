import type Stripe from "stripe";

type HttpClient = NonNullable<Stripe.StripeConfig["httpClient"]>;
type HttpResponse = Awaited<ReturnType<HttpClient["makeRequest"]>>;

type Options = {
  /** Retries after the first 429 before the response is handed back to the SDK. */
  retries: number;
  baseMs: number;
  maxMs: number;
  /** Minimum gap between Customer Search requests, which Stripe rate limits far below the rest of the API. */
  searchIntervalMs: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

const SEARCH_PATH = /^\/v1\/[a-z_]+\/search/;

function retryAfterMs(response: HttpResponse) {
  const header = response.getHeaders()["retry-after"];
  const seconds = Number(Array.isArray(header) ? header[0] : header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

/**
 * Wraps a Stripe HTTP client so bulk jobs stay under Stripe's rate limits:
 * Search requests are spaced at least `searchIntervalMs` apart, and a 429 is
 * retried with exponential backoff and full jitter, or after Retry-After when
 * Stripe sends one. Retries resend the same headers, including the SDK's
 * idempotency key. Once the retries are used up the 429 goes back to the SDK,
 * which throws `StripeRateLimitError`.
 */
export function rateLimitedHttpClient(
  inner: HttpClient,
  options: Options
): HttpClient {
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  let nextSearch = 0;

  const send = async (
    args: Parameters<HttpClient["makeRequest"]>,
    attempt: number
  ): Promise<HttpResponse> => {
    const response = await inner.makeRequest(...args);
    if (response.getStatusCode() !== 429 || attempt >= options.retries) {
      return response;
    }
    await response.toJSON().catch(() => null);
    const backoff = Math.min(options.maxMs, options.baseMs * 2 ** attempt);
    await sleep(
      Math.min(options.maxMs, retryAfterMs(response) ?? random() * backoff)
    );
    return await send(args, attempt + 1);
  };

  return {
    getClientName: () => inner.getClientName(),
    makeRequest: async (...args: Parameters<HttpClient["makeRequest"]>) => {
      if (SEARCH_PATH.test(args[2])) {
        const now = Date.now();
        const wait = Math.max(0, nextSearch - now);
        nextSearch = Math.max(now, nextSearch) + options.searchIntervalMs;
        if (wait) {
          await sleep(wait);
        }
      }
      return await send(args, 0);
    },
  };
}
