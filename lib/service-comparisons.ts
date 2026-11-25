type ComparisonColumn = {
  key: string;
  label: string;
};

export type Comparison = {
  title: string;
  intro: string;
  columns: ComparisonColumn[];
  rows: Array<{ label: string; values: Record<string, string> }>;
  readMore: { href: string; label: string };
};

export const AHA_VS_RED_CROSS_BLS: Comparison = {
  title: "AHA BLS vs Red Cross BLS",
  intro:
    "Both courses teach the same core skills for healthcare providers. The real difference is which organization issues your card, and whether your employer or school names one of them.",
  columns: [
    { key: "aha", label: "AHA BLS" },
    { key: "redCross", label: "Red Cross BLS" },
  ],
  rows: [
    {
      label: "Issued by",
      values: {
        aha: "American Heart Association",
        redCross: "American Red Cross",
      },
    },
    {
      label: "Card",
      values: {
        aha: "AHA BLS Provider eCard",
        redCross: "Red Cross BLS digital certificate",
      },
    },
    {
      label: "Valid for",
      values: { aha: "2 years", redCross: "2 years" },
    },
    {
      label: "Core skills",
      values: {
        aha: "CPR for adults, children and infants, AED use, bag-mask ventilation, team resuscitation, choking relief",
        redCross:
          "CPR for adults, children and infants, AED use, bag-valve-mask ventilation, team resuscitation, airway obstruction, opioid overdose response",
      },
    },
    {
      label: "Formats we teach",
      values: {
        aha: "In-person classroom, or HeartCode BLS (online part plus an in-person skills session)",
        redCross:
          "Blended learning (online part plus an in-person skills session)",
      },
    },
    {
      label: "Pick it when",
      values: {
        aha: "Your hospital, clinic or school asks for AHA BLS by name. Many do.",
        redCross:
          "Your employer accepts any BLS for healthcare providers, or names Red Cross.",
      },
    },
  ],
  readMore: {
    href: "/blog/red-cross-vs-aha-certification",
    label: "Red Cross vs AHA CPR: which do hospitals accept?",
  },
};

export const BLS_VS_CPR: Comparison = {
  title: "BLS vs CPR",
  intro:
    "BLS is CPR training built for healthcare settings. A CPR, first aid and AED course is built for workplaces and the public. Pick by your job, not by which sounds more advanced.",
  columns: [
    { key: "bls", label: "BLS (Basic Life Support)" },
    { key: "cpr", label: "CPR, First Aid and AED" },
  ],
  rows: [
    {
      label: "Built for",
      values: {
        bls: "Nurses, CNAs, medical and dental staff, EMTs, and students in clinical programs",
        cpr: "Teachers, childcare staff, coaches, fitness trainers, office and trade workers, parents",
      },
    },
    {
      label: "Skills",
      values: {
        bls: "One- and two-rescuer CPR, bag-mask ventilation, pulse checks, team roles during a code, AED use, choking",
        cpr: "CPR for adults, children and infants, AED use, choking, plus first aid for bleeding, burns and sudden illness in the combined course",
      },
    },
    {
      label: "Medical background",
      values: {
        bls: "Not required, but the course assumes a clinical setting",
        cpr: "None needed",
      },
    },
    {
      label: "Our courses",
      values: {
        bls: "AHA BLS and Red Cross BLS",
        cpr: "AHA Heartsaver and Red Cross First Aid/CPR/AED",
      },
    },
    {
      label: "Valid for",
      values: { bls: "2 years", cpr: "2 years" },
    },
  ],
  readMore: {
    href: "/blog/difference-between-cpr-and-bls",
    label: "The difference between CPR and BLS",
  },
};

export const COURSE_FORMATS: Comparison = {
  title: "Online, blended or in-person?",
  intro:
    "AHA and Red Cross cards both need a hands-on skills check, so a course that is entirely online won't get you one. Blended and in-person classes end with the same card.",
  columns: [
    { key: "online", label: "Online only" },
    { key: "blended", label: "Blended" },
    { key: "inPerson", label: "In-person" },
  ],
  rows: [
    {
      label: "How it works",
      values: {
        online: "Videos and a quiz, with no instructor",
        blended:
          "Online coursework at your own pace, then a shorter in-person skills session",
        inPerson: "Everything in one instructor-led class",
      },
    },
    {
      label: "Hands-on skills check",
      values: { online: "No", blended: "Yes", inPerson: "Yes" },
    },
    {
      label: "Accepted by most employers",
      values: { online: "Rarely", blended: "Yes", inPerson: "Yes" },
    },
    {
      label: "Best for",
      values: {
        online: "Refreshing your knowledge between classes",
        blended: "Busy schedules and people renewing a card",
        inPerson:
          "First-time students and anyone who learns best by practicing",
      },
    },
  ],
  readMore: {
    href: "/blog/cpr-certification-online-vs-in-person",
    label: "Online vs in-person CPR certification: which is accepted?",
  },
};
