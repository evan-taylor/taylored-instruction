'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'

export const Hero = () => {
  return (
    <div className="relative min-h-[550px] md:min-h-[600px] flex items-center justify-center text-center px-4 overflow-hidden">
      <Image
        src="/life-buoy-1.jpeg"
        alt="Life buoy in water - CPR and safety training background"
        fill
        priority
        className="object-cover"
        quality={75}
      />
      <div className="absolute inset-0 bg-gray-700/85" />
      <div className="relative z-10 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
          Safety tailored to your needs.
        </h1>
        
        <Link href="https://www.hovn.app/tayloredinstruction" target="_blank">
          <Button size="lg" className="mt-4 text-lg px-8 py-3">
            Register for Classes
          </Button>
        </Link>
      </div>
    </div>
  )
} 