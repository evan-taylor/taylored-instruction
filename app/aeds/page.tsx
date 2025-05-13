import type { Metadata } from 'next'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'AED Distribution | Taylored Instruction',
  description: 'Taylored Instruction is an authorized distributor of leading AED brands. Contact us for a quote or to place an order for your organization.',
  keywords: [
    'AED distributor',
    'Automated External Defibrillator',
    'AED sales',
    'Buy AED',
    'AED for business',
    'AED for school',
    'Lifesaving equipment',
    'Taylored Instruction AED',
    'Vancouver AED',
    'Vancouver WA AED distributor',
    'Vancouver AED sales',
    'Vancouver AED for sale',
    'Vancouver AED for business',
    'Vancouver AED for school',
    
  ]
}

export default function AedPage() {
  return (
    <>
      {/* Hero Section with Background Image (matching contact page style) */}
      <section className="relative min-h-[400px] md:min-h-[500px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/life-buoy-1.jpeg" // Using same image as contact page
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">AED Sales & Distribution</h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Equip your organization with life-saving AEDs. Taylored Instruction is your authorized local distributor for leading brands.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">

          <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-text text-center">Why Choose Taylored Instruction for Your AED Needs?</h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12 items-center">
            <div>
              <ul className="list-disc list-inside space-y-3 text-text-light text-lg">
                <li><span className="font-semibold text-text">Expert Guidance:</span> We help you select the right AED model for your specific environment and needs.</li>
                <li><span className="font-semibold text-text">Trusted Brands:</span> Access to reliable and user-friendly AEDs from industry leaders.</li>
                <li><span className="font-semibold text-text">Competitive Pricing:</span> Get affordable pricing on devices and accessories.</li>
                <li><span className="font-semibold text-text">Comprehensive Support:</span> We offer setup assistance and can integrate AED training with our existing CPR and First Aid courses.</li>
                <li><span className="font-semibold text-text">Regulatory Compliance:</span> Ensure your organization meets local and state requirements for AED placement and maintenance.</li>
              </ul>
            </div>
            <div className="flex justify-center">
              <Image 
                src="/Zoll-AED-Image.png" 
                alt="ZOLL AED Device" 
                width={400} 
                height={400}
                className="rounded-lg max-w-full h-auto"
              />
            </div>
          </div>


          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-text text-center">Ready to Enhance Safety with an AED?</h2>
          <p className="text-lg text-text-light mb-8 text-center max-w-3xl mx-auto">
            Investing in an AED is a critical step towards protecting your employees, customers, or community members. Sudden Cardiac Arrest can happen anywhere, and having an AED readily available can significantly increase survival chances.
          </p>

          {/* Call to Action Section */}
          <div className="text-center bg-muted p-8 rounded-lg shadow">
            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-text">Get a Quote or Place Your Order Today!</h3>
            <p className="text-text-light mb-6">
              Our team is ready to assist you with product selection, pricing, and any questions you may have. Contact us to discuss your AED needs.
            </p>
            <Button href="/contact" variant="primary" size="lg">Contact Us for AEDs</Button>
          </div>

        </div>
      </section>
    </>
  )
} 