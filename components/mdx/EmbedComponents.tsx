"use client";

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

type CapEmbedProps = {
  url: string;
};

function extractCapVideoId(url: string): string | undefined {
  if (url.includes("cap.so/embed/")) {
    return url.split("cap.so/embed/")[1]?.split("?")[0];
  }
  if (url.includes("cap.so/")) {
    return url.split("cap.so/")[1]?.split("?")[0];
  }
  return url;
}

export function CapEmbed({ url }: CapEmbedProps) {
  const videoId = extractCapVideoId(url);

  if (!videoId) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        Invalid Cap URL
      </div>
    );
  }

  return (
    <div className="relative my-4 w-full overflow-hidden rounded-lg pb-[56.25%]">
      <iframe
        allowFullScreen
        className="absolute top-0 left-0 h-full w-full"
        src={`https://cap.so/embed/${videoId}`}
        title="Cap Recording"
      />
    </div>
  );
}

type LoomEmbedProps = {
  url: string;
};

export function LoomEmbed({ url }: LoomEmbedProps) {
  const videoId = url.includes("loom.com/share/")
    ? url.split("loom.com/share/")[1]?.split("?")[0]
    : url;

  if (!videoId) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        Invalid Loom URL
      </div>
    );
  }

  return (
    <div className="my-4 aspect-video w-full overflow-hidden rounded-lg">
      <iframe
        allowFullScreen
        className="h-full w-full"
        src={`https://www.loom.com/embed/${videoId}`}
        title="Loom Video"
      />
    </div>
  );
}

type TypeformEmbedProps = {
  formId: string;
  height?: number;
};

export function TypeformEmbed({ formId, height = 500 }: TypeformEmbedProps) {
  if (!formId) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        Invalid Typeform ID
      </div>
    );
  }

  return (
    <div className="my-4 w-full overflow-hidden rounded-lg">
      <iframe
        className="w-full"
        height={height}
        src={`https://form.typeform.com/to/${formId}`}
        title="Typeform"
      />
    </div>
  );
}

type CalComButtonProps = {
  username: string;
  eventType?: string;
  buttonText?: string;
  namespace?: string;
};

export function CalComButton({
  username,
  eventType = "hovn",
  buttonText = "Schedule a Call",
  namespace = "hovn",
}: CalComButtonProps) {
  useEffect(() => {
    const initCal = async () => {
      const cal = await getCalApi({ namespace });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    };
    initCal();
  }, [namespace]);

  return (
    <button
      className="my-4 inline-flex items-center justify-center rounded bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      data-cal-config='{"layout":"month_view"}'
      data-cal-link={`${username}/${eventType}`}
      data-cal-namespace={namespace}
      type="button"
    >
      {buttonText}
    </button>
  );
}

export const mdxComponents = {
  CapEmbed,
  LoomEmbed,
  TypeformEmbed,
  CalComButton,
};
