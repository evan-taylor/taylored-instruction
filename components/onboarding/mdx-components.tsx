"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LoomVideoProps = {
  url?: string;
  videoId?: string;
  title?: string;
};

const buildLoomEmbedUrl = (props: LoomVideoProps): string | null => {
  if (props.url) {
    if (props.url.includes("/share/")) {
      return props.url.replace("/share/", "/embed/");
    }
    if (props.url.includes("/embed/")) {
      return props.url;
    }
    return `${props.url}/embed`;
  }

  if (props.videoId) {
    return `https://www.loom.com/embed/${props.videoId}`;
  }

  return null;
};

const LoomVideo = ({ url, videoId, title }: LoomVideoProps) => {
  const embedUrl = buildLoomEmbedUrl({ url, videoId });

  if (!embedUrl) {
    return (
      <p
        className="rounded border border-red-300 border-dashed bg-red-50 px-4 py-3 text-red-700 text-sm"
        role="alert"
      >
        LoomVideo requires either a `url` or `videoId` prop.
      </p>
    );
  }

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <iframe
        allow="autoplay; fullscreen"
        allowFullScreen
        className="aspect-video w-full"
        loading="lazy"
        src={embedUrl}
        title={title ?? "Loom video"}
      />
    </div>
  );
};

type TypeformEmbedProps = {
  url?: string;
  formId?: string;
  title?: string;
  height?: number;
};

const buildTypeformUrl = (props: TypeformEmbedProps): string | null => {
  if (props.url) {
    return props.url;
  }

  if (props.formId) {
    return `https://form.typeform.com/to/${props.formId}`;
  }

  return null;
};

const TypeformEmbed = ({
  url,
  formId,
  title,
  height = 600,
}: TypeformEmbedProps) => {
  const embedUrl = buildTypeformUrl({ url, formId });

  if (!embedUrl) {
    return (
      <p
        className="rounded border border-red-300 border-dashed bg-red-50 px-4 py-3 text-red-700 text-sm"
        role="alert"
      >
        TypeformEmbed requires either a `url` or `formId` prop.
      </p>
    );
  }

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <iframe
        allow="camera; microphone; autoplay; encrypted-media"
        allowFullScreen
        className="w-full"
        height={height}
        loading="lazy"
        src={embedUrl}
        title={title ?? "Typeform form"}
      />
    </div>
  );
};

type CalComButtonProps = {
  href?: string;
  handle?: string;
  text?: string;
};

const buildCalUrl = (props: CalComButtonProps): string | null => {
  if (props.href) {
    return props.href;
  }

  if (props.handle) {
    return `https://cal.com/${props.handle}`;
  }

  return null;
};

const CalComButton = ({ href, handle, text }: CalComButtonProps) => {
  const bookingUrl = buildCalUrl({ href, handle });

  if (!bookingUrl) {
    return (
      <p
        className="rounded border border-red-300 border-dashed bg-red-50 px-4 py-3 text-red-700 text-sm"
        role="alert"
      >
        CalComButton requires either an `href` or `handle` prop.
      </p>
    );
  }

  return (
    <a
      className="inline-flex items-center rounded-lg bg-primary px-5 py-3 font-medium text-white transition-colors duration-200 ease-out hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      href={bookingUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      {text ?? "Book with Cal.com"}
    </a>
  );
};

type CalloutProps = {
  title?: string;
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
};

const toneClasses: Record<NonNullable<CalloutProps["tone"]>, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
};

const Callout = ({ title, children, tone = "info" }: CalloutProps) => (
  <div
    className={cn(
      "my-6 rounded-lg border px-5 py-4 text-sm leading-relaxed",
      toneClasses[tone]
    )}
  >
    {title ? <p className="font-semibold">{title}</p> : null}
    <div className="mt-2">{children}</div>
  </div>
);

export const onboardingMdxComponents = {
  LoomVideo,
  TypeformEmbed,
  CalComButton,
  Callout,
};
