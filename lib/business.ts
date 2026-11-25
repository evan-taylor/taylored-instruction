import { SUPPORT_EMAIL } from "../shared/email";

const SITE_URL = "https://tayloredinstruction.com";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const ACCREDITATION_PHRASE =
  "Red Cross Licensed Training Provider, AHA Training Site and HSI Training Center";

export const ACCREDITATION_SHORT = "Red Cross, AHA & HSI training provider";

export const BUSINESS = {
  name: "Taylored Instruction",
  legalName: "Taylored Instruction LLC",
  url: SITE_URL,
  logoUrl: `${SITE_URL}/horizontal-logo-black.png`,
  imageUrl: `${SITE_URL}/og-image.png`,
  foundingYear: "2023",
  phone: {
    display: "(360) 685-8199",
    href: "tel:+13606858199",
    schema: "+1-360-685-8199",
  },
  email: SUPPORT_EMAIL,
  address: {
    placeName: "CoLab Coworking",
    streetAddress: "915 Broadway St #100",
    locality: "Vancouver",
    region: "WA",
    postalCode: "98660",
    country: "US",
  },
  geo: { latitude: 45.6284, longitude: -122.6701 },
  hours: {
    days: WEEKDAYS,
    opens: "09:00",
    closes: "19:00",
    display: "9 AM–7 PM, 7 days a week",
  },
  serviceArea: [
    { type: "City", name: "Vancouver, WA" },
    { type: "City", name: "Camas, WA" },
    { type: "City", name: "Portland, OR" },
    { type: "City", name: "San Luis Obispo, CA" },
    { type: "AdministrativeArea", name: "Clark County, WA" },
  ],
  googleBusinessProfileUrl:
    "https://www.google.com/maps/place/?q=place_id:ChIJ649LB-AFjq8R6oVJiLxutTc",
  socials: {
    facebook: "https://www.facebook.com/tayloredinstruction.us",
    instagram: "https://www.instagram.com/taylored.instruction/",
  },
  accreditations: [
    {
      name: "American Red Cross Licensed Training Provider",
      recognizedBy: {
        name: "American Red Cross",
        url: "https://www.redcross.org",
      },
    },
    {
      name: "American Heart Association Training Site, aligned with the Resuscitation Group",
      recognizedBy: {
        name: "American Heart Association",
        url: "https://www.heart.org",
      },
    },
    {
      name: "HSI Training Center",
      recognizedBy: {
        name: "Health & Safety Institute",
        url: "https://hsi.com",
      },
    },
  ],
  founder: {
    name: "Evan Taylor",
    jobTitle: "Owner and Instructor Trainer",
    imageUrl: `${SITE_URL}/headshot.jpg`,
    credentials: [
      {
        name: "AHA Training Faculty",
        recognizedBy: "American Heart Association",
      },
      {
        name: "Red Cross Lifeguarding Instructor Trainer",
        recognizedBy: "American Red Cross",
      },
      {
        name: "Red Cross Water Safety Instructor Trainer",
        recognizedBy: "American Red Cross",
      },
      {
        name: "Red Cross First Aid/CPR/AED Instructor Trainer",
        recognizedBy: "American Red Cross",
      },
    ],
  },
} as const;

export const BUSINESS_SAME_AS = [
  BUSINESS.googleBusinessProfileUrl,
  BUSINESS.socials.facebook,
  BUSINESS.socials.instagram,
];

export const formatBusinessAddress = () => {
  const { streetAddress, locality, region, postalCode } = BUSINESS.address;
  return `${streetAddress}, ${locality}, ${region} ${postalCode}`;
};

/**
 * Google's write-a-review form for the Business Profile above. Post-class
 * emails link to it; set it to null to drop the review request.
 */
export const GOOGLE_REVIEW_URL: string | null =
  "https://search.google.com/local/writereview?placeid=ChIJ649LB-AFjq8R6oVJiLxutTc";
