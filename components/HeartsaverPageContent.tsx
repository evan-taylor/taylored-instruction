'use client'

import { Button } from "@/components/ui/Button";
import Image from "next/image";

export default function HeartsaverPageContent() {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[500px] md:min-h-[550px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/CPR-stock-photo-scaled.jpeg"
            alt="CPR Training Photo"
            fill
            sizes="100vw"
            style={{objectFit: 'cover', objectPosition: '54% 66%'}}
            className="brightness-[0.85]"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50 z-10"></div>
        <div className="relative z-20 container mx-auto px-6 py-20 text-center">
          <div className="bg-black/30 backdrop-blur-sm p-8 md:p-10 rounded-xl max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              American Heart Association Heartsaver® First Aid CPR AED
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Using prose for typography similar to BLS page */}
        <div className="prose prose-lg max-w-none space-y-8">

          <section>
            <h2 className="text-3xl font-semibold mb-4">Course Overview</h2>
            <p>
              The American Heart Association (AHA) Heartsaver® courses are designed for anyone with little or no medical training who needs CPR, AED, and first aid knowledge to meet job, regulatory, or personal requirements. This user-friendly course covers essential lifesaving skills and is perfect for workplace training or personal preparedness. You'll learn CPR for adults, children, and infants, proper AED use, and how to manage common first aid scenarios.
            </p>
            <p><strong className="font-semibold">Duration:</strong> Approximately 4 hours for in-person, or 1-2 hours for blended learning.</p>
            <p><strong className="font-semibold">Audience:</strong> Ideal for teachers, coaches, daycare providers, construction workers, fitness trainers, and anyone who wants to be prepared for an emergency.</p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Learning Objectives</h2>
            <p>By the end of this course, participants will be able to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Perform high-quality CPR for adults, children, and infants.</li>
              <li>Use an AED effectively and confidently.</li>
              <li>Manage choking emergencies in various age groups.</li>
              <li>Provide first aid for common injuries, including cuts, burns, sprains, and more.</li>
              <li>Recognize and respond to medical emergencies like heart attacks, strokes, and diabetic episodes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Certification Details</h2>
            <p>
              Upon successful completion of the course, participants will receive an AHA Heartsaver® certification eCard, valid for two years. To pass, participants must demonstrate the required skills during hands-on practice and pass a brief knowledge check.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Course Options</h2>
            <p>We offer the following formats:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="font-semibold">In-person Training:</strong> A single, comprehensive session that includes all components of the course.</li>
              <li><strong className="font-semibold">Blended Learning:</strong> Complete the knowledge portion online at your own pace, followed by an in-person skills session to practice and demonstrate what you've learned.</li>
            </ul>
             {/* Found button link in HTML */}
             <div className="mt-8 text-center">
               <Button variant="primary" size="lg">
                 <a href="https://www.hovn.app/service-providers/tayloredinstruction/offerings/cm40jlexf00006v85ucvlex3o" target="_blank" rel="noopener noreferrer">
                    View Current Offerings
                 </a>
               </Button>
             </div>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Frequently Asked Questions (FAQ)</h2>
            {/* Replicating FAQ structure from HTML */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Who should take a Heartsaver® course?</h3>
                <p>
                  Anyone who needs basic CPR, AED, and first aid knowledge, whether for work, school, or personal preparedness. This course is great for people with no prior experience.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">How long does the course take?</h3>
                <p>
                   The course typically lasts <strong>4 hours in-person</strong> or <strong>1-2 hours for blended learning</strong> (with additional online coursework).
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Are there any prerequisites?</h3>
                <p>
                  No prior experience or medical knowledge is required to enroll in a Heartsaver® course.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">What should I bring to the class?</h3>
                <p>
                  Bring a valid photo ID, wear comfortable clothing suitable for practice, and if applicable, bring your online completion certificate for blended learning. All training materials will be provided.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">How do I renew my certification?</h3>
                <p>
                   Heartsaver® certifications are valid for two years. You can renew by taking another Heartsaver course!
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
} 