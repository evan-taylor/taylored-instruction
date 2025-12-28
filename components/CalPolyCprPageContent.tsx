import Image from "next/image";
import Link from "next/link";

export default function CalPolyCprPageContent() {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[550px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="CPR Training Session"
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
              CPR Classes for Cal Poly SLO Students
            </h1>
            <p className="text-lg text-white/90 md:text-xl">
              American Heart Association BLS &amp; American Red Cross CPR
              Certification
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="mb-4 font-semibold text-3xl">
              CPR Training for Cal Poly Students
            </h2>
            <p>
              Are you a Cal Poly San Luis Obispo student looking for CPR
              certification? Whether you need it for your major, a campus job,
              clinical requirements, or just want to be prepared for
              emergencies, we offer convenient CPR and BLS classes right here in
              San Luis Obispo.
            </p>
            <p>
              As a fellow Cal Poly student and certified instructor, I
              understand your busy schedule and budget constraints. That&apos;s
              why I offer flexible class times and student-friendly pricing for
              all Cal Poly students.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">Courses Offered</h2>
            <div className="space-y-6">
              <div className="rounded-lg bg-gray-50 p-6 shadow-sm">
                <h3 className="mb-3 font-bold text-xl">
                  American Heart Association BLS (Basic Life Support)
                </h3>
                <p className="mb-3 text-gray-700">
                  The AHA BLS course is designed for healthcare professionals
                  and students in healthcare-related programs. This is the
                  certification required for nursing students, kinesiology
                  majors, pre-med students, and anyone pursuing a career in
                  healthcare.
                </p>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>High-quality CPR for adults, children, and infants</li>
                  <li>AED usage and team dynamics</li>
                  <li>Relief of choking</li>
                  <li>2-year certification</li>
                </ul>
                <p className="mt-3 text-gray-700">
                  <strong>Duration:</strong> ~4 hours in-person or ~2 hours for
                  blended learning
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-6 shadow-sm">
                <h3 className="mb-3 font-bold text-xl">
                  American Red Cross CPR/AED
                </h3>
                <p className="mb-3 text-gray-700">
                  The Red Cross Adult and Pediatric First Aid/CPR/AED course is
                  perfect for students who need general CPR certification for
                  campus jobs, volunteer work, or personal preparedness.
                </p>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>CPR and AED for adults, children, and infants</li>
                  <li>First aid basics</li>
                  <li>Choking relief</li>
                  <li>2-year certification</li>
                </ul>
                <p className="mt-3 text-gray-700">
                  <strong>Duration:</strong> ~2 hours online + ~3 hours
                  in-person skills session
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">
              Why Choose Us for Your CPR Class?
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Local to SLO:</strong> Classes held conveniently in San
                Luis Obispo
              </li>
              <li>
                <strong>Flexible Scheduling:</strong> Weekend and evening
                classes available to fit your class schedule
              </li>
              <li>
                <strong>Student-Friendly:</strong> As a Cal Poly student myself,
                I understand your needs
              </li>
              <li>
                <strong>Nationally Recognized:</strong> AHA and Red Cross
                certifications accepted everywhere
              </li>
              <li>
                <strong>Same-Day Certification:</strong> Receive your digital
                certification card immediately upon completion
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">
              Who Needs CPR Certification at Cal Poly?
            </h2>
            <p>Many Cal Poly students need CPR certification, including:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Nursing and pre-nursing students</li>
              <li>Kinesiology majors</li>
              <li>Pre-med and pre-health students</li>
              <li>Education majors (especially for student teaching)</li>
              <li>Recreation, Parks, &amp; Tourism Administration students</li>
              <li>Campus recreation employees and lifeguards</li>
              <li>Resident Advisors (RAs)</li>
              <li>Club sports coaches and trainers</li>
              <li>Anyone wanting to be prepared for emergencies</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  Which certification do I need?
                </h3>
                <p>
                  If you&apos;re in a healthcare program (nursing, kinesiology,
                  pre-med), you likely need AHA BLS. For most other purposes,
                  Red Cross CPR/AED is sufficient. Check with your program
                  advisor if you&apos;re unsure.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  How long is the certification valid?
                </h3>
                <p>
                  Both AHA BLS and Red Cross CPR/AED certifications are valid
                  for 2 years from the date of completion.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  Where are classes held?
                </h3>
                <p>
                  Classes are held at various locations in San Luis Obispo,
                  convenient to the Cal Poly campus. Specific location details
                  are provided upon registration.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  What should I bring to class?
                </h3>
                <p>
                  Bring a valid photo ID, wear comfortable clothing that allows
                  you to kneel on the floor, and if taking a blended course,
                  bring your online completion certificate.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-primary/10 p-6">
            <h2 className="mb-4 font-semibold text-3xl">
              Ready to Get Certified?
            </h2>
            <p className="mb-4">
              Contact me to schedule your CPR class or to ask any questions
              about which certification is right for you.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary/90"
                href="mailto:etaylo28@calpoly.edu"
              >
                Email: etaylo28@calpoly.edu
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-md border border-primary bg-white px-6 py-3 font-medium text-primary transition-colors hover:bg-primary/5"
                href="/bls"
              >
                View BLS Course Details
              </Link>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">Other Courses</h2>
            <p>
              In addition to CPR classes, I also offer other certifications that
              may be useful for Cal Poly students:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>
                <Link
                  className="font-medium text-primary hover:underline"
                  href="/lifeguarding"
                >
                  Lifeguarding Certification
                </Link>{" "}
                - Great for summer jobs at pools and beaches
              </li>
              <li>
                <Link
                  className="font-medium text-primary hover:underline"
                  href="/first-aid-cpr-aed"
                >
                  First Aid/CPR/AED
                </Link>{" "}
                - Comprehensive first aid training
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
