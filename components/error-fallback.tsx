"use client";
import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** Styled boundary for route segments; keeps the header and footer in place. */
export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <p className="m-0 font-medium text-primary text-xs uppercase tracking-wide">
        Something went wrong
      </p>
      <h1 className="m-0 mt-2 font-bold text-2xl text-slate-900 lg:text-3xl">
        This page didn’t load
      </h1>
      <p className="m-0 mt-3 text-slate-600">
        The problem has been reported. Try again, or contact us if it keeps
        happening.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset} type="button">
          Try again
        </Button>
        <Button href="/contact" variant="secondary">
          Contact us
        </Button>
      </div>
    </div>
  );
}
