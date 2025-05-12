'use client'

import { Button } from "@/components/ui/Button";
import Image from "next/image";

export default function BlsPageContent() {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[500px] md:min-h-[550px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/CPR-Training-Stock-Photo-1-scaled.jpeg" // Preserving original image
            alt="CPR Training Session"
            fill
            sizes="100vw"
            style={{objectFit: 'cover', objectPosition: '20% 51%'}}
            className="brightness-[0.85]"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50 z-10"></div>
        <div className="relative z-20 container mx-auto px-6 py-20 text-center">
          <div className="bg-black/30 backdrop-blur-sm p-8 md:p-10 rounded-xl max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              American Heart Association Basic Life Support
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="prose prose-lg max-w-none space-y-8">

          <section>
            <h2 className="text-3xl font-semibold mb-4">Course Overview</h2>
            <p>
              Our American Heart Association (AHA) Basic Life Support (BLS) course is designed for healthcare professionals and first responders (though anyone is welcome!) who need to know how to perform CPR and other basic cardiovascular life support skills. In this comprehensive training, you'll learn high-quality CPR for adults, children, and infants, how to use an AED effectively, and essential skills for recognizing and responding to life-threatening emergencies.
            </p>
            <p><strong className="font-semibold">Duration:</strong> Approximately 4 hours for in-person, or 2 hours for blended learning</p>
            <p><strong className="font-semibold">Audience:</strong> Healthcare providers, first responders, and anyone required to have BLS certification as part of their job or studies.</p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Learning Objectives</h2>
            <p>By the end of this course, participants will be able to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Perform high-quality CPR for adults, children, and infants</li>
              <li>Use an AED effectively and promptly</li>
              <li>Relieve choking in various age groups</li>
              <li>Recognize life-threatening emergencies and take action</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Certification Details</h2>
            <p>
              Upon successful completion, participants will receive an AHA BLS Provider eCard, valid for two years. To pass, attendees must demonstrate their skills and pass a written test.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Course Options</h2>
            <p>We offer:</p>
            <ul className="list-disc pl-6 space-y-2">
               <li><strong className="font-semibold">In-person Training:</strong> Complete all course components in one session.</li>
               <li><strong className="font-semibold">Blended Learning:</strong> Complete part of the course online at your own pace, followed by an in-person skills session.</li>
            </ul>
             <div className="mt-8 text-center">
               <Button variant="primary" size="lg">
                 <a href="https://www.hovn.app/service-providers/tayloredinstruction/offerings/cm408oymc0000a5ec7y5ua8g3" target="_blank" rel="noopener noreferrer">
                    View Current Offerings
                 </a>
               </Button>
             </div>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Frequently Asked Questions (FAQ)</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Who needs a BLS certification?</h3>
                <p>
                  BLS certification is essential for healthcare providers, nursing and medical students, first responders, and anyone needing basic life support knowledge for their career or studies.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">How long is the course?</h3>
                <p>
                  The in-person course typically takes around 4 hours, including breaks and hands-on skills practice.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Are there any prerequisites?</h3>
                <p>
                  There are no prerequisites to take this course. Prior CPR knowledge can be helpful but is not required.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">What do I need to bring?</h3>
                <p>
                  Please bring a valid photo ID, comfortable clothing for practice sessions, and your completion certificate (if taking a blended learning class). All course materials will be provided.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">How do I renew my certification?</h3>
                <p>
                   BLS certification is valid for two years. You can renew your certification by taking an AHA BLS Renewal course.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
} 