import Image from 'next/image'
import Link from 'next/link'
import { FaEnvelope, FaPhone } from 'react-icons/fa' // Import icons
import { Button } from '@/components/ui/Button' // Import the Button component
import type { Metadata } from 'next'

// --- Page Metadata ---
export const metadata: Metadata = {
  title: 'About Taylored Instruction | CPR, Lifeguard & Safety Training Vancouver WA',
  description: 'Learn about Taylored Instruction, our mission, and founder Evan Taylor. We provide expert CPR, Lifeguard, First Aid, and BLS training in Vancouver, WA, and seasonally in San Luis Obispo, CA.',
  keywords: [
    'About Taylored Instruction',
    'Evan Taylor CPR instructor',
    'Lifesaving skills training Vancouver WA',
    'CPR classes San Luis Obispo',
    'Red Cross Licensed Training Provider',
    'AHA Training Site Vancouver WA',
    'HSI Training Center',
    'Water Safety Instructor Vancouver WA',
    'Adaptive swim lessons',
    'Taylored Instruction mission',
    'CPR training Clark County'
  ],
  openGraph: {
    title: 'About Taylored Instruction | CPR, Lifeguard & Safety Training Vancouver WA',
    description: 'Learn about Taylored Instruction, our mission, and founder Evan Taylor. We provide expert CPR, Lifeguard, First Aid, and BLS training in Vancouver, WA, and seasonally in San Luis Obispo, CA.',
    url: 'https://tayloredinstruction.com/about',
    siteName: 'Taylored Instruction',
    type: 'website',
    images: [
      {
        url: '/og-image.png', // To be created - consider a team/founder image or branded graphic
        width: 1200,
        height: 630,
        alt: 'About Taylored Instruction - Lifesaving Training',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Taylored Instruction | CPR, Lifeguard & Safety Training Vancouver WA',
    description: 'Learn about Taylored Instruction, our mission, and founder Evan Taylor. We provide expert CPR, Lifeguard, First Aid, and BLS training in Vancouver, WA, and seasonally in San Luis Obispo, CA.',
    images: ['/twitter-image.png'], // To be created
  },
  alternates: {
    canonical: 'https://tayloredinstruction.com/about',
  }
}

// --- Page Component ---
export default function AboutPage() {
  return (
    <>
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[500px] md:min-h-[550px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/Vancouver-Washington-Stock-Photo-scaled.jpeg"
            alt="CPR training in action"
            fill
            sizes="100vw"
            style={{objectFit: 'cover', objectPosition: 'center'}}
            className="brightness-[0.85]"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50 z-10"></div>
        <div className="relative z-20 container mx-auto px-6 py-20 text-center">
          <div className="bg-black/30 backdrop-blur-sm p-8 md:p-10 rounded-xl max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">About Taylored Instruction</h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Dedicated to providing high-quality, accessible lifesaving skills training to the Vancouver, WA community and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          
          {/* Two-column Main Content Layout for Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Left Column */}
            <div>
              {/* Where did we come from? Section */}
              <div className="mb-12 bg-gray-50 p-8 rounded-lg shadow-sm">
                <h2 className="text-3xl font-semibold mb-6 text-text">Where Did We Come From?</h2>
                <p className="mb-6 text-text-light">
                  Taylored Instruction was founded in 2023 by Evan Taylor. We are based in Vancouver, Washington. Evan has been teaching swimming lessons since 2020 and has been a certified American Red Cross Instructor since 2023, and a First Aid/CPR/AED Instructor Trainer since 2024. He has taught swimming lessons to all ages and skill levels and teaches American Red Cross Lifeguarding, CPR, and First Aid classes.
                </p>
                <p className="text-text-light">
                  Evan goes to school in San Luis Obispo, CA, so we teach classes seasonally on the Central Coast. <Link href="/contact" className="text-primary hover:underline">Get in touch</Link> with us to learn more!
                </p>
              </div>
              
              {/* Meet Our Instructors Section */}
              <div className="mb-12 bg-gray-50 p-8 rounded-lg shadow-sm">
                <h2 className="text-3xl font-semibold mb-6 text-text text-center">Meet Our Instructors</h2>
                <div className="text-center">
                  <div className="relative w-40 h-40 mx-auto mb-4 rounded-full overflow-hidden shadow-lg border-4 border-primary">
                    <Image 
                      src="/headshot.png" 
                      alt="Headshot of Evan Taylor, owner" 
                      fill
                      sizes="100vw" 
                      style={{objectFit: 'cover'}}
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-1 text-text">Evan Taylor</h3>
                  <p className="text-text-light mb-3">Owner, Instructor Trainer</p>
                  <div className="flex justify-center space-x-4">
                    <a href="mailto:evan@tayloredinstruction.com" aria-label="Email Evan Taylor" className="text-gray-500 hover:text-primary transition-colors duration-200">
                      <FaEnvelope size={20} />
                    </a>
                    <a href="tel:3602071844" aria-label="Call Evan Taylor" className="text-gray-500 hover:text-primary transition-colors duration-200">
                      <FaPhone size={20} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div>
              {/* Our Mission Section */}
              <div className="mb-12 bg-gray-50 p-8 rounded-lg shadow-sm">
                <h2 className="text-3xl font-semibold mb-4 text-text">Our Mission</h2>
                <p className="text-lg text-text-light">
                  Our mission is to teach lifesaving skills to all, with the hope that we can save a life. We are dedicated to providing the highest quality swimming lessons, lifeguard training, and CPR training to our community in order to empower people of all ages and give them the skills necessary to save lives.
                </p>
              </div>
              
              {/* What We Teach Section */}
              <div className="mb-12 bg-gray-50 p-8 rounded-lg shadow-sm">
                <h2 className="text-3xl font-semibold mb-6 text-text">What We Teach</h2>
                <p className="text-text-light mb-4">Our instructors hold the following certifications:</p>
                <ul className="list-disc list-inside space-y-2 mb-6 text-text-light">
                  <li>American Red Cross Lifeguard Instructor</li>
                  <li>American Heart Association Basic Life Support Instructor</li>
                  <li>American Red Cross First Aid/CPR/AED Instructor Trainer</li>
                  <li>American Red Cross Water Safety Instructor™</li>
                  <li>American Red Cross Basic Life Support Instructor</li>
                  <li>American Red Cross Babysitter's Training Instructor</li>
                  <li>Swim Angelfish® Adaptive Swim Whisperer</li>
                </ul>
                <p className="text-text-light">
                  We are an authorized American Red Cross Licensed Training Provider, American Heart Association Training Site (Aligned with Resuscitation Group), and HSI Training Center.
                </p>
              </div>
            </div>
          </div>
          
          {/* Logos Section - Full Width */}
          <div className="mt-8 mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center justify-items-center gap-8 md:gap-12 max-w-4xl mx-auto">
              <div className="flex justify-center p-4 bg-gray-50 rounded-lg w-full sm:w-auto max-w-[370px]">
                <Image
                  src="/licensed-training-provider.jpeg"
                  alt="American Red Cross Licensed Training Provider"
                  width={369}
                  height={156}
                  className="h-auto w-full object-contain"
                />
              </div>
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg w-full sm:w-auto max-w-[220px]">
                <Image
                  src="/TS_English_CMYK_rk-2020.png"
                  alt="Resuscitation Group Logo (AHA TC Alignment)"
                  width={180}
                  height={180}
                  className="h-auto w-full object-contain"
                />
                <p className="text-xs text-center mt-2 text-text-light">
                  Aligned with Resuscitation Group in Vancouver, WA USA
                </p>
              </div>
              <div className="flex justify-center p-4 bg-gray-50 rounded-lg w-full sm:w-auto max-w-[410px]">
                <Image
                  src="/HSI_Approved-Training-Center-TC_Horizontal.png"
                  alt="HSI Approved Training Center"
                  width={408}
                  height={127}
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Final CTA - Full Width */}
          <div className="text-center border-t border-gray-200 pt-12">
             <h3 className="text-2xl font-semibold mb-4 text-text">Interested in something else?</h3>
             <p className="mb-6 text-text-light">
               Let us know how we can help you by contacting us today!
             </p>
             <Link href="/contact">
                <Button variant="primary" size="lg">Contact Us</Button>
             </Link>
          </div>

        </div>
      </section>
    </>
  )
} 