import { Fragment } from "react";
import type { CancellationPolicy } from "@/shared/cancellation-policy";
import { SUPPORT_EMAIL } from "@/shared/email";

const INLINE = /(\*\*.+?\*\*|info@tayloredinstruction\.com)/u;

function PolicyText({ text }: { text: string }) {
  return text.split(INLINE).map((part, index) => {
    const key = `${index}:${part}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part === SUPPORT_EMAIL) {
      return (
        <a
          className="text-primary hover:underline"
          href={`mailto:${SUPPORT_EMAIL}`}
          key={key}
        >
          {part}
        </a>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/** The full policy text of one version, as published. */
export function CancellationPolicyDocument({
  policy,
}: {
  policy: CancellationPolicy;
}) {
  return (
    <div className="space-y-4">
      {policy.blocks.map((block, index) => {
        const key = `${policy.version}:${index}`;
        if (block.kind === "heading") {
          return (
            <h3
              className="mt-6 font-semibold text-lg text-slate-900 first:mt-0"
              key={key}
            >
              {block.text}
            </h3>
          );
        }
        if (block.kind === "list") {
          return (
            <ul className="list-inside list-disc space-y-1" key={key}>
              {block.items.map((item) => (
                <li key={item}>
                  <PolicyText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={key}>
            <PolicyText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
