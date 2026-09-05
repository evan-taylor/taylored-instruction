"use client";

import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

interface Testimonial {
  id: number;
  image: string;
  name: string;
  position: string;
  quote: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    image: "/headshot.jpg",
    name: "Sarah Johnson",
    position: "Swimming Instructor",
    quote:
      "The CPR certification course was thorough and engaging. I feel much more confident in my ability to respond to emergencies at the pool where I teach swimming lessons.",
  },
  {
    id: 2,
    image: "/headshot.jpg",
    name: "Michael Rodriguez",
    position: "Parent",
    quote:
      "As a parent, I wanted to be prepared for any emergency. The First Aid training I received was practical and the instructor made complex procedures easy to understand.",
  },
  {
    id: 3,
    image: "/headshot.jpg",
    name: "Emma Wilson",
    position: "Fitness Center Manager",
    quote:
      "We hired Taylored Instruction to train our entire staff in CPR and AED use. The on-site training was convenient and customized to our facility's specific needs.",
  },
  {
    id: 4,
    image: "/headshot.jpg",
    name: "David Chen",
    position: "Lifeguard",
    quote:
      "The Lifeguard Training program was comprehensive and challenging. I appreciate how the scenarios mirrored real-life situations we might encounter.",
  },
];

export const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextTestimonial = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prevTestimonial = useCallback(() => {
    setActiveIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  }, []);

  return (
    <section className="bg-white py-16">
      <div className="container">
        <h2 className="mb-12 text-center font-bold text-3xl">
          What Our Clients Say
        </h2>

        <div className="relative mx-auto max-w-4xl">
          <div className="rounded-lg bg-white p-8 shadow-lg md:p-12">
            <div className="flex flex-col items-center md:flex-row md:space-x-8">
              <div className="mb-6 flex-shrink-0 md:mb-0">
                <div className="relative h-24 w-24 overflow-hidden rounded-full md:h-32 md:w-32">
                  <Image
                    alt={testimonials[activeIndex].name}
                    className="object-cover"
                    fill
                    src={testimonials[activeIndex].image}
                  />
                </div>
              </div>

              <div className="flex-1">
                <Quote className="mb-4 text-3xl text-primary-500" />
                <p className="mb-6 text-gray-600 italic">
                  {testimonials[activeIndex].quote}
                </p>

                <div>
                  <h4 className="font-bold text-lg">
                    {testimonials[activeIndex].name}
                  </h4>
                  <p className="text-gray-500">
                    {testimonials[activeIndex].position}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            <button
              aria-label="Previous testimonial"
              className="rounded-full bg-gray-100 p-2 transition-colors hover:bg-gray-200"
              onClick={prevTestimonial}
              type="button"
            >
              <ChevronLeft className="text-gray-600" />
            </button>

            <div className="flex space-x-2">
              {testimonials.map((testimonial, index) => (
                <button
                  aria-label={`Go to testimonial ${index + 1}`}
                  className={`h-3 w-3 rounded-full transition-colors ${
                    index === activeIndex ? "bg-primary-500" : "bg-gray-300"
                  }`}
                  key={testimonial.id}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                />
              ))}
            </div>

            <button
              aria-label="Next testimonial"
              className="rounded-full bg-gray-100 p-2 transition-colors hover:bg-gray-200"
              onClick={nextTestimonial}
              type="button"
            >
              <ChevronRight className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
