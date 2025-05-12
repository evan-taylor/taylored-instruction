'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { FaQuoteLeft, FaChevronLeft, FaChevronRight } from 'react-icons/fa'

type Testimonial = {
  id: number
  name: string
  position: string
  image: string
  quote: string
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    position: 'Swimming Instructor',
    image: '/headshot.jpg',
    quote: 'The CPR certification course was thorough and engaging. I feel much more confident in my ability to respond to emergencies at the pool where I teach swimming lessons.'
  },
  {
    id: 2,
    name: 'Michael Rodriguez',
    position: 'Parent',
    image: '/headshot.jpg',
    quote: 'As a parent, I wanted to be prepared for any emergency. The First Aid training I received was practical and the instructor made complex procedures easy to understand.'
  },
  {
    id: 3,
    name: 'Emma Wilson',
    position: 'Fitness Center Manager',
    image: '/headshot.jpg',
    quote: 'We hired Taylored Instruction to train our entire staff in CPR and AED use. The on-site training was convenient and customized to our facility\'s specific needs.'
  },
  {
    id: 4,
    name: 'David Chen',
    position: 'Lifeguard',
    image: '/headshot.jpg',
    quote: 'The Lifeguard Training program was comprehensive and challenging. I appreciate how the scenarios mirrored real-life situations we might encounter.'
  },
]

export const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  
  const nextTestimonial = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % testimonials.length)
  }, [])
  
  const prevTestimonial = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + testimonials.length) % testimonials.length)
  }, [])
  
  return (
    <section className="py-16 bg-white">
      <div className="container">
        <h2 className="text-3xl font-bold mb-12 text-center">What Our Clients Say</h2>
        
        <div className="max-w-4xl mx-auto relative">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center md:space-x-8">
              <div className="mb-6 md:mb-0 flex-shrink-0">
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden">
                  <Image 
                    src={testimonials[activeIndex].image}
                    alt={testimonials[activeIndex].name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <FaQuoteLeft className="text-primary-500 text-3xl mb-4" />
                <p className="text-gray-600 italic mb-6">{testimonials[activeIndex].quote}</p>
                
                <div>
                  <h4 className="font-bold text-lg">{testimonials[activeIndex].name}</h4>
                  <p className="text-gray-500">{testimonials[activeIndex].position}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4 mt-8">
            <button 
              onClick={prevTestimonial}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Previous testimonial"
            >
              <FaChevronLeft className="text-gray-600" />
            </button>
            
            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === activeIndex ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
            
            <button 
              onClick={nextTestimonial}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Next testimonial"
            >
              <FaChevronRight className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
} 