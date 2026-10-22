import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { registrationBookingUrl } from "@/lib/registration-launch";

<<<<<<< HEAD
interface ServiceCardProps {
=======
type Service = {
  title: string;
>>>>>>> origin/master
  description: string;
  icon: ReactNode;
  link: string;
<<<<<<< HEAD
  rel?: ComponentProps<typeof Link>["rel"];
  target?: ComponentProps<typeof Link>["target"];
  title: string;
}
=======
  cta: string;
};
>>>>>>> origin/master

const SERVICES: Service[] = [
  {
    title: "CPR training",
    description:
      "American Heart Association and American Red Cross CPR for laypersons and professional rescuers. Need to train your staff? We come to you.",
    link: registrationBookingUrl("https://www.hovn.app/tayloredinstruction/"),
    cta: "Find a class",
  },
  {
    title: "Lifeguard training",
    description:
      "American Red Cross Lifeguarding, taught at your facility or in a class we host.",
    link: "/lifeguarding",
    cta: "About lifeguarding",
  },
  {
    title: "Instructor training",
    description:
      "Become an AHA or Red Cross instructor, or align with our training site.",
    link: "/aha-instructor-training",
    cta: "Instructor courses",
  },
];

export const ServicesSection = () => (
  <section className="border-slate-200 border-y bg-slate-50 py-16">
    <div className="container mx-auto px-4">
      <div className="mb-10 max-w-2xl">
        <h2 className="mb-2 text-primary text-sm uppercase tracking-wider">
          What we teach
        </h2>
        <h3 className="font-bold text-3xl text-text md:text-4xl">
          Lifesaving skills for every setting
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {SERVICES.map((service) => {
          const external = service.link.startsWith("http");
          return (
            <article
              className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-6"
              key={service.title}
            >
              <h4 className="mb-2 font-bold text-text text-xl">
                {service.title}
              </h4>
              <p className="mb-6 grow text-text-light">{service.description}</p>
              <Link
                className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
                href={service.link}
                rel={external ? "noopener noreferrer" : undefined}
                target={external ? "_blank" : undefined}
              >
                {service.cta}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);
