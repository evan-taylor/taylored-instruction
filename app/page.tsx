import { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { ServicesSection } from "@/components/home/ServicesSection";
import { CertificationsSection } from "@/components/home/CertificationsSection";
import { AboutSection } from "@/components/home/AboutSection";

export const metadata: Metadata = {
  title: "Taylored Instruction | BLS/CPR Training in Vancouver WA",
  description:
    "Get certified in CPR and lifeguarding. Join our CPR Training in Vancouver WA to learn essential life-saving techniques today.",
  keywords: [
    "CPR training Vancouver WA",
    "BLS certification Vancouver WA",
    "Lifeguard training Vancouver WA",
    "First aid courses Vancouver WA",
    "Taylored Instruction",
    "CPR classes",
    "AED training",
    "Basic Life Support",
    "Vancouver WA CPR",
    "Clark County CPR",
  ],
};

export default function Home() {
  return (
    <>
      <Hero />
      <ServicesSection />
      <CertificationsSection />
      <AboutSection />
    </>
  );
}
