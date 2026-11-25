import Link from "next/link";
import type { ReactNode } from "react";
import { ClassPageSection } from "@/components/ClassPageLayout";
import type { FAQItem } from "@/lib/faqSchema";
import type { Comparison } from "@/lib/service-comparisons";

export type QuickFact = {
  label: string;
  value: ReactNode;
};

const linkClassName = "font-medium text-primary hover:underline";

export const CERTIFICATION_FACTS: QuickFact[] = [
  { label: "Card valid for", value: "2 years" },
  { label: "When you get your card", value: "Same day, as an eCard" },
  {
    label: "Class size",
    value: "Small, so everyone gets hands-on practice time",
  },
  {
    label: "Dates, times and prices",
    value: (
      <Link className={linkClassName} href="/classes">
        See the live class schedule
      </Link>
    ),
  },
];

export function QuickFacts({ facts }: { facts: QuickFact[] }) {
  return (
    <section
      aria-labelledby="quick-facts"
      className="rounded-lg border border-slate-200 bg-slate-50 p-6 md:p-8"
    >
      <h2 className="mb-5 font-bold text-2xl text-slate-950" id="quick-facts">
        Quick facts
      </h2>
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="font-semibold text-slate-500 text-sm uppercase tracking-wide">
              {fact.label}
            </dt>
            <dd className="mt-1 text-slate-900 leading-relaxed">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function FaqSection({ faqs }: { faqs: FAQItem[] }) {
  return (
    <ClassPageSection title="Frequently asked questions">
      <div className="space-y-6">
        {faqs.map((faq) => (
          <div key={faq.question}>
            <h3 className="mb-2 font-semibold text-lg text-slate-950">
              {faq.question}
            </h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </div>
    </ClassPageSection>
  );
}

export function ComparisonTable({ comparison }: { comparison: Comparison }) {
  return (
    <ClassPageSection title={comparison.title}>
      <p>{comparison.intro}</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">{comparison.title}</caption>
          <thead className="bg-slate-50">
            <tr>
              <td className="border-slate-200 border-b p-3" />
              {comparison.columns.map((column) => (
                <th
                  className="border-slate-200 border-b p-3 font-semibold text-slate-950"
                  key={column.key}
                  scope="col"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr
                className="border-slate-200 border-b last:border-b-0"
                key={row.label}
              >
                <th
                  className="w-1/4 p-3 align-top font-semibold text-slate-950"
                  scope="row"
                >
                  {row.label}
                </th>
                {comparison.columns.map((column) => (
                  <td className="p-3 align-top" key={column.key}>
                    {row.values[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        More detail:{" "}
        <Link className={linkClassName} href={comparison.readMore.href}>
          {comparison.readMore.label}
        </Link>
        .
      </p>
    </ClassPageSection>
  );
}
