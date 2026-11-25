import { type FAQItem, getFAQSchema } from "@/lib/faqSchema";
import { SITE_URL } from "@/lib/seo";
import {
  getBreadcrumbSchema,
  getServiceSchema,
  getWebPageSchema,
} from "@/lib/structuredData";
import { parsePlace } from "@/shared/registration/catalog";

export const LOCATIONS_BASE_PATH = "/cpr-classes";

export const CONTACT = {
  phone: "(360) 685-8199",
  phoneHref: "tel:+13606858199",
  telephone: "+1-360-685-8199",
  email: "info@tayloredinstruction.com",
  hours: "9 AM to 7 PM, 7 days a week",
} as const;

export const COLAB_ADDRESS = {
  name: "CoLab Coworking",
  streetAddress: "915 Broadway St, Suite 100",
  addressLocality: "Vancouver",
  addressRegion: "WA",
  postalCode: "98660",
  latitude: 45.628_45,
  longitude: -122.670_054,
} as const;

const COURSES = {
  bls: {
    href: "/bls",
    name: "AHA BLS Provider",
    summary:
      "American Heart Association BLS for nurses, EMTs, dental teams and other healthcare workers, in person or as a HeartCode skills session.",
  },
  "basic-life-support": {
    href: "/basic-life-support",
    name: "Red Cross Basic Life Support",
    summary:
      "The American Red Cross BLS course, for employers and programs that ask for a Red Cross card.",
  },
  heartsaver: {
    href: "/heartsaver",
    name: "AHA Heartsaver First Aid CPR AED",
    summary:
      "The AHA course for workplaces, coaches and anyone outside healthcare who needs CPR and first aid.",
  },
  "first-aid-cpr-aed": {
    href: "/first-aid-cpr-aed",
    name: "Red Cross First Aid/CPR/AED",
    summary:
      "Adult and pediatric first aid and CPR, the course child care, school and office staff usually take.",
  },
  lifeguarding: {
    href: "/lifeguarding",
    name: "Red Cross Lifeguarding",
    summary:
      "Pool lifeguard certification, with CPR/AED for Professional Rescuers and First Aid included.",
  },
  "water-safety-instructor": {
    href: "/water-safety-instructor",
    name: "Red Cross Water Safety Instructor",
    summary: "For swimmers who want to teach Red Cross swim lessons.",
  },
  "lifeguarding-instructor": {
    href: "/lifeguarding-instructor",
    name: "Red Cross Lifeguarding Instructor",
    summary: "For experienced lifeguards who want to certify new lifeguards.",
  },
  "aha-instructor-training": {
    href: "/aha-instructor-training",
    name: "AHA Instructor Training",
    summary:
      "Become an American Heart Association BLS or Heartsaver instructor.",
  },
  "corporate-training": {
    href: "/corporate-training",
    name: "On-site group training",
    summary:
      "Any of these courses taught at your workplace, on a date that suits your team.",
  },
} as const;

export type LocationCourse = (typeof COURSES)[keyof typeof COURSES];

export type CityPage = {
  /** URL segment, also the key the legacy /resources redirects point at. */
  slug: string;
  city: string;
  state: "WA" | "OR" | "CA";
  title: string;
  description: string;
  heading: string;
  lede: string;
  intro: string[];
  /** Localities whose public classes count as "in" this city. */
  sessionCities: string[];
  /** Other city pages whose classes are shown when this city has none. */
  nearby: string[];
  areaServed: string[];
  courses: LocationCourse[];
  faqs: FAQItem[];
  /** Vancouver is the street address; every other city is a service area. */
  schema: "localBusiness" | "service";
};

export const LOCATIONS: CityPage[] = [
  {
    slug: "vancouver-wa",
    city: "Vancouver",
    state: "WA",
    title: "CPR Classes in Vancouver, WA | Taylored Instruction",
    description:
      "CPR, BLS, first aid and lifeguard classes in Vancouver, WA from a Red Cross and AHA training provider based downtown. Small classes, same-day eCards.",
    heading: "CPR, BLS and first aid classes in Vancouver, WA",
    lede: "Taylored Instruction is a Vancouver business. Evan Taylor runs it from downtown and teaches most of the public classes on the schedule here in Clark County.",
    intro: [
      "The office is at CoLab Coworking, 915 Broadway Street in downtown Vancouver, a few blocks from Esther Short Park. Evan started Taylored Instruction in 2023, and Vancouver has been home base since. Call (360) 685-8199 between 9 AM and 7 PM any day of the week if you're not sure which course you need.",
      "Every course ends in a national certification. Taylored Instruction is an American Red Cross Licensed Training Provider, an American Heart Association Training Site through the Resuscitation Group, and an HSI Training Center. Evan is AHA Training Faculty and a Red Cross Instructor Trainer for Lifeguarding, Water Safety Instructor and First Aid/CPR/AED. He trains new instructors as well as teaching classes.",
      "Public classes meet at venues around Vancouver. Water courses such as lifeguarding and instructor classes use pools, including the Clark County Family YMCA on NE 51st Circle in east Vancouver. Every date in the schedule below lists its venue and address, so check where your class meets before you register. Classes are kept small, which means more time on the manikins and less time waiting. Cards are valid for two years and you get your eCard the same day you pass.",
      "AHA BLS is the usual course for healthcare workers renewing before a license or job deadline. Students in nursing and dental programs at Clark College and WSU Vancouver usually need BLS before clinical placements too, so check which card your program asks for. Teachers, coaches and child care staff tend to take Red Cross First Aid/CPR/AED or AHA Heartsaver, since DCYF-licensed child care programs need staff with current pediatric first aid and CPR. Red Cross Lifeguarding is the course to take before summer pool hiring, and teenagers can start once they meet the age requirement on the Lifeguarding page.",
      "Employers are the other half of the work. Washington's Department of Labor & Industries requires first-aid trained staff to be available at work (WAC 296-800-150), and many Clark County employers would rather train the whole team at once than send people to public classes one at a time. Evan teaches on-site at offices, warehouses, clinics, dental practices, schools and pools, and brings the manikins, AED trainers and first aid supplies. You pick the course and the date, and everyone leaves with their card.",
      "Downtown, Hazel Dell, Salmon Creek, Orchards, Felida and Fishers Landing are all a short drive from Vancouver class venues. Battle Ground, Ridgefield, La Center, Camas and Washougal are close too, and Portland is just across the Columbia. Group training is available anywhere in Clark County. For any class, bring a photo ID and wear clothes you can kneel in.",
    ],
    sessionCities: ["Vancouver"],
    nearby: ["camas-wa"],
    areaServed: [
      "Vancouver, WA",
      "Clark County, WA",
      "Battle Ground, WA",
      "Ridgefield, WA",
      "La Center, WA",
      "Camas, WA",
      "Washougal, WA",
    ],
    courses: [
      COURSES.bls,
      COURSES["basic-life-support"],
      COURSES.heartsaver,
      COURSES["first-aid-cpr-aed"],
      COURSES.lifeguarding,
      COURSES["water-safety-instructor"],
      COURSES["lifeguarding-instructor"],
      COURSES["aha-instructor-training"],
      COURSES["corporate-training"],
    ],
    faqs: [
      {
        question: "Where are CPR classes held in Vancouver, WA?",
        answer:
          "Taylored Instruction's office is at CoLab Coworking, 915 Broadway St, Suite 100, Vancouver, WA 98660. Public classes meet at venues around Vancouver, and pool courses meet at pools such as the Clark County Family YMCA. Each date on the schedule lists its exact address.",
      },
      {
        question: "Can I take AHA BLS in Vancouver?",
        answer:
          "Yes. AHA BLS Provider is taught in person, and HeartCode BLS students finish the online part first and then attend a shorter in-person skills session. The Red Cross Basic Life Support course is also available if your employer asks for a Red Cross card.",
      },
      {
        question: "How soon do I get my CPR card?",
        answer:
          "You get an eCard the same day you pass. AHA and Red Cross cards are valid for two years.",
      },
      {
        question: "How much does a CPR class in Vancouver cost?",
        answer:
          "Price and length depend on the course and format. Every date on the class schedule shows the full price before you register, with no account needed.",
      },
      {
        question: "Can you train our staff at our Vancouver workplace?",
        answer:
          "Yes. Evan teaches CPR, first aid, BLS and lifeguarding courses on-site anywhere in Clark County and brings all the equipment. Request a quote through the group training form with your group size and preferred dates.",
      },
    ],
    schema: "localBusiness",
  },
  {
    slug: "portland-or",
    city: "Portland",
    state: "OR",
    title: "CPR Classes Near Portland, OR | Taylored Instruction",
    description:
      "CPR, BLS and first aid training for Portland, OR: public classes just across the river in Vancouver, WA, and on-site group training at your workplace.",
    heading: "CPR and first aid training for Portland, OR",
    lede: "Taylored Instruction is based in Vancouver, Washington, across the Columbia River from Portland. Portland students either drive over for a public class or book a group class at their own workplace.",
    intro: [
      "Public classes are scheduled in Clark County, Washington. Downtown Vancouver is a short drive from North and Northeast Portland over the I-5 Interstate Bridge, and east Clark County venues are easy to reach from the airport area on I-205. If a Portland date is ever posted, it shows up in the list on this page first. Otherwise you'll see the closest Clark County classes.",
      "The state line doesn't change your card. American Heart Association and American Red Cross certifications are national, so a card from a Vancouver class is the same card you would get in Oregon. Taylored Instruction is a Red Cross Licensed Training Provider, an AHA Training Site through the Resuscitation Group, and an HSI Training Center, and every course ends with a same-day eCard that is valid for two years.",
      "Portland-area hospitals and clinics usually ask clinical staff for AHA BLS. Nurses, medical assistants, dental teams and EMTs can take the full in-person class or do HeartCode BLS online and then attend a shorter skills session. If your employer specifically wants a Red Cross card, the Red Cross Basic Life Support course covers the same skills.",
      "Outside healthcare, the rules that send people to a CPR class are Oregon rules. Oregon OSHA expects workplaces to have first-aid trained people available when medical help isn't close by (OAR 437-002-0161), and child care providers licensed through Oregon's Department of Early Learning and Care need current infant and child CPR and first aid. Red Cross Adult and Pediatric First Aid/CPR/AED and AHA Heartsaver both cover those needs. Check with your licensing specialist or safety lead if you're unsure which one they accept.",
      "For a team, on-site training is usually easier than a trip across the river. Evan teaches at offices, clinics, dental practices, schools, gyms and pools in Portland, Beaverton, Gresham, Lake Oswego and the rest of the metro area, and brings the manikins, AED trainers and supplies. Groups choose the course and the date, classes stay small enough for real practice, and everyone gets their card the same day.",
      "Lifeguard candidates cross the river too. Red Cross Lifeguarding needs a pool, so those classes meet at Clark County pool venues listed in the schedule. If you're hiring lifeguards for a Portland-area pool, ask about a private class at your facility.",
      "Plan for the bridges when you book. Rush-hour traffic on the Interstate Bridge and the Glenn Jackson Bridge can add half an hour, so leave early for a morning class. Bring a photo ID and wear clothes you can kneel in. HeartCode BLS students also need the certificate from the online part.",
    ],
    sessionCities: [
      "Portland",
      "Beaverton",
      "Gresham",
      "Lake Oswego",
      "Tigard",
      "Hillsboro",
      "Milwaukie",
      "Tualatin",
      "Happy Valley",
    ],
    nearby: ["vancouver-wa", "camas-wa"],
    areaServed: [
      "Portland, OR",
      "Beaverton, OR",
      "Gresham, OR",
      "Lake Oswego, OR",
      "Tigard, OR",
      "Hillsboro, OR",
      "Multnomah County, OR",
      "Washington County, OR",
      "Clackamas County, OR",
    ],
    courses: [
      COURSES.bls,
      COURSES["basic-life-support"],
      COURSES.heartsaver,
      COURSES["first-aid-cpr-aed"],
      COURSES.lifeguarding,
      COURSES["corporate-training"],
    ],
    faqs: [
      {
        question: "Are your CPR and BLS cards valid in Oregon?",
        answer:
          "Yes. American Heart Association and American Red Cross certifications are national, so a card from a class in Vancouver, WA is accepted the same way in Oregon. Cards are valid for two years.",
      },
      {
        question: "Do you hold public CPR classes in Portland?",
        answer:
          "Public classes are scheduled in Clark County, Washington, a short drive from Portland. Any Portland date that gets posted appears on this page and on the class schedule.",
      },
      {
        question: "Can you teach CPR at our Portland office or clinic?",
        answer:
          "Yes. Evan teaches on-site group classes across the Portland metro area and brings all the equipment. Send your group size, course and preferred dates through the group training form for a quote.",
      },
      {
        question: "Which course do Portland healthcare workers need?",
        answer:
          "Most Portland-area hospitals and clinics ask for AHA BLS. Take the full in-person class or HeartCode BLS online plus a skills session. Check with your employer if they want a Red Cross card instead.",
      },
      {
        question: "How soon do I get my card?",
        answer: "You get an eCard the same day you pass, for every course.",
      },
    ],
    schema: "service",
  },
  {
    slug: "camas-wa",
    city: "Camas",
    state: "WA",
    title: "CPR & Lifeguard Classes in Camas, WA | Taylored Instruction",
    description:
      "Red Cross lifeguarding, CPR and first aid classes in Camas, WA, plus on-site training for Camas and Washougal schools, gyms and employers.",
    heading: "Lifeguard, CPR and first aid classes in Camas, WA",
    lede: "Camas is one of the places Taylored Instruction runs pool classes. Lifeguarding courses meet at the Gold's Gym Camas pool, about 20 minutes east of downtown Vancouver on SR-14.",
    intro: [
      "Gold's Gym Camas, at 2950 NW 38th Avenue, has the pool space a lifeguarding class needs. Red Cross Lifeguarding is a mix of pool and classroom work, so the venue matters more than for a CPR class. Each date in the schedule below lists its venue and address, so you can see which ones meet in Camas and which meet in Vancouver.",
      "Lifeguard certification is the main reason people come to a class in Camas. Students have to pass a swim skills test on the first day, then learn surveillance, water rescues, CPR/AED for Professional Rescuers and First Aid. The Lifeguarding page lists the prerequisites. Pools across east Clark County hire lifeguards ahead of summer, so book a spring class early. If you swim well and want to teach, the Red Cross Water Safety Instructor course certifies you to teach swim lessons, which local pools also need.",
      "Families in Camas and Washougal spend a lot of summer time around water, from Lacamas Lake and Round Lake to the Columbia River beaches along SR-14. That is a good reason for parents, babysitters and coaches to take a first aid and CPR class even when no job requires it. Red Cross Adult and Pediatric First Aid/CPR/AED covers adults, children and infants in one class.",
      "Schools and employers in Camas and Washougal can book a class on-site. Washington's Department of Labor & Industries requires first-aid trained staff to be available at work (WAC 296-800-150), and coaches, teachers and child care staff are often asked to keep CPR current. Evan brings the manikins, AED trainers and supplies to your building, so a team can train together without driving into Vancouver. Healthcare and dental teams can book AHA BLS the same way.",
      "For a lifeguarding class, bring a swimsuit, towel and goggles, and arrive rested, since the swim test comes first. For CPR and first aid, bring a photo ID and wear clothes you can kneel in. Students from Fishers Landing and east Vancouver often find the Camas pool closer than a downtown venue, so check both when you compare dates.",
      "Every course is certified through the American Red Cross, the American Heart Association or HSI. Classes are small, eCards arrive the same day you pass, and cards are valid for two years. Price and length depend on the course, so check the schedule for the current details. Taylored Instruction's office is in downtown Vancouver, and you can call (360) 685-8199 from 9 AM to 7 PM any day with questions.",
    ],
    sessionCities: ["Camas", "Washougal"],
    nearby: ["vancouver-wa"],
    areaServed: ["Camas, WA", "Washougal, WA", "Clark County, WA"],
    courses: [
      COURSES.lifeguarding,
      COURSES["water-safety-instructor"],
      COURSES["first-aid-cpr-aed"],
      COURSES.heartsaver,
      COURSES.bls,
      COURSES["corporate-training"],
    ],
    faqs: [
      {
        question: "Where are lifeguard classes held in Camas?",
        answer:
          "Red Cross Lifeguarding classes in Camas meet at the Gold's Gym Camas pool, 2950 NW 38th Ave, Camas, WA 98607. Each class date lists its venue, since some lifeguarding classes meet at pools in Vancouver instead.",
      },
      {
        question: "What do I need to pass to start lifeguard training?",
        answer:
          "Red Cross Lifeguarding begins with a swim skills test on the first day. The Lifeguarding course page lists the exact prerequisites, so practice them before class.",
      },
      {
        question:
          "Can you teach CPR at a Camas or Washougal school or business?",
        answer:
          "Yes. Evan teaches CPR, first aid, BLS and lifeguarding on-site in Camas, Washougal and the rest of Clark County, with all equipment provided. Use the group training form to request a quote.",
      },
      {
        question: "How long is a lifeguard or CPR certification valid?",
        answer:
          "Red Cross and AHA certifications are valid for two years, and you get your eCard the same day you pass.",
      },
    ],
    schema: "service",
  },
  {
    slug: "san-luis-obispo-ca",
    city: "San Luis Obispo",
    state: "CA",
    title: "CPR Classes in San Luis Obispo, CA | Taylored Instruction",
    description:
      "Red Cross and AHA CPR, BLS, first aid and lifeguard classes in San Luis Obispo, CA on a seasonal schedule, plus group training on the Central Coast.",
    heading: "CPR, BLS and lifeguard classes in San Luis Obispo, CA",
    lede: "Evan Taylor goes to school in San Luis Obispo, so Taylored Instruction teaches on the Central Coast for part of the year. Public classes here run on a seasonal schedule rather than every week.",
    intro: [
      "The business is based in Vancouver, Washington, but its founder spends the school year in San Luis Obispo. When Evan is on the Central Coast, he schedules public classes and takes group bookings here. Dates are posted on the class schedule as soon as they are set, and any San Luis Obispo County date appears in the list on this page.",
      "The courses are the same national certifications taught in Washington. Taylored Instruction is an American Red Cross Licensed Training Provider, an American Heart Association Training Site through the Resuscitation Group, and an HSI Training Center. Evan is AHA Training Faculty and a Red Cross Instructor Trainer for Lifeguarding, Water Safety Instructor and First Aid/CPR/AED. Cards are valid for two years and eCards arrive the same day you pass.",
      "Pre-health students at Cal Poly and Cuesta College often need AHA BLS for clinical hours, shadowing or EMT coursework. Students who work at camps, gyms and child care programs usually need first aid and CPR instead. Lifeguard certification is the other common request. Pools, summer camps and swim programs across the county hire lifeguards and swim instructors before summer, so the Red Cross Lifeguarding and Water Safety Instructor courses are worth booking early.",
      "Groups can also book a private class. Evan teaches on-site for clubs, teams, schools, offices, clinics and aquatic programs in San Luis Obispo, Pismo Beach, Arroyo Grande, Morro Bay, Atascadero and Paso Robles, and brings the manikins and AED trainers. A group class is often the easiest option when no public date fits, because you pick the date. Classes stay small so everyone gets hands-on practice.",
      "Students who split the year between Washington and California can keep one card. AHA and Red Cross certifications are national, so a card from a San Luis Obispo class works in Vancouver and the other way around. Bring a photo ID and wear clothes you can kneel in. For lifeguarding, bring a swimsuit, towel and goggles.",
      "If you need a card before the next SLO date, check the full class schedule for blended options. Some courses, like HeartCode BLS, start with an online part you can finish anywhere before the in-person skills session. Price and length depend on the course, and each date shows the full price before you register. Call (360) 685-8199 from 9 AM to 7 PM, any day, or email info@tayloredinstruction.com to ask when the next Central Coast classes are planned.",
    ],
    sessionCities: [
      "San Luis Obispo",
      "Pismo Beach",
      "Arroyo Grande",
      "Grover Beach",
      "Morro Bay",
      "Los Osos",
      "Atascadero",
      "Paso Robles",
      "Avila Beach",
    ],
    nearby: [],
    areaServed: [
      "San Luis Obispo, CA",
      "San Luis Obispo County, CA",
      "Pismo Beach, CA",
      "Arroyo Grande, CA",
      "Morro Bay, CA",
      "Atascadero, CA",
      "Paso Robles, CA",
    ],
    courses: [
      COURSES.bls,
      COURSES["first-aid-cpr-aed"],
      COURSES.heartsaver,
      COURSES.lifeguarding,
      COURSES["water-safety-instructor"],
      COURSES["corporate-training"],
    ],
    faqs: [
      {
        question: "When are CPR classes held in San Luis Obispo?",
        answer:
          "San Luis Obispo classes run on a seasonal schedule while Evan Taylor is on the Central Coast. Dates appear on the class schedule as soon as they are set.",
      },
      {
        question: "Can I get AHA BLS in San Luis Obispo?",
        answer:
          "Yes, when a BLS date is scheduled. HeartCode BLS students can finish the online part ahead of time and then attend a shorter in-person skills session.",
      },
      {
        question: "Do you offer lifeguard certification in San Luis Obispo?",
        answer:
          "Yes. Red Cross Lifeguarding and Water Safety Instructor courses are taught on the Central Coast when a pool venue is booked. Pools and camps can also book a private class at their own facility.",
      },
      {
        question: "Can you teach a private class for our group in SLO County?",
        answer:
          "Yes. Evan teaches on-site for teams, clubs, schools and workplaces across San Luis Obispo County and brings the equipment. Request a quote through the group training form.",
      },
    ],
    schema: "service",
  },
];

export const locationPath = (location: CityPage) =>
  `${LOCATIONS_BASE_PATH}/${location.slug}`;

export const locationUrl = (location: CityPage) =>
  `${SITE_URL}${locationPath(location)}`;

export const locationName = (location: CityPage) =>
  `${location.city}, ${location.state}`;

export const findLocation = (slug: string) =>
  LOCATIONS.find((location) => location.slug === slug);

type Meeting = { start: number; location: string };

/** "Clark County Family YMCA: 11324 NE 51st Cir, Vancouver, WA 98682" → Vancouver, WA. */
export function sessionPlace(meetings: Meeting[]) {
  const first = [...meetings].sort((a, b) => a.start - b.start).at(0);
  const parts = parsePlace(first?.location ?? "")
    .address.split(",")
    .map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }
  return {
    city: parts.at(-2) ?? "",
    state: parts.at(-1)?.split(" ")[0] ?? "",
  };
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Upcoming classes whose first meeting is in one of the location's cities. */
export function sessionsIn<T extends { meetings: Meeting[] }>(
  location: CityPage,
  sessions: T[]
) {
  return sessions.filter((session) => {
    const place = sessionPlace(session.meetings);
    return (
      place !== null &&
      sameName(place.state, location.state) &&
      location.sessionCities.some((city) => sameName(city, place.city))
    );
  });
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function placeSchema(location: CityPage) {
  const url = locationUrl(location);
  if (location.schema === "service") {
    return getServiceSchema({
      name: `CPR and first aid training in ${locationName(location)}`,
      description: location.description,
      path: locationPath(location),
      serviceType: "CPR, BLS, first aid and lifeguard certification training",
      areaServed: location.areaServed,
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#vancouver-wa`,
    name: "Taylored Instruction",
    url,
    image: `${SITE_URL}/og-image.png`,
    telephone: CONTACT.telephone,
    email: CONTACT.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: COLAB_ADDRESS.streetAddress,
      addressLocality: COLAB_ADDRESS.addressLocality,
      addressRegion: COLAB_ADDRESS.addressRegion,
      postalCode: COLAB_ADDRESS.postalCode,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: COLAB_ADDRESS.latitude,
      longitude: COLAB_ADDRESS.longitude,
    },
    areaServed: location.areaServed.map((name) => ({
      "@type": "AdministrativeArea",
      name,
    })),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAYS,
      opens: "09:00",
      closes: "19:00",
    },
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
  };
}

/** WebPage, breadcrumb, FAQ and the local business or service node for one city page. */
export function locationSchemas(location: CityPage) {
  const url = locationUrl(location);
  return [
    getWebPageSchema({
      name: location.title,
      description: location.description,
      path: locationPath(location),
    }),
    getBreadcrumbSchema([
      { name: "Home", url: SITE_URL },
      { name: "Classes", url: `${SITE_URL}/classes` },
      { name: locationName(location), url },
    ]),
    getFAQSchema(location.faqs),
    placeSchema(location),
  ];
}
