"use client";

import { usePostHog } from "posthog-js/react";
import { useState } from "react";
import { sendContactEmail } from "@/app/actions/send-contact-email"; // Import the server action
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const posthog = usePostHog();
  const [status, setStatus] = useState<{
    loading: boolean;
    success: boolean | null;
    error: string | null;
  }>({
    loading: false,
    success: null,
    error: null,
  });
  const [locationChoice, setLocationChoice] = useState("Vancouver, WA");
  const [showOtherLocation, setShowOtherLocation] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ loading: true, success: null, error: null });
    const formData = new FormData(event.currentTarget);

    // Track form submission attempt
    posthog.capture("contact_form_submitted", {
      location: formData.get("location"),
      contactMethods: formData.getAll("contactMethod"),
      smsOptIn: formData.get("smsOptIn") === "on",
    });

    try {
      // --- Call the server action ---
      const result = await sendContactEmail(formData);
      // --------------------------------

      if (result.success) {
        setStatus({ loading: false, success: true, error: null });

        // Track successful submission
        posthog.capture("contact_form_success", {
          location: formData.get("location"),
          contactMethods: formData.getAll("contactMethod"),
          smsOptIn: formData.get("smsOptIn") === "on",
        });

        // Track with visitors.now
        if (typeof window !== "undefined" && "visitors" in window) {
          (
            window as {
              visitors: {
                track: (
                  event: string,
                  props?: Record<string, string | number>
                ) => void;
              };
            }
          ).visitors.track("Contact Form Submitted", {
            location: String(formData.get("location") ?? ""),
            source: "contact_page",
          });
        }

        // Optionally reset the form
        (event.target as HTMLFormElement).reset();
        setLocationChoice("Vancouver, WA");
        setShowOtherLocation(false);
      } else {
        setStatus({
          loading: false,
          success: false,
          error: result.error || "An unknown error occurred.",
        });

        // Track form submission error
        posthog.capture("contact_form_error", {
          error: result.error || "Unknown error",
          location: formData.get("location"),
        });
      }
    } catch (_error) {
      setStatus({
        loading: false,
        success: false,
        error: "An unexpected error occurred.",
      });

      // Track unexpected error
      posthog.capture("contact_form_error", {
        error: "Unexpected error",
        location: formData.get("location"),
      });
    }
  };

  const handleLocationChange = (value: string) => {
    setLocationChoice(value);
    setShowOtherLocation(value === "Other");
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Status Messages - Moved to top */}
      {status.success === true && (
        <p className="mb-4 rounded border border-green-200 bg-green-100 p-3 text-center text-green-800">
          Message sent successfully! We&apos;ll be in touch soon.
        </p>
      )}
      {status.success === false && status.error && (
        <p className="mb-4 rounded border border-red-200 bg-red-100 p-3 text-center text-red-800">
          Error: {status.error}
        </p>
      )}
      {status.loading && (
        <p className="mb-4 rounded border border-blue-200 bg-blue-100 p-3 text-center text-blue-800">
          Sending message...
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">
            First Name <span className="text-red-500">*</span>
          </Label>
          <Input
            disabled={status.loading}
            id="firstName"
            name="firstName"
            required
            type="text"
          />
        </div>
        <div>
          <Label htmlFor="lastName">
            Last Name <span className="text-red-500">*</span>
          </Label>
          <Input
            disabled={status.loading}
            id="lastName"
            name="lastName"
            required
            type="text"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          disabled={status.loading}
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input disabled={status.loading} id="phone" name="phone" type="tel" />
      </div>

      <div>
        <Label>Approximate location (we are willing to travel!)</Label>
        <RadioGroup
          className="mt-2"
          disabled={status.loading} // Controlled component
          name="location"
          onValueChange={handleLocationChange}
          value={locationChoice}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem id="loc-van" value="Vancouver, WA" />
            <Label className="font-normal" htmlFor="loc-van">
              Vancouver, WA
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem id="loc-slo" value="San Luis Obispo, CA" />
            <Label className="font-normal" htmlFor="loc-slo">
              San Luis Obispo, CA
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem id="loc-other" value="Other" />
            <Label className="font-normal" htmlFor="loc-other">
              Other
            </Label>
          </div>
        </RadioGroup>
      </div>

      {showOtherLocation && (
        <div>
          <Label htmlFor="otherLocation">Other location:</Label>
          <Input
            disabled={status.loading}
            id="otherLocation"
            name="otherLocation"
            required={locationChoice === "Other"}
            type="text"
          />
        </div>
      )}

      <div>
        <Label htmlFor="message">
          Comment or Message <span className="text-red-500">*</span>
        </Label>
        <Textarea
          disabled={status.loading}
          id="message"
          name="message"
          required
          rows={5}
        />
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox disabled={status.loading} id="smsOptIn" name="smsOptIn" />
        <div className="grid gap-1.5 leading-none">
          <Label className="font-normal text-sm" htmlFor="smsOptIn">
            Yes, I agree to receive text messages from Taylored Instruction sent
            from 360-685-8199.
          </Label>
          <p className="text-muted-foreground text-xs">
            Message frequency varies and may include appointment reminders,
            course information, or promotional messages. Message and data rates
            may apply. Reply STOP at any time to unsubscribe or HELP for
            assistance. Contact support at 360-685-8199. See our{" "}
            <a className="text-blue-500" href="/privacy-policy">
              Privacy Policy
            </a>{" "}
            for details on how we handle your information.
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-start space-x-2">
        <Checkbox disabled={status.loading} id="smsOptOut" name="smsOptOut" />
        <div className="grid gap-1.5 leading-none">
          <Label className="font-normal text-sm" htmlFor="smsOptOut">
            No, I do not want to receive text messages from Taylored
            Instruction.
          </Label>
        </div>
      </div>

      <div>
        <Label>
          How should we reach out to you?{" "}
          <span className="text-red-500">*</span>
        </Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              disabled={status.loading}
              id="contact-email"
              name="contactMethod"
              value="Email"
            />
            <Label className="font-normal" htmlFor="contact-email">
              Email
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              disabled={status.loading}
              id="contact-phone"
              name="contactMethod"
              value="Phone call"
            />
            <Label className="font-normal" htmlFor="contact-phone">
              Phone call
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              disabled={status.loading}
              id="contact-sms"
              name="contactMethod"
              value="SMS message"
            />
            <Label className="font-normal" htmlFor="contact-sms">
              SMS message (requires opt-in above)
            </Label>
          </div>
        </div>
        {/* Validation message if needed */}
        {status.error?.includes("contact method") && (
          <p className="mt-1 text-red-600 text-sm">
            Please select at least one contact method.
          </p>
        )}
      </div>

      <div>
        <Button
          className="w-full"
          disabled={status.loading}
          size="lg"
          type="submit"
          variant="primary"
        >
          {status.loading ? (
            <>
              <svg
                aria-label="Loading"
                className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                fill="none"
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  fill="currentColor"
                />
              </svg>
              Sending...
            </>
          ) : (
            "Send Message"
          )}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        By providing a telephone number and submitting this form you are
        consenting to be contacted by SMS text message. Message &amp; data rates
        may apply. You can reply STOP to opt-out of further messaging.
      </p>
    </form>
  );
}
