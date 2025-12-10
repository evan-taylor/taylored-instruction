"use client";

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
};

export function CalComButton({
  username,
  eventType = "30min",
  buttonText = "Schedule a Call",
}: CalComButtonProps) {
  const handleClick = () => {
    const calUrl = `https://cal.com/${username}/${eventType}`;
    window.open(calUrl, "_blank", "width=600,height=700");
  };

  return (
    <button
      className="my-4 inline-flex items-center justify-center rounded bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      onClick={handleClick}
      type="button"
    >
      {buttonText}
    </button>
  );
}

export const mdxComponents = {
  LoomEmbed,
  TypeformEmbed,
  CalComButton,
};
