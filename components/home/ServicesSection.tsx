"use client";

import { Heart, LifeBuoy, UserCheck } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ServiceCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  link: string;
  rel?: ComponentProps<typeof Link>["rel"];
  target?: ComponentProps<typeof Link>["target"];
};

const ServiceCard = ({
  icon,
  title,
  description,
  link,
  rel,
  target,
}: ServiceCardProps) => (
  <Link className="group block h-full" href={link} rel={rel} target={target}>
    <div
      className={
        "h-full rounded-lg bg-white p-8 shadow-md transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg group-focus-within:ring-2 group-focus-within:ring-primary group-focus-within:ring-offset-2"
      }
    >
      <div className="mb-4 text-5xl text-primary">{icon}</div>
      <h3 className="mb-3 font-bold text-2xl text-text">{title}</h3>
      <p className="text-text-light">{description}</p>
    </div>
  </Link>
);

export const ServicesSection = () => (
  <section className="bg-gray-50 py-16">
    <div className="container mx-auto px-4">
      <div className="mb-12 text-center">
        <h2 className="mb-2 text-primary text-sm uppercase tracking-wider">
          Services We Provide
        </h2>
        <h3 className="font-bold text-3xl text-text md:text-4xl">
          Empowering You with Lifesaving Skills
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <ServiceCard
          description="We offer American Heart Association or American Red Cross CPR training for both laypersons and professional rescuers. Need to train your staff? We would love to work with you."
          icon={<Heart />}
          link="https://www.hovn.app/tayloredinstruction/"
          rel="noopener noreferrer"
          target="_blank"
          title="CPR Training"
        />

        <ServiceCard
          description="We utilize the American Red Cross Lifeguarding curriculum to train Lifeguards. We are always happy to travel to your facility to train your staff, or you can take a class we host!"
          icon={<LifeBuoy />}
          link="/lifeguarding"
          title="Lifeguard Training"
        />

        <ServiceCard
          description="Want to become a CPR Instructor? We can help! We offer both American Heart Association and American Red Cross Instructor Training, as well as Alignment with our Training Site."
          icon={<UserCheck />}
          link="/aha-instructor-training"
          title="Instructor Training"
        />
      </div>
    </div>
  </section>
);
