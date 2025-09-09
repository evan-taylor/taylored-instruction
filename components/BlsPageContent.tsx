import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function BlsPageContent() {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[550px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="CPR Training Session" // Preserving original image
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/CPR-Training-Stock-Photo-1-scaled.jpeg"
            style={{ objectFit: "cover", objectPosition: "20% 51%" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl">
              American Heart Association Basic Life Support
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="mb-4 font-semibold text-3xl">Course Overview</h2>
            <p>
              Our American Heart Association (AHA) Basic Life Support (BLS)
              course is designed for healthcare professionals and first
              responders (though anyone is welcome!) who need to know how to
              perform CPR and other basic cardiovascular life support skills. In
              this comprehensive training, you&apos;ll learn high-quality CPR
              for adults, children, and infants, how to use an AED effectively,
              and essential skills for recognizing and responding to
              life-threatening emergencies.
            </p>
            <p>
              <strong className="font-semibold">Duration:</strong> Approximately
              4 hours for in-person, or 2 hours for blended learning
            </p>
            <p>
              <strong className="font-semibold">Audience:</strong> Healthcare
              providers, first responders, and anyone required to have BLS
              certification as part of their job or studies.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">Learning Objectives</h2>
            <p>By the end of this course, participants will be able to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Perform high-quality CPR for adults, children, and infants
              </li>
              <li>Use an AED effectively and promptly</li>
              <li>Relieve choking in various age groups</li>
              <li>Recognize life-threatening emergencies and take action</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">
              Certification Details
            </h2>
            <p>
              Upon successful completion, participants will receive an AHA BLS
              Provider eCard, valid for two years. To pass, attendees must
              demonstrate their skills and pass a written test.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">Course Options</h2>
            <p>We offer:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="font-semibold">In-person Training:</strong>{" "}
                Complete all course components in one session.
              </li>
              <li>
                <strong className="font-semibold">Blended Learning:</strong>{" "}
                Complete part of the course online at your own pace, followed by
                an in-person skills session.
              </li>
            </ul>
            <div className="mt-8 text-center">
              <Button size="lg" variant="primary">
                <a
                  href="https://www.hovn.app/tayloredinstruction/certifications/aha-bls-provider"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View Current Offerings
                </a>
              </Button>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">
              Frequently Asked Questions (FAQ)
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  Who needs a BLS certification?
                </h3>
                <p>
                  BLS certification is essential for healthcare providers,
                  nursing and medical students, first responders, and anyone
                  needing basic life support knowledge for their career or
                  studies.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  How long is the course?
                </h3>
                <p>
                  The in-person course typically takes around 4 hours, including
                  breaks and hands-on skills practice.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  Are there any prerequisites?
                </h3>
                <p>
                  There are no prerequisites to take this course. Prior CPR
                  knowledge can be helpful but is not required.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  What do I need to bring?
                </h3>
                <p>
                  Please bring a valid photo ID, comfortable clothing for
                  practice sessions, and your completion certificate (if taking
                  a blended learning class). All course materials will be
                  provided.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  How do I renew my certification?
                </h3>
                <p>
                  BLS certification is valid for two years. You can renew your
                  certification by taking an AHA BLS Renewal course.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
