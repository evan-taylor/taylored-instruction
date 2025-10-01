/**
 * FAQ Schema for SEO
 * Use this to add FAQ structured data to pages
 */

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchema {
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
}

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
export const getFAQSchema = (faqs: FAQItem[]): FAQSchema => {
  return {
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
  };
};

// Common FAQs for different pages

export const blsFAQs: FAQItem[] = [
  {
    question: "How long is AHA BLS certification valid?",
    answer:
      "AHA BLS certification is valid for 2 years from the date of course completion. We recommend renewing your certification before it expires to maintain continuous coverage.",
  },
  {
    question: "Is BLS the same as CPR?",
    answer:
      "BLS (Basic Life Support) includes CPR but is more comprehensive. It's designed for healthcare providers and includes high-quality CPR, AED use, relief of choking, and team dynamics. It's more advanced than standard CPR certification.",
  },
  {
    question: "Can I take the BLS course online?",
    answer:
      "Yes! We offer the AHA HeartCode BLS option, which is a blended learning course. You complete the online cognitive portion at your own pace, then attend a shorter in-person skills session to demonstrate your competency.",
  },
  {
    question: "What do I need to bring to the BLS course?",
    answer:
      "Bring a valid photo ID, wear comfortable clothing, and if doing HeartCode BLS, bring your completion certificate from the online portion. We provide all training materials and equipment.",
  },
  {
    question: "Where do you offer BLS training?",
    answer:
      "We offer BLS training in Vancouver, WA and throughout Clark County, as well as seasonally in San Luis Obispo, CA. We also provide on-site corporate training at your location.",
  },
];

export const firstAidFAQs: FAQItem[] = [
  {
    question: "How long does the First Aid/CPR/AED course take?",
    answer:
      "The in-person course takes approximately 5-6 hours. If you choose the blended learning option with online coursework, the in-person skills session is only 2-3 hours.",
  },
  {
    question: "Is this certification accepted by employers?",
    answer:
      "Yes! American Red Cross First Aid/CPR/AED certification is widely recognized and accepted by employers, schools, childcare facilities, and organizations across the United States.",
  },
  {
    question: "What's the difference between adult, child, and infant CPR?",
    answer:
      "The techniques vary based on the victim's size and age. Our course covers all three age groups, teaching you proper hand placement, compression depth, and rescue breathing techniques for adults, children, and infants.",
  },
  {
    question: "Do I need to renew my certification?",
    answer:
      "Yes, First Aid/CPR/AED certification is valid for 2 years. We recommend taking a renewal course before your certification expires to stay current with the latest guidelines.",
  },
];

export const lifeguardFAQs: FAQItem[] = [
  {
    question: "What are the prerequisites for lifeguard training?",
    answer:
      "You must be at least 15 years old by the last day of class and pass a swimming prerequisite test that includes: 300-yard continuous swim using front crawl and breaststroke, treading water for 2 minutes using legs only, and retrieving a 10-pound brick from 7-10 feet of water.",
  },
  {
    question: "How long is lifeguard certification valid?",
    answer:
      "American Red Cross Lifeguarding certification is valid for 2 years. Your CPR/AED for Professional Rescuers and First Aid certifications earned during the course are also valid for 2 years.",
  },
  {
    question: "What does the lifeguard course cover?",
    answer:
      "The course covers water rescue skills, surveillance techniques, injury prevention, CPR/AED for Professional Rescuers, First Aid, and professional lifeguard responsibilities. You'll learn both pool and waterfront rescue techniques.",
  },
  {
    question: "Can I get hired as a lifeguard after this course?",
    answer:
      "Yes! Upon successful completion, you'll receive American Red Cross Lifeguarding certification, which is the industry standard and required by most pools, waterparks, beaches, and aquatic facilities.",
  },
];

export const corporateFAQs: FAQItem[] = [
  {
    question: "How many people can be trained at once?",
    answer:
      "We can train groups of up to 20 participants in a single session for most courses. For larger groups, we'll divide into multiple sessions to ensure quality instruction and hands-on practice for everyone.",
  },
  {
    question: "Do you provide on-site training?",
    answer:
      "Yes! We bring all necessary equipment and materials to your location in Vancouver, WA, Clark County, San Luis Obispo, CA, and surrounding areas. This minimizes disruption to your operations and provides a familiar learning environment for your team.",
  },
  {
    question: "What's included in corporate training?",
    answer:
      "Your corporate training includes expert instruction from certified professionals, all course materials and participant manuals, hands-on practice with state-of-the-art equipment, and certification cards valid for 2 years upon successful completion.",
  },
  {
    question: "How do I get a quote for corporate training?",
    answer:
      "Contact us with details about your group size, preferred course type, and location. We'll provide a competitive custom quote based on your specific needs. Group discounts are available.",
  },
];

export const instructorTrainingFAQs: FAQItem[] = [
  {
    question: "What are the requirements to become an AHA instructor?",
    answer:
      "You must have a current AHA Provider-level certification in the course you want to teach (BLS or Heartsaver), complete the online AHA Instructor Essentials course, attend the in-person instructor course, and successfully demonstrate teaching skills.",
  },
  {
    question: "How long does instructor training take?",
    answer:
      "The Instructor Essentials online portion takes about 4 hours. The in-person skills session for BLS Instructor is approximately 6-8 hours, and Heartsaver Instructor is 6-8 hours. Course length depends on class size and participant experience.",
  },
  {
    question: "Can I start teaching immediately after certification?",
    answer:
      "Yes! Once you complete the course and receive your AHA Instructor certification, you can begin teaching courses. However, you must be aligned with an AHA Training Center (like Taylored Instruction) to issue AHA certification cards to your students.",
  },
  {
    question: "How much does it cost to maintain instructor status?",
    answer:
      "AHA Instructor certifications are valid for 2 years and must be renewed. You'll need to co-teach or monitor courses periodically, stay current with your provider-level certification, and complete any updates or changes to course materials.",
  },
];

/**
 * Example usage in a page component:
 * 
 * import { generateJSONLD } from '@/lib/structuredData';
 * import { getFAQSchema, blsFAQs } from '@/lib/faqSchema';
 * 
 * export default function BLSPage() {
 *   const faqSchema = getFAQSchema(blsFAQs);
 *   
 *   return (
 *     <>
 *       <script
 *         type="application/ld+json"
 *         dangerouslySetInnerHTML={generateJSONLD(faqSchema)}
 *       />
 *       <YourPageContent />
 *     </>
 *   );
 * }
 */
