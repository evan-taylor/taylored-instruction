import Image from "next/image";
import { Button } from "@/components/ui/Button";

export const Hero = () => (
  <div className="relative flex min-h-[550px] items-center justify-center overflow-hidden px-4 text-center md:min-h-[600px]">
    <Image
      alt="Life buoy in water - CPR and safety training background"
      className="object-cover"
      fetchPriority="high"
      fill
      priority
      quality={75}
      sizes="100vw"
      src="/life-buoy-1.jpeg"
    />
    <div className="absolute inset-0 bg-slate-900/60" />
    <div className="relative z-10 mx-auto max-w-3xl">
      <h1 className="mb-4 font-bold text-4xl text-white md:text-5xl lg:text-6xl">
        Safety tailored to your needs.
      </h1>

      <Button className="mt-4" href="/classes" size="lg">
        Register for classes
      </Button>
    </div>
  </div>
);
