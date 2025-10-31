"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function EcardSuccessContent() {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const sessionId = searchParams?.get("session_id");
    if (!sessionId) {
      setStatus("error");
      setMessage("Invalid session ID.");
      return;
    }

    // Clear the cart from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("ecardsCart");
    }

    // Call API to send eCard purchase emails
    fetch("/api/send-ecard-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage(
            "Your purchase was successful! A confirmation email has been sent to you."
          );
        } else {
          setStatus("error");
          setMessage(
            data.error ||
              "Something went wrong while sending confirmation emails."
          );
        }
      })
      .catch((_err) => {
        setStatus("error");
        setMessage("An error occurred while processing your order.");
      });
  }, [searchParams]);

  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
      {status === "loading" && (
        <p className="text-lg">Processing your order...</p>
      )}

      {status === "success" && (
        <div className="text-center">
          <h1 className="mb-4 font-bold text-3xl">
            Thank you for your purchase!
          </h1>
          <p className="mb-6 text-lg">{message}</p>
          <Link className="btn btn-primary" href="/ecards">
            Back to eCards
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="text-center">
          <h1 className="mb-4 font-bold text-3xl text-red-600">Oops!</h1>
          <p className="mb-6 text-lg">{message}</p>
          <Link className="btn btn-primary" href="/ecards">
            Back to eCards
          </Link>
        </div>
      )}
    </div>
  );
}

export default function EcardSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
          <p className="text-lg">Loading...</p>
        </div>
      }
    >
      <EcardSuccessContent />
    </Suspense>
  );
}
