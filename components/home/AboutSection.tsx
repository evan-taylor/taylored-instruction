import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { ChamberBadge } from '@/components/ui/ChamberBadge'

export const AboutSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center text-text">About Taylored Instruction</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-text">What We Do</h3>
              <p className="mb-8 text-text-light">
                Taylored Instruction was built upon the core value of teaching basic lifesaving skills to all. 
                Whether it be through Swimming Lessons, CPR training, or Lifeguarding classes, we want to help 
                you help others.
              </p>
              
              <h3 className="text-2xl font-semibold mb-4 text-text">How We Do It</h3>
              <p className="mb-8 text-text-light">
                Taylored Instruction provides classes periodically in various places in the Vancouver community
                based on availability and demand. We can also travel to your area or business to provide a class, 
                provided you have the space and the necessary amount of students (typically 5).
              </p>
            </div>
            <div className="md:order-first">
              <Image 
                src="/lifeguard-training-1.jpeg"
                alt="Lifeguards practicing skills"
                width={500}
                height={334}
                className="rounded-lg shadow-lg w-full h-auto"
              />
            </div>
          </div>
          
          <h3 className="text-2xl font-semibold mb-4 text-text">Who We Are</h3>
          <p className="mb-8 text-text-light">
            Taylored Instruction is a small business born in Vancouver, WA, owned and operated by Evan Taylor. 
            Evan has been swimming since a young age, and began teaching swimming lessons and lifeguarding at 
            age 15. He discovered his passion for teaching health and safety classes, and became an American 
            Red Cross instructor at age 17.
          </p>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 items-center gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-semibold mb-4 text-text">Have a question?</h3>
              <p className="mb-6 text-text-light">Let us know how we can help you by contacting us today!</p>
              <Button href="/contact" variant="primary" size="lg">Contact Us</Button>
            </div>
            <div className="flex justify-center md:justify-end">
              <ChamberBadge />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 