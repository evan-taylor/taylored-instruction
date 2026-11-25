/**
 * FAQ Schema for SEO
 * Use this to add FAQ structured data to pages
 */

export type FAQItem = {
  question: string;
  answer: string;
};

type FaqSchema = {
  "@context": string;
  "@type": string;
  mainEntity: Array<{
    "@type": string;
    name: string;
    acceptedAnswer: {
      "@type": string;
      text: string;
    };
  }>;
};

/**
 * Generate FAQ Schema for structured data
 * @param faqs Array of FAQ items with questions and answers
 * @returns FAQSchema object ready for JSON-LD
 *
 * @example
 * const faqs = [
 *   {
 *     question: "How long is BLS certification valid?",
 *     answer: "BLS certification is valid for 2 years from the date of completion."
 *   },
 *   {
 *     question: "Do you offer group discounts?",
 *     answer: "Yes! We offer competitive pricing for corporate and group training. Contact us for a custom quote."
 *   }
 * ];
 *
 * const faqSchema = getFAQSchema(faqs);
 *
 * // In your page component:
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={generateJSONLD(faqSchema)}
 * />
 */
export const getFAQSchema = (faqs: FAQItem[]): FaqSchema => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

const SERVICE_AREA =
  "We teach in Vancouver, WA and serve Camas, Portland, San Luis Obispo and the surrounding areas. Each class on the schedule lists its exact location, and we also teach groups on-site.";

export const ahaBlsFAQs: FAQItem[] = [
  {
    question: "How long is AHA BLS certification valid?",
    answer:
      "AHA BLS certification is valid for 2 years. Your BLS Provider eCard shows a recommended renewal date, and you renew by taking a BLS course again before that date.",
  },
  {
    question: "What is the difference between AHA BLS and Red Cross BLS?",
    answer:
      "The skills are nearly the same; the difference is which organization issues your card. Many hospitals and nursing programs ask for AHA BLS by name, so check your requirement first. We teach both, and Red Cross BLS has its own page.",
  },
  {
    question: "Is BLS the same as CPR?",
    answer:
      "No. BLS is CPR training built for healthcare providers. It adds two-rescuer CPR, bag-mask ventilation and team roles during a resuscitation to the CPR, AED and choking skills taught in workplace courses.",
  },
  {
    question: "Can I get AHA BLS certified online?",
    answer:
      "Only partly. With HeartCode BLS you finish the coursework online, but you still attend an in-person skills session before the AHA issues a BLS Provider card.",
  },
  {
    question: "When do I get my AHA BLS card?",
    answer:
      "You get your AHA BLS Provider eCard the same day you pass, so you can send it to your employer or school right away.",
  },
  {
    question: "What should I bring to an AHA BLS class?",
    answer:
      "Bring a photo ID and wear clothes you can kneel in. If you are taking HeartCode BLS, also bring your online completion certificate. We provide manikins, AED trainers and course materials.",
  },
  {
    question: "Where do you teach AHA BLS?",
    answer: SERVICE_AREA,
  },
];

export const redCrossBlsFAQs: FAQItem[] = [
  {
    question: "Is Red Cross BLS accepted instead of AHA BLS?",
    answer:
      "Often, but not always. Many employers accept either card, while some hospitals and schools require AHA BLS by name. Ask before you book; if they need AHA, take our AHA BLS course instead.",
  },
  {
    question: "How long is Red Cross BLS certification valid?",
    answer:
      "Red Cross BLS certification is valid for 2 years from the day you pass the course.",
  },
  {
    question: "What does Red Cross BLS cover?",
    answer:
      "It covers CPR, AED use and airway care for adults, children and infants. You also practice bag-valve-mask ventilation, team resuscitation, airway obstruction and opioid overdose response.",
  },
  {
    question: "How does the blended Red Cross BLS course work?",
    answer:
      "You finish the online part at your own pace, then attend an in-person skills session where an instructor checks each skill. Finish the online part before your session, because you can't take the skills check without it.",
  },
  {
    question: "Are there prerequisites for Red Cross BLS?",
    answer:
      "No. Anyone can take Red Cross BLS, though the course is written for people who work or train in healthcare.",
  },
  {
    question: "When do I get my Red Cross BLS certificate?",
    answer:
      "You get a Red Cross digital certificate the same day you pass the skills session.",
  },
  {
    question: "Where do you teach Red Cross BLS?",
    answer: SERVICE_AREA,
  },
];

export const heartsaverFAQs: FAQItem[] = [
  {
    question: "What is AHA Heartsaver?",
    answer:
      "Heartsaver is the American Heart Association's CPR, AED and first aid course for people without medical training. It is the usual choice for workplaces, schools and childcare.",
  },
  {
    question: "Should I take Heartsaver or BLS?",
    answer:
      "Take BLS if you work or train in healthcare, and Heartsaver if you don't. BLS adds team resuscitation and bag-mask skills that Heartsaver students don't need.",
  },
  {
    question: "How long is Heartsaver certification valid?",
    answer: "Heartsaver certification is valid for 2 years.",
  },
  {
    question: "Does Heartsaver include first aid?",
    answer:
      "Heartsaver First Aid CPR AED does; Heartsaver CPR AED covers CPR and AED use only. If your job asks for first aid, book the version that includes it.",
  },
  {
    question: "Can I take Heartsaver as a blended course?",
    answer:
      "Yes. You do the knowledge portion online, then attend a shorter in-person session to practice and pass the skills check.",
  },
  {
    question: "Do I need any experience to take Heartsaver?",
    answer:
      "No. Heartsaver assumes no medical background and starts from the basics.",
  },
  {
    question: "When do I get my Heartsaver card?",
    answer:
      "You get your AHA Heartsaver eCard the same day you pass the class.",
  },
];

export const firstAidFAQs: FAQItem[] = [
  {
    question: "What does the Red Cross First Aid/CPR/AED course cover?",
    answer:
      "It teaches you to recognize and respond to cardiac, breathing and first aid emergencies, including CPR, AED use, choking, bleeding, burns and sudden illness. Pediatric versions add CPR and first aid for children and infants.",
  },
  {
    question: "How long is Red Cross First Aid/CPR/AED certification valid?",
    answer: "Red Cross First Aid/CPR/AED certification is valid for 2 years.",
  },
  {
    question: "Will my employer accept Red Cross First Aid/CPR/AED?",
    answer:
      "Most employers, schools and childcare programs accept it. If your employer names a specific course, such as AHA Heartsaver, book that one instead.",
  },
  {
    question:
      "What is the difference between Red Cross First Aid/CPR/AED and AHA Heartsaver?",
    answer:
      "They serve the same purpose and cover similar skills; the difference is the issuing organization. Choose the one your employer or licensing agency names, or either one if they don't specify.",
  },
  {
    question: "Should I choose blended or in-person?",
    answer:
      "Choose blended if you prefer to do the reading and videos online first, and in-person if you'd rather do everything with an instructor. Both end with the same certificate.",
  },
  {
    question: "Are there prerequisites?",
    answer:
      "No. The core First Aid, CPR and AED courses have no prerequisites.",
  },
  {
    question: "When do I get my certificate?",
    answer: "You get a Red Cross digital certificate the same day you pass.",
  },
];

export const lifeguardFAQs: FAQItem[] = [
  {
    question: "What are the prerequisites for Red Cross Lifeguarding?",
    answer:
      "You must be at least 15 years old by the final session and pass two swim tests on the first day: a swim-tread-swim sequence and a timed brick retrieval from 7–10 feet of water.",
  },
  {
    question: "What happens if I don't pass the swim test?",
    answer:
      "You can't continue the course. The tests run at the start of the first in-person session, so practice them before class.",
  },
  {
    question: "How long is lifeguard certification valid?",
    answer:
      "Red Cross Lifeguarding certification is valid for 2 years. It includes CPR/AED for Professional Rescuers and First Aid, which are also valid for 2 years.",
  },
  {
    question: "Is the course online or in person?",
    answer:
      "It is blended. You complete eLearning before the first session, then do the classroom and in-water training in person. The eLearning link comes in your registration email.",
  },
  {
    question: "Can I take a shorter course to recertify?",
    answer:
      "Yes. If your Red Cross Lifeguarding certificate is still current, you can take a recertification course instead of the full course. Recertification dates are on the class schedule.",
  },
  {
    question: "Does the course cover deep water?",
    answer:
      "Yes. We teach Lifeguarding Including Deep Water, so you train for rescues in both shallow and deep water.",
  },
  {
    question: "When do I get my lifeguard certificate?",
    answer:
      "You get a Red Cross digital certificate the same day you pass the course.",
  },
];

export const lifeguardInstructorFAQs: FAQItem[] = [
  {
    question: "What do I need to take the Lifeguarding Instructor course?",
    answer:
      "You need to be at least 17 by the last day of the course and hold a current Red Cross Lifeguarding Including Deep Water certificate with CPR/AED for Professional Rescuers and First Aid.",
  },
  {
    question: "How is the Lifeguarding Instructor course structured?",
    answer:
      "It is blended: an online session you complete on your own, then in-person classroom and in-water sessions that start with a precourse skill assessment.",
  },
  {
    question: "How do I pass the Lifeguarding Instructor course?",
    answer:
      "You attend every session, complete the teaching assignments and score at least 80% on the final written exam.",
  },
  {
    question: "How long is Lifeguarding Instructor certification valid?",
    answer:
      "It is valid for 2 years. You keep it by taking the blended Lifeguarding Instructor Recertification course within that period, and you can still recertify for up to a year after it expires.",
  },
  {
    question: "Who teaches the course?",
    answer:
      "Instructor courses are led by a Red Cross Lifeguarding Instructor Trainer. Our founder, Evan Taylor, holds that rating.",
  },
  {
    question: "Can you run the course at our pool?",
    answer:
      "Yes. Aquatic facilities can host a Lifeguarding Instructor course for their own staff. Contact us with your dates and number of candidates.",
  },
];

export const waterSafetyInstructorFAQs: FAQItem[] = [
  {
    question: "What can a Water Safety Instructor teach?",
    answer:
      "A Red Cross Water Safety Instructor can teach Parent and Child Aquatics, Preschool Aquatics, Learn-to-Swim Levels 1–6 and Adult Swim.",
  },
  {
    question: "What are the prerequisites for WSI?",
    answer:
      "You must be at least 16 by the last day of the course and pass the precourse swimming skills session at the start of class.",
  },
  {
    question: "Which strokes do I need for the WSI precourse?",
    answer:
      "You need front crawl, back crawl, breaststroke, elementary backstroke, sidestroke and butterfly, plus floating and treading water in deep water.",
  },
  {
    question: "Do I need to be a lifeguard to become a WSI?",
    answer:
      "No. WSI is a separate certification, and lifeguard certification is not a prerequisite.",
  },
  {
    question: "How do I pass the WSI course?",
    answer:
      "You pass the precourse session, attend the whole course, complete the practice teaching assignments and score at least 80% on the final written exam.",
  },
  {
    question: "How long is WSI certification valid?",
    answer: "Water Safety Instructor certification is valid for 2 years.",
  },
];

export const faCprAedInstructorFAQs: FAQItem[] = [
  {
    question:
      "What do I need to become a Red Cross First Aid/CPR/AED instructor?",
    answer:
      "You need to be at least 17 by the last day of the course and hold a current basic-level First Aid/CPR/AED certificate or equivalent.",
  },
  {
    question: "How is the instructor course structured?",
    answer:
      "It is blended: an online session you complete first, then an in-person session where you practice teaching and get feedback.",
  },
  {
    question: "How do I pass the instructor course?",
    answer:
      "You complete the online session, attend the full in-person session, finish the practice teaching assignments and pass the final written exam.",
  },
  {
    question: "Do I need the instructor's manual?",
    answer:
      "Yes. Every candidate needs the American Red Cross First Aid/CPR/AED Instructor's Manual. Request a copy through our contact form or buy one from the Red Cross store.",
  },
  {
    question: "Can I teach on my own after I certify?",
    answer:
      "You teach Red Cross courses through a Red Cross Training Provider. Taylored Instruction is a Red Cross Licensed Training Provider, and new instructors can align with us.",
  },
  {
    question: "How long is instructor certification valid?",
    answer:
      "Red Cross First Aid/CPR/AED instructor certification is valid for 2 years.",
  },
  {
    question: "Who teaches the course?",
    answer:
      "Instructor courses are led by a Red Cross Instructor Trainer. Our founder, Evan Taylor, is a Red Cross First Aid/CPR/AED Instructor Trainer.",
  },
];

export const ahaInstructorFAQs: FAQItem[] = [
  {
    question: "What are the requirements to become an AHA instructor?",
    answer:
      "You need a current AHA provider card in the discipline you want to teach, an accepted Instructor Candidate Application, the online Instructor Essentials course, the in-person instructor course and a monitored first class.",
  },
  {
    question: "Which AHA courses can I teach?",
    answer:
      "We train BLS and Heartsaver instructors. Pick the discipline that matches your audience: BLS for healthcare providers, Heartsaver for workplaces and the public.",
  },
  {
    question: "Can I teach AHA courses independently?",
    answer:
      "No. Every AHA instructor teaches through an AHA Training Center or Training Site. Taylored Instruction is an AHA Training Site through the Resuscitation Group, and new instructors can align with us.",
  },
  {
    question: "How long is AHA instructor certification valid?",
    answer:
      "AHA instructor certification is valid for 2 years. To renew, you teach at least four courses in that time and complete an instructor renewal.",
  },
  {
    question: "What is a monitored class?",
    answer:
      "It is the first course you teach, with AHA Training Faculty watching and giving feedback. You get your instructor card after you pass it.",
  },
  {
    question: "Who teaches the AHA instructor course?",
    answer:
      "AHA instructor courses are taught by AHA Training Faculty. Our founder, Evan Taylor, is AHA Training Faculty.",
  },
];

export const corporateFAQs: FAQItem[] = [
  {
    question: "Do you train at our workplace?",
    answer:
      "Yes. We bring manikins, AED trainers and course materials to your site in Vancouver, Camas, Portland, San Luis Obispo and the surrounding areas, or host your team at our Vancouver facility.",
  },
  {
    question: "Which course should our team take?",
    answer:
      "Healthcare staff need BLS. Most other teams need AHA Heartsaver or Red Cross First Aid/CPR/AED, with first aid included if your industry requires it.",
  },
  {
    question: "How much does corporate CPR training cost?",
    answer:
      "Pricing depends on group size, course and location. Send a group training request and we'll reply with a quote.",
  },
  {
    question: "How do you handle large groups?",
    answer:
      "We split large groups into several sessions so every person gets enough hands-on practice to pass the skills check.",
  },
  {
    question: "Can the training reflect our workplace?",
    answer:
      "Yes. We use scenarios from your setting, such as a classroom, job site, clinic or office, while covering everything the certification requires.",
  },
  {
    question: "Do employees get the same certification as a public class?",
    answer:
      "Yes. Each employee who passes gets the same AHA or Red Cross card as a public class, valid for 2 years and issued as an eCard the same day.",
  },
];

export const groupTrainingFAQs: FAQItem[] = [
  {
    question: "How quickly will you reply to a group training request?",
    answer:
      "We reply within one business day with available dates, pricing and a plan for your group.",
  },
  {
    question: "Which courses can we book for a group?",
    answer:
      "You can book AHA BLS, AHA Heartsaver, Red Cross First Aid/CPR/AED, Red Cross Lifeguarding and instructor courses for a group.",
  },
  {
    question: "Where does group training take place?",
    answer:
      "Either at your site or at our Vancouver, WA facility. We travel to Camas, Portland, San Luis Obispo and the surrounding areas.",
  },
  {
    question: "How does billing work for group training?",
    answer:
      "You can pay by invoice or purchase order, and per-person pricing drops as your group grows.",
  },
  {
    question: "Does everyone get a certification card?",
    answer:
      "Yes. Each person who passes gets an AHA or Red Cross eCard the same day, valid for 2 years.",
  },
  {
    question: "Can we use a blended format?",
    answer:
      "Yes. Your team completes the online part on their own time, then we run a shorter in-person skills session for the whole group.",
  },
];
