'use client'

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function EcardSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const session_id = searchParams?.get('session_id');
    if (!session_id) {
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
      body: JSON.stringify({ sessionId: session_id }),
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
      .catch((err) => {
        console.error("Error sending eCard emails:", err);
        setStatus("error");
        setMessage("An error occurred while processing your order.");
      });
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
      {status === "loading" && (
        <p className="text-lg">Processing your order...</p>
      )}

      {status === "success" && (
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">
            Thank you for your purchase!
          </h1>
          <p className="text-lg mb-6">{message}</p>
          <Link href="/ecards" className="btn btn-primary">
            Back to eCards
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Oops!</h1>
          <p className="text-lg mb-6">{message}</p>
          <Link href="/ecards" className="btn btn-primary">
            Back to eCards
          </Link>
        </div>
      )}
    </div>
  );
}

export default function EcardSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-lg">Loading...</p>
      </div>
    }>
      <EcardSuccessContent />
    </Suspense>
  );
}