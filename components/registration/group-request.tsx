"use client";
import { useMutation } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { ResultNotice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import { errorText } from "./errors";

const COURSES = [
  "BLS Provider",
  "Heartsaver First Aid CPR AED",
  "Heartsaver CPR AED",
  "First Aid only",
  "Lifeguarding",
  "Instructor course",
  "Other",
] as const;
const LOCATIONS = [
  "At our facility (Vancouver WA)",
  "On-site at our location",
  "Online/blended",
] as const;

const BENEFITS = [
  {
    title: "On-site or at our facility",
    text: "We bring equipment and instructors to your workplace, or host your team at our Vancouver, WA training center.",
  },
  {
    title: "Volume pricing",
    text: "Per-person rates drop as your group grows. Quotes include all required materials and certification cards.",
  },
  {
    title: "Invoice or PO billing",
    text: "Pay by invoice or purchase order with a dedicated coordinator who handles scheduling and rosters.",
  },
];

type FormState = {
  organization: string;
  contactName: string;
  email: string;
  phone: string;
  courseInterest: string;
  headcount: string;
  preferredDates: string;
  location: string;
  notes: string;
};
const EMPTY: FormState = {
  organization: "",
  contactName: "",
  email: "",
  phone: "",
  courseInterest: "",
  headcount: "",
  preferredDates: "",
  location: "",
  notes: "",
};

function Intro() {
  return (
    <section className="bg-primary text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <p className="m-0 mb-2 font-medium text-white/80 text-xs uppercase tracking-wide">
          Group training
        </p>
        <h1 className="m-0 max-w-3xl font-bold text-3xl leading-tight sm:text-4xl lg:text-5xl">
          Train your whole team, on your schedule
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-base text-white/90 sm:text-lg">
          Tell us about your group and we’ll reply within one business day with
          dates, pricing, and a plan that fits your workplace.
        </p>
      </div>
    </section>
  );
}

function Expectations() {
  return (
    <aside className="space-y-6 lg:pt-2">
      <h2 className="m-0 font-semibold text-slate-900 text-xl">
        What to expect
      </h2>
      <dl className="m-0 space-y-5">
        {BENEFITS.map(({ title, text }) => (
          <div key={title}>
            <dt className="font-semibold text-slate-900">{title}</dt>
            <dd className="m-0 mt-1 text-slate-600 text-sm">{text}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-slate-600 text-sm">
        Prefer to talk it through?{" "}
        <a
          className="font-medium text-primary underline-offset-2 hover:underline"
          href="tel:3606588199"
        >
          Call (360) 658-8199
        </a>
        .
      </p>
    </aside>
  );
}

function SuccessCard({ onReset }: { onReset: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
        </div>
        <h2 className="m-0 font-bold text-2xl text-slate-900">
          Thanks, we’ll reply within one business day
        </h2>
        <p className="m-0 text-slate-600">
          A coordinator will follow up by email with available dates and a
          quote. In the meantime, you’re welcome to browse our scheduled
          classes.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button href="/classes" size="sm" variant="secondary">
            Browse classes
          </Button>
          <Button onClick={onReset} size="sm" type="button" variant="ghost">
            Submit another request
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactFields({
  form,
  update,
}: {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Organization" required>
        {(props) => (
          <TextInput
            {...props}
            autoComplete="organization"
            onChange={(e) => update({ organization: e.target.value })}
            required
            value={form.organization}
          />
        )}
      </Field>
      <Field label="Contact name" required>
        {(props) => (
          <TextInput
            {...props}
            autoComplete="name"
            onChange={(e) => update({ contactName: e.target.value })}
            required
            value={form.contactName}
          />
        )}
      </Field>
      <Field label="Email" required>
        {(props) => (
          <TextInput
            {...props}
            autoComplete="email"
            onChange={(e) => update({ email: e.target.value })}
            required
            type="email"
            value={form.email}
          />
        )}
      </Field>
      <Field label="Phone">
        {(props) => (
          <TextInput
            {...props}
            autoComplete="tel"
            onChange={(e) => update({ phone: e.target.value })}
            type="tel"
            value={form.phone}
          />
        )}
      </Field>
    </div>
  );
}

function TrainingFields({
  form,
  update,
}: {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Course interest" required>
        {(props) => (
          <Select
            {...props}
            onChange={(e) => update({ courseInterest: e.target.value })}
            required
            value={form.courseInterest}
          >
            <option value="">Choose a course…</option>
            {COURSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        hint="Your best estimate is fine."
        label="Expected headcount"
        required
      >
        {(props) => (
          <TextInput
            {...props}
            inputMode="numeric"
            min={1}
            onChange={(e) => update({ headcount: e.target.value })}
            required
            step={1}
            type="number"
            value={form.headcount}
          />
        )}
      </Field>
      <Field
        hint="Specific days, a month, or “weekday evenings” all work."
        label="Preferred dates"
      >
        {(props) => (
          <TextInput
            {...props}
            onChange={(e) => update({ preferredDates: e.target.value })}
            value={form.preferredDates}
          />
        )}
      </Field>
      <Field label="Location">
        {(props) => (
          <Select
            {...props}
            onChange={(e) => update({ location: e.target.value })}
            value={form.location}
          >
            <option value="">Choose a location…</option>
            {LOCATIONS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        className="sm:col-span-2"
        hint="Shift schedules, certification deadlines, languages, accessibility needs, or anything else we should plan for."
        label="Notes"
      >
        {(props) => (
          <TextArea
            {...props}
            className="min-h-28"
            onChange={(e) => update({ notes: e.target.value })}
            value={form.notes}
          />
        )}
      </Field>
    </div>
  );
}

export function GroupTrainingRequest() {
  const submit = useMutation(api.registrationGroups.submitGroupRequest);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const update = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));
  async function handleSubmit() {
    setBusy(true);
    setError("");
    try {
      await submit({
        organization: form.organization,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
        courseInterest: form.courseInterest,
        headcount: Number(form.headcount),
        preferredDates: form.preferredDates,
        location: form.location,
        notes: form.notes,
      });
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bg-slate-50">
      <Intro />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:py-14">
        <Expectations />
        <div className="lg:order-first">
          {done ? (
            <SuccessCard
              onReset={() => {
                setForm(EMPTY);
                setDone(false);
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Request group training</CardTitle>
                  <CardDescription>
                    No commitment. We’ll reply with dates and a quote within one
                    business day.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                >
                  <fieldset
                    className="m-0 min-w-0 space-y-4 border-0 p-0"
                    disabled={busy}
                  >
                    <h3 className="m-0 font-semibold text-slate-900 text-sm uppercase tracking-wide">
                      Your contact details
                    </h3>
                    <ContactFields form={form} update={update} />
                  </fieldset>
                  <fieldset
                    className="m-0 min-w-0 space-y-4 border-0 p-0"
                    disabled={busy}
                  >
                    <h3 className="m-0 font-semibold text-slate-900 text-sm uppercase tracking-wide">
                      About the training
                    </h3>
                    <TrainingFields form={form} update={update} />
                  </fieldset>
                  <ResultNotice message={error} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="m-0 text-slate-500 text-xs">
                      We only use your details to respond to this request.
                    </p>
                    <Button disabled={busy} type="submit">
                      {busy ? "Sending…" : "Send request"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
