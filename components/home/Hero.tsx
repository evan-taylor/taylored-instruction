"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const Hero = () => {
  return (
    <div className="relative flex min-h-[550px] items-center justify-center overflow-hidden px-4 text-center md:min-h-[600px]">
      <Image
        alt="Life buoy in water - CPR and safety training background"
        className="object-cover"
        fill
        priority
        quality={75}
        src="/life-buoy-1.jpeg"
      />
      <div className="absolute inset-0 bg-gray-700/85" />
      <div className="relative z-10 mx-auto max-w-3xl">
        <h1 className="mb-4 font-bold text-4xl text-white md:text-5xl lg:text-6xl">
          Safety tailored to your needs.
        </h1>

        <Link href="https://www.hovn.app/tayloredinstruction" target="_blank">
          <Button className="mt-4 px-8 py-3 text-lg" size="lg">
            Register for Classes
          </Button>
        </Link>
      </div>
    </div>
  );
};
