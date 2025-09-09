import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title:
    "Red Cross Lifeguarding Instructor Trainer | Vancouver, WA & San Luis Obispo",
  description:
    "American Red Cross Lifeguarding Instructor Trainer available to travel for on-site Lifeguarding Instructor courses. Serving Vancouver, WA; San Luis Obispo, CA; and surrounding areas.",
  keywords: [
    "Lifeguarding Instructor Trainer",
    "Red Cross Instructor Trainer",
    "Lifeguard Instructor Trainer Vancouver WA",
    "Lifeguard Instructor Trainer San Luis Obispo",
    "On-site lifeguard instructor training",
    "Aquatic safety training for facilities",
    "University lifeguard instructor course",
  ],
  openGraph: {
    title:
      "Red Cross Lifeguarding Instructor Trainer | Vancouver, WA & San Luis Obispo",
    description:
      "ARC Lifeguarding Instructor Trainer available to travel for on-site Lifeguarding Instructor courses. Serving Vancouver, WA; San Luis Obispo, CA; and surrounding areas.",
    url: "https://tayloredinstruction.com/lifeguarding-instructor-trainer/",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Instructor Trainer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Red Cross Lifeguarding Instructor Trainer | Vancouver, WA & San Luis Obispo",
    description:
      "ARC Lifeguarding Instructor Trainer available to travel for on-site Lifeguarding Instructor courses.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical:
      "https://www.tayloredinstruction.com/lifeguarding-instructor-trainer/",
  },
};

export default function Page() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 font-bold text-3xl md:text-4xl">
        Red Cross Lifeguarding Instructor Trainer — Vancouver, WA & San Luis
        Obispo
      </h1>
      <p className="mb-6 text-gray-700">
        As a certified American Red Cross Lifeguarding Instructor Trainer, I
        prepare and authorize Lifeguarding Instructors to teach Red Cross
        Lifeguarding courses. I offer on-site instructor academies and private
        trainings for aquatic facilities, universities, municipalities, camps,
        and organizations seeking to build or expand their instructor teams.
      </p>

      <div className="mb-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold text-xl">Available to Travel</h2>
          <p className="text-gray-700">
            I can travel to your location to deliver Lifeguarding Instructor
            courses. Whether you need to certify a small cohort or a full staff,
            we can tailor a schedule that fits your operational needs.
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-xl">Who We Serve</h2>
          <ul className="list-disc space-y-2 pl-5 text-gray-700">
            <li>Pools and aquatic centers</li>
            <li>City/municipal aquatics programs</li>
            <li>Universities and K-12 districts</li>
            <li>Resorts, hotels, and private clubs</li>
            <li>Camps and community organizations</li>
          </ul>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-3 font-semibold text-xl">Primary Service Areas</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">
              Vancouver, Washington (and surrounding)
            </h3>
            <p className="text-gray-700 text-sm">
              Vancouver, Camas, Washougal, Ridgefield, Battle Ground, Salmon
              Creek, Felida, Hazel Dell, and the greater Portland metro
              (Portland, Beaverton, Hillsboro, Gresham, Lake Oswego).
            </p>
          </div>
          <div>
            <h3 className="font-semibold">
              San Luis Obispo, California (and surrounding)
            </h3>
            <p className="text-gray-700 text-sm">
              San Luis Obispo, Paso Robles, Atascadero, Pismo Beach, Arroyo
              Grande, Grover Beach, Morro Bay, Templeton, and nearby communities
              including Santa Maria and Lompoc.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-10 rounded-lg p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-xl">
          Why Work With an Instructor Trainer
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-gray-700">
          <li>
            Courses follow American Red Cross standards and administrative
            guidance
          </li>
          <li>
            Efficient pathway to develop in-house Lifeguarding Instructor
            capacity
          </li>
          <li>
            Flexible scheduling for seasonal ramp-up and staff onboarding
            timelines
          </li>
        </ul>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button href="/contact" size="lg">
          Request an On-Site Course
        </Button>
        <Button
          href="https://www.hovn.app/tayloredinstruction"
          size="lg"
          target="_blank"
          variant="secondary"
        >
          View Public Offerings
        </Button>
      </div>

      <p className="mt-8 text-gray-500 text-xs">
        Note: All training is delivered in alignment with the American Red Cross
        Lifeguarding program.
      </p>
    </div>
  );
}
