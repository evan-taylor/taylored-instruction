'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export const Hero = () => {
  return (
    <div className="relative min-h-[550px] md:min-h-[600px] flex items-center justify-center text-center px-4" style={{
      backgroundImage: "linear-gradient(rgba(45, 55, 72, 0.85), rgba(45, 55, 72, 0.85)), url('/life-buoy-1.jpeg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundAttachment: 'scroll',
      backgroundRepeat: 'no-repeat'
    }}>
      <div className="max-w-3xl mx-auto">
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