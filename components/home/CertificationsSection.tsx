import Image from "next/image";

export const CertificationsSection = () => {
  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="font-bold text-3xl text-text md:text-4xl">
            Trusted Certifications & Alignments
          </h2>
          <p className="mt-2 text-text-light">
            We are proud to be recognized by leading organizations.
          </p>
        </div>

        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3 md:gap-12">
          <div className="flex justify-center rounded-lg bg-white p-4">
            <Image
              alt="American Red Cross Licensed Training Provider"
              className="h-auto max-w-full"
              height={156}
              src="/licensed-training-provider.jpeg"
              width={369}
            />
          </div>

          <div className="flex flex-col items-center rounded-lg bg-white p-4">
            <Image
              alt="Resuscitation Group Logo"
              className="h-auto max-w-full"
              height={180}
              src="/TS_English_CMYK_rk-2020.png"
              width={180}
            />
            <p className="mt-3 text-center text-sm text-text-light">
              Aligned with Resuscitation Group in Vancouver, WA USA
            </p>
          </div>

          <div className="flex justify-center rounded-lg bg-white p-4">
            <Image
              alt="HSI Approved Training Center"
              className="h-auto max-w-full"
              height={127}
              src="/HSI_Approved-Training-Center-TC_Horizontal.png"
              width={408}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
