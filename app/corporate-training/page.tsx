import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  Building, Users, Calendar, Award, 
  CheckCircle, LifeBuoy, BookOpen, BadgeCheck
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Corporate CPR Training | Taylored Instruction',
  description: 'Equip your business, school, or organization with essential lifesaving CPR skills. Flexible, expert-led corporate training.',
  keywords: [
    'Corporate CPR training Vancouver WA',
    'Workplace CPR certification',
    'Business CPR classes',
    'School CPR training',
    'Organization CPR training',
    'On-site CPR training',
    'Group CPR training',
    'AHA corporate training',
    'Red Cross corporate training',
    'OSHA compliance CPR',
    'Employee CPR certification',
    'Team CPR training Vancouver WA',
    'Taylored Instruction corporate',
    'Vancouver WA corporate CPR'
  ],
};

export default function CorporateTrainingPage() {
  return (
    <>
      {/* Hero Section - Improved with better image handling and text styling */}
      <section className="relative min-h-[500px] md:min-h-[600px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/CPR-Training-Image.jpeg"
            alt="Team learning CPR in a corporate setting"
            fill
            sizes="100vw"
            style={{objectFit: 'cover', objectPosition: 'center'}}
            className="brightness-[0.85]"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50 z-10"></div>
        <div className="relative z-20 container mx-auto px-6 py-20 text-center">
          <div className="bg-black/30 backdrop-blur-sm p-8 md:p-10 rounded-xl max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
              Corporate CPR Training
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Empower your team with lifesaving skills. Designed for businesses, schools, and organizations, our training sessions equip your staff with the knowledge and confidence to respond to medical emergencies effectively.
            </p>
            <div className="mt-8">
              <Link href="#options">
                <Button variant="primary" size="lg" className="mr-4 shadow-lg">View Training Options</Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" className="bg-white/10 text-white hover:bg-white/20 border-white/30">Contact Us</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section - Better organized with visual elements */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-6xl text-text">

          {/* Why Choose Corporate CPR Training? - Added icons and better layout */}
          <div className="mb-16 md:mb-24">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Corporate CPR Training?</h2>
              <p className="text-lg text-text-light max-w-3xl mx-auto">Professional training that adapts to your organization's unique needs and schedule.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center h-16 w-16 bg-primary/10 text-primary rounded-full mb-4">
                  <CheckCircle size={28} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Increase Workplace Safety</h3>
                <p className="text-text-light">Prepare your staff to handle emergencies with confidence.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center h-16 w-16 bg-primary/10 text-primary rounded-full mb-4">
                  <BadgeCheck size={28} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Meet Compliance Standards</h3>
                <p className="text-text-light">Ensure your workplace meets OSHA and industry-specific safety requirements.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center h-16 w-16 bg-primary/10 text-primary rounded-full mb-4">
                  <Calendar size={28} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Flexible and Convenient</h3>
                <p className="text-text-light">We bring the training to your location or host it at a nearby facility.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center h-16 w-16 bg-primary/10 text-primary rounded-full mb-4">
                  <LifeBuoy size={28} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Customized Training</h3>
                <p className="text-text-light">Select courses that fit your organization's specific needs and scenarios.</p>
              </div>
            </div>
          </div>

          {/* Training Options - Improved card design */}
          <div id="options" className="mb-20 md:mb-28 scroll-mt-24">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Training Options</h2>
              <p className="text-lg text-text-light max-w-3xl mx-auto">We offer a range of courses to meet your needs, from basic workplace training to healthcare provider certifications.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Course Cards - Reverted to original design */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-primary">Heartsaver CPR & AED (AHA)</h3>
                <p className="mb-2 text-text-light"><strong className="text-text">Audience:</strong> General employees, workplace teams</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Content Focus:</strong> Adult, child, and infant CPR, AED use</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Certification:</strong> Valid for 2 years</p>
                <p className="text-text-light"><strong className="text-text">Duration:</strong> 4-5 hours (in-person)</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-primary">Heartsaver First Aid CPR AED (AHA)</h3>
                <p className="mb-2 text-text-light"><strong className="text-text">Audience:</strong> General employees, workplace teams</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Content Focus:</strong> CPR, AED, and first aid for injuries</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Certification:</strong> Valid for 2 years</p>
                <p className="text-text-light"><strong className="text-text">Duration:</strong> 5-6 hours (in-person)</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-primary">Basic Life Support (BLS) (AHA)</h3>
                <p className="mb-2 text-text-light"><strong className="text-text">Audience:</strong> Healthcare providers, first responders</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Content Focus:</strong> High-performance CPR, AED, and choking</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Certification:</strong> Valid for 2 years</p>
                <p className="text-text-light"><strong className="text-text">Duration:</strong> 4 hours (in-person)</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-primary">Adult and Pediatric First Aid/CPR/AED – Blended Learning (Red Cross)</h3>
                <p className="mb-2 text-text-light"><strong className="text-text">Audience:</strong> General employees, workplace teams</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Content Focus:</strong> CPR, AED, and first aid for injuries</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Certification:</strong> Valid for 2 years</p>
                <p className="text-text-light"><strong className="text-text">Duration:</strong> 2-3 hours (in-person)</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-primary">Adult & Pediatric CPR/AED (Red Cross)</h3>
                <p className="mb-2 text-text-light"><strong className="text-text">Audience:</strong> General employees, daycare providers</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Content Focus:</strong> CPR and AED use for adults and children</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Certification:</strong> Valid for 2 years</p>
                <p className="text-text-light"><strong className="text-text">Duration:</strong> 4-5 hours (in-person or blended)</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-primary">Adult CPR/AED (Red Cross)</h3>
                <p className="mb-2 text-text-light"><strong className="text-text">Audience:</strong> Office settings, low-risk workplaces</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Content Focus:</strong> Adult CPR and AED use</p>
                <p className="mb-2 text-text-light"><strong className="text-text">Certification:</strong> Valid for 2 years</p>
                <p className="text-text-light"><strong className="text-text">Duration:</strong> 2-3 hours (in-person)</p>
              </div>
            </div>
          </div>

          {/* Key Differences - Improved comparison section */}
          <div className="mb-20 md:mb-28">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Differences Between AHA and Red Cross</h2>
              <p className="text-lg text-text-light max-w-3xl mx-auto">Both organizations offer high-quality training with some differences in approach and certification recognition.</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
              <div className="grid grid-cols-3 border-b border-gray-200">
                <div className="p-5 font-bold text-lg border-r border-gray-200">Feature</div>
                <div className="p-5 font-bold text-lg border-r border-gray-200 text-primary text-center">American Heart Association</div>
                <div className="p-5 font-bold text-lg text-red-600 text-center">American Red Cross</div>
              </div>
              
              <div className="grid grid-cols-3 border-b border-gray-200">
                <div className="p-5 font-medium bg-gray-50 border-r border-gray-200">Focus</div>
                <div className="p-5 border-r border-gray-200">Healthcare providers and workplace teams</div>
                <div className="p-5">Workplace teams, general public, childcare</div>
              </div>
              
              <div className="grid grid-cols-3 border-b border-gray-200">
                <div className="p-5 font-medium bg-gray-50 border-r border-gray-200">Flexibility</div>
                <div className="p-5 border-r border-gray-200">Blended and in-person options</div>
                <div className="p-5">Blended and in-person options</div>
              </div>
              
              <div className="grid grid-cols-3 border-b border-gray-200">
                <div className="p-5 font-medium bg-gray-50 border-r border-gray-200">Recognition</div>
                <div className="p-5 border-r border-gray-200">Recognized globally, especially in healthcare</div>
                <div className="p-5">Widely recognized across industries in the U.S.</div>
              </div>
              
              <div className="grid grid-cols-3 border-b border-gray-200">
                <div className="p-5 font-medium bg-gray-50 border-r border-gray-200">Skill Practice</div>
                <div className="p-5 border-r border-gray-200">High emphasis on hands-on practice</div>
                <div className="p-5">Balance of lecture and hands-on training</div>
              </div>
              
              <div className="grid grid-cols-3">
                <div className="p-5 font-medium bg-gray-50 border-r border-gray-200">Renewal</div>
                <div className="p-5 border-r border-gray-200">Every 2 years with hands-on session</div>
                <div className="p-5">Every 2 years with hands-on session</div>
              </div>
            </div>
          </div>

          {/* Two Feature Sections - Better visual layout */}
          <div className="grid md:grid-cols-2 gap-10 mb-20">
            {/* Customization */}
            <div className="bg-white p-8 md:p-10 rounded-xl shadow-md border border-gray-100">
              <div className="inline-flex items-center justify-center h-16 w-16 bg-primary/10 text-primary rounded-full mb-6">
                <Building size={30} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Customization for Your Workplace</h2>
              <p className="text-text-light mb-6">We understand that every workplace is unique. That's why we offer:</p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-primary mr-3 mt-1"><CheckCircle size={18} /></span>
                  <span className="text-text-light"><strong>Scenario-Based Training:</strong> Tailored to your industry (e.g., construction, childcare, office settings).</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-3 mt-1"><CheckCircle size={18} /></span>
                  <span className="text-text-light"><strong>Flexible Group Sizes:</strong> Train small teams or large groups—our courses accommodate your needs.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-3 mt-1"><CheckCircle size={18} /></span>
                  <span className="text-text-light"><strong>Convenient Scheduling:</strong> Sessions can be scheduled during work hours, weekends, or after hours.</span>
                </li>
              </ul>
            </div>

            {/* What's Included */}
            <div className="bg-primary p-8 md:p-10 rounded-xl shadow-md text-white">
              <div className="inline-flex items-center justify-center h-16 w-16 bg-white/20 text-white rounded-full mb-6">
                <Award size={30} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">What's Included in Our Training?</h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-white mr-3 mt-1"><CheckCircle size={18} /></span>
                  <span className="text-white/90"><strong>Expert instruction</strong> from certified professionals.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white mr-3 mt-1"><CheckCircle size={18} /></span>
                  <span className="text-white/90"><strong>Hands-on practice</strong> with state-of-the-art equipment.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white mr-3 mt-1"><CheckCircle size={18} /></span>
                  <span className="text-white/90"><strong>All course materials</strong> and participant manuals.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white mr-3 mt-1"><CheckCircle size={18} /></span>
                  <span className="text-white/90"><strong>Certification cards</strong> valid for 2 years upon successful completion.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* FAQ - Better accordion style */}
          <div className="mb-16 md:mb-24">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-text-light max-w-3xl mx-auto">Get answers to common questions about our corporate training programs.</p>
            </div>
            <div className="max-w-3xl mx-auto divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div className="p-6 hover:bg-gray-50 transition-colors">
                <h4 className="text-xl font-semibold text-text flex items-center">
                  <span className="text-primary mr-3"><Users size={20} /></span>
                  How many people can be trained at once?
                </h4>
                <p className="mt-3 text-text-light pl-8">Depending on the course, we can train groups of up to 20 participants in a single session. For larger groups, we'll divide sessions to ensure quality instruction.</p>
              </div>
              
              <div className="p-6 hover:bg-gray-50 transition-colors">
                <h4 className="text-xl font-semibold text-text flex items-center">
                  <span className="text-primary mr-3"><LifeBuoy size={20} /></span>
                  Do we need any equipment for the training?
                </h4>
                <p className="mt-3 text-text-light pl-8">No, we'll bring everything needed, including manikins, AED trainers, and course materials.</p>
              </div>
              
              <div className="p-6 hover:bg-gray-50 transition-colors">
                <h4 className="text-xl font-semibold text-text flex items-center">
                  <span className="text-primary mr-3"><Calendar size={20} /></span>
                  What is the cost of corporate training?
                </h4>
                <p className="mt-3 text-text-light pl-8">Pricing depends on group size, course type, and location. Contact us for a customized quote.</p>
              </div>
              
              <div className="p-6 hover:bg-gray-50 transition-colors">
                <h4 className="text-xl font-semibold text-text flex items-center">
                  <span className="text-primary mr-3"><Building size={20} /></span>
                  Can the training be tailored to our industry?
                </h4>
                <p className="mt-3 text-text-light pl-8">Yes! We'll incorporate scenarios relevant to your workplace to maximize engagement.</p>
              </div>
            </div>
          </div>

          {/* CTA - More engaging design */}
          <div className="bg-gradient-to-r from-primary to-primary-800 text-white p-10 md:p-16 rounded-2xl shadow-xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Train Your Team?</h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Contact us today to schedule a session or learn more about our Corporate CPR Training options. Let's create a safer workplace together!
            </p>
            <Link href="/contact">
              <Button variant="primary" size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg px-8 py-6 text-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
} 