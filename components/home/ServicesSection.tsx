'use client'

import Link from 'next/link'
import { Heart, LifeBuoy, UserCheck } from 'lucide-react'

type ServiceCardProps = {
  icon: React.ReactNode
  title: string
  description: string
  link: string
}

const ServiceCard = ({ icon, title, description, link }: ServiceCardProps) => {
  return (
    <Link href={link} className="block h-full group">
      <div 
        className={`bg-white p-8 h-full shadow-md rounded-lg 
                    transition-all duration-300 ease-in-out 
                    hover:shadow-lg hover:scale-[1.02] group-focus-within:ring-2 group-focus-within:ring-primary group-focus-within:ring-offset-2`}
      >
        <div className="text-5xl mb-4 text-primary">{icon}</div>
        <h3 className="text-2xl font-bold mb-3 text-text">{title}</h3>
        <p className="text-text-light">{description}</p>
      </div>
    </Link>
  )
}

export const ServicesSection = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-sm uppercase tracking-wider text-primary mb-2">Services We Provide</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-text">Empowering You with Lifesaving Skills</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ServiceCard 
            icon={<Heart />}
            title="CPR Training"
            description="We offer American Heart Association or American Red Cross CPR training for both laypersons and professional rescuers. Need to train your staff? We would love to work with you."
            link="/classes"
          />
          
          <ServiceCard 
            icon={<LifeBuoy />}
            title="Lifeguard Training"
            description="We utilize the American Red Cross Lifeguarding curriculum to train Lifeguards. We are always happy to travel to your facility to train your staff, or you can take a class we host!"
            link="/lifeguarding"
          />
          
          <ServiceCard 
            icon={<UserCheck />}
            title="Instructor Training"
            description="Want to become a CPR Instructor? We can help! We offer both American Heart Association and American Red Cross Instructor Training, as well as Alignment with our Training Site."
            link="/aha-instructor-training"
          />
        </div>
      </div>
    </section>
  )
} 