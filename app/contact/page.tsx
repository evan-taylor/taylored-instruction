import Image from 'next/image'
import Link from 'next/link'
import { FaPhone, FaEnvelope } from 'react-icons/fa'
import type { Metadata } from 'next'
import { ContactForm } from '@/components/ContactForm' // Placeholder for the form component

// --- Page Metadata ---
export const metadata: Metadata = {
  title: 'Contact Taylored Instruction | CPR & Safety Training Vancouver WA',
  description: 'Contact Taylored Instruction in Vancouver, WA for inquiries about CPR, Lifeguard, BLS, First Aid, and other safety training courses. We are here to help!',
  keywords: [
    'Contact Taylored Instruction',
    'Taylored Instruction phone number',
    'Taylored Instruction email',
    'CPR training inquiry Vancouver WA',
    'Lifeguard course questions Vancouver WA',
    'Safety training support',
    'Vancouver WA CPR contact',
    'Get in touch Taylored Instruction',
    'BLS course contact',
    'First Aid training contact'
  ],
  openGraph: {
    title: 'Contact Taylored Instruction | CPR & Safety Training Vancouver WA',
    description: 'Contact Taylored Instruction in Vancouver, WA for inquiries about CPR, Lifeguard, BLS, First Aid, and other safety training courses.',
    url: 'https://tayloredinstruction.com/contact',
    siteName: 'Taylored Instruction',
    type: 'website',
    images: [
      {
        url: '/og-image.png', // To be created - consider a general contact/branded image
        width: 1200,
        height: 630,
        alt: 'Contact Taylored Instruction',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Taylored Instruction | CPR & Safety Training Vancouver WA',
    description: 'Contact Taylored Instruction in Vancouver, WA for inquiries about CPR, Lifeguard, BLS, First Aid, and other safety training courses.',
    images: ['/twitter-image.png'], // To be created
  },
  alternates: {
    canonical: 'https://tayloredinstruction.com/contact',
  }
}

// --- Page Component ---
export default function ContactPage() {
  return (
    <>
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[400px] md:min-h-[500px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/life-buoy-1.jpeg"
            alt="Lifesaving equipment"
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">Contact Us</h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Have a question, or want to learn more? We're here to help!
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            {/* Form Column (2/3 width on desktop) */}
            <div className="md:col-span-2">
              <h2 className="text-3xl font-semibold mb-6 text-text">Send Us a Message</h2>
              {/* Contact Form Component will go here */}
              <ContactForm />
            </div>

            {/* Contact Info Column (1/3 width on desktop) */}
            <div className="md:col-span-1">
              <h2 className="text-3xl font-semibold mb-6 text-center text-text">Contact Information</h2>
              <div className="text-center bg-gray-50 p-6 rounded-lg shadow-sm">
                 <div className="relative w-36 h-36 mx-auto mb-4 rounded-full overflow-hidden shadow-lg border-4 border-primary">
                    <Image
                      src="/headshot.png" // Assuming same headshot as About page
                      alt="Headshot of Evan Taylor, owner"
                      layout="fill"
                      objectFit="cover"
                    />
                 </div>
                 <h3 className="text-xl font-semibold mb-1 text-text">Evan Taylor</h3>
                 <p className="text-text-light mb-4">Owner, Instructor Trainer</p>

                 <div className="space-y-3 text-left text-text-light">
                   <p className="flex items-center justify-center">
                     <FaPhone className="mr-2 text-primary" />
                     <a href="tel:3602071844" className="hover:text-primary">(360) 207-1844</a>
                   </p>
                    <p className="flex items-center justify-center">
                     <FaEnvelope className="mr-2 text-primary" />
                     <a href="mailto:evan@tayloredinstruction.com" className="hover:text-primary break-all">evan@tayloredinstruction.com</a>
                   </p>
                 </div>

                 <p className="mt-6 text-sm text-text-light">
                    For class registration, please visit our registration portal:
                 </p>
                 <Link href="https://www.hovn.app/tayloredinstruction" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-primary hover:underline font-medium">
                    Register for Classes
                 </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
} 