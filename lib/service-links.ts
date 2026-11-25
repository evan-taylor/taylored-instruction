export type SiteLink = {
  label: string;
  href: string;
};

export const AHA_COURSE_LINKS: SiteLink[] = [
  { label: "BLS", href: "/bls" },
  { label: "Heartsaver", href: "/heartsaver" },
  { label: "Instructor training", href: "/aha-instructor-training" },
];

export const RED_CROSS_COURSE_LINKS: SiteLink[] = [
  { label: "Basic Life Support (BLS)", href: "/basic-life-support" },
  {
    label: "Adult and Pediatric First Aid/CPR/AED",
    href: "/first-aid-cpr-aed",
  },
  { label: "Lifeguarding", href: "/lifeguarding" },
  { label: "Lifeguarding instructor", href: "/lifeguarding-instructor" },
  {
    label: "Lifeguarding instructor trainer",
    href: "/lifeguarding-instructor-trainer",
  },
  { label: "Water Safety Instructor", href: "/water-safety-instructor" },
  { label: "First Aid/CPR/AED instructor", href: "/fa-cpr-aed-instructor" },
];

export const TRAINING_SERVICE_LINKS: SiteLink[] = [
  { label: "Register for classes", href: "/classes" },
  { label: "Group training", href: "/group-training" },
  { label: "Corporate training", href: "/corporate-training" },
  { label: "AED sales", href: "/aeds" },
];
