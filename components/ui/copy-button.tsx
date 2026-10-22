"use client";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy link",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <button
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 text-xs shadow-xs transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30",
        copied && "border-emerald-300 text-emerald-700",
        className
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      type="button"
    >
      {/* Both states share one grid cell so the button never changes size. */}
      <span className="grid h-3.5 w-3.5 shrink-0 place-items-center [&>*]:[grid-area:1/1]">
        <Copy
          aria-hidden="true"
          className={cn(
            "h-3.5 w-3.5 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
            copied && "scale-50 opacity-0"
          )}
        />
        <Check
          aria-hidden="true"
          className={cn(
            "h-3.5 w-3.5 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
        />
      </span>
      <span className="grid [&>*]:[grid-area:1/1]">
        <span
          aria-hidden={copied}
          className={cn(
            "transition-opacity duration-150 motion-reduce:transition-none",
            copied && "opacity-0"
          )}
        >
          {label}
        </span>
        <span
          aria-hidden={!copied}
          className={cn(
            "text-center transition-opacity duration-150 motion-reduce:transition-none",
            copied ? "opacity-100" : "opacity-0"
          )}
        >
          Copied
        </span>
      </span>
    </button>
  );
}
