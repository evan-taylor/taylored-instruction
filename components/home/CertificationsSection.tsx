'use client'

import Image from 'next/image'

export const CertificationsSection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text">Trusted Certifications & Alignments</h2>
          <p className="mt-2 text-text-light">We are proud to be recognized by leading organizations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 md:gap-12">
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <Image
              src="/licensed-training-provider.jpeg"
              alt="American Red Cross Licensed Training Provider"
              width={369}
              height={156}
              className="h-auto max-w-full"
            />
          </div>
          
          <div className="flex flex-col items-center p-4 bg-white rounded-lg">
            <Image
              src="/TS_English_CMYK_rk-2020.png"
              alt="Resuscitation Group Logo"
              width={180}
              height={180}
              className="h-auto max-w-full"
            />
            <p className="text-center text-sm mt-3 text-text-light">
              Aligned with Resuscitation Group in Vancouver, WA USA
            </p>
          </div>
          
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <Image
              src="/HSI_Approved-Training-Center-TC_Horizontal.png"
              alt="HSI Approved Training Center"
              width={408}
              height={127}
              className="h-auto max-w-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
} 