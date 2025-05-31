'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { sendContactEmail } from '@/app/actions/sendContactEmail' // Import the server action

export function ContactForm() {
  const [status, setStatus] = useState<{ loading: boolean; success: boolean | null; error: string | null }>({ 
    loading: false, 
    success: null, 
    error: null 
  });
  const [locationChoice, setLocationChoice] = useState('Vancouver, WA');
  const [showOtherLocation, setShowOtherLocation] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ loading: true, success: null, error: null });
    const formData = new FormData(event.currentTarget);

    try {
      // --- Call the server action --- 
      const result = await sendContactEmail(formData);
      // --------------------------------

      if (result.success) {
        setStatus({ loading: false, success: true, error: null });
        // Optionally reset the form
        (event.target as HTMLFormElement).reset();
        setLocationChoice('Vancouver, WA');
        setShowOtherLocation(false);
      } else {
        setStatus({ loading: false, success: false, error: result.error || 'An unknown error occurred.' });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setStatus({ loading: false, success: false, error: 'An unexpected error occurred.' });
    }
  };

  const handleLocationChange = (value: string) => {
    setLocationChoice(value);
    setShowOtherLocation(value === 'Other');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Messages - Moved to top */}
        {status.success === true && <p className="p-3 mb-4 rounded bg-green-100 text-green-800 border border-green-200 text-center">Message sent successfully! We&apos;ll be in touch soon.</p>}
       {status.success === false && status.error && <p className="p-3 mb-4 rounded bg-red-100 text-red-800 border border-red-200 text-center">Error: {status.error}</p>}
       {status.loading && <p className="p-3 mb-4 rounded bg-blue-100 text-blue-800 border border-blue-200 text-center">Sending message...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
          <Input id="firstName" name="firstName" type="text" required disabled={status.loading} />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
          <Input id="lastName" name="lastName" type="text" required disabled={status.loading} />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
        <Input id="email" name="email" type="email" required disabled={status.loading} />
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" disabled={status.loading} />
      </div>

      <div>
        <Label>Approximate location (we are willing to travel!)</Label>
        <RadioGroup 
          name="location" 
          value={locationChoice} // Controlled component
          onValueChange={handleLocationChange}
          className="mt-2"
          disabled={status.loading}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Vancouver, WA" id="loc-van" />
            <Label htmlFor="loc-van" className="font-normal">Vancouver, WA</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="San Luis Obispo, CA" id="loc-slo" />
            <Label htmlFor="loc-slo" className="font-normal">San Luis Obispo, CA</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Other" id="loc-other" />
            <Label htmlFor="loc-other" className="font-normal">Other</Label>
          </div>
        </RadioGroup>
      </div>

      {showOtherLocation && (
        <div>
          <Label htmlFor="otherLocation">Other location:</Label>
          <Input id="otherLocation" name="otherLocation" type="text" required={locationChoice === 'Other'} disabled={status.loading} />
        </div>
      )}

      <div>
        <Label htmlFor="message">Comment or Message <span className="text-red-500">*</span></Label>
        <Textarea id="message" name="message" rows={5} required disabled={status.loading} />
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox id="smsOptIn" name="smsOptIn" disabled={status.loading} />
        <div className="grid gap-1.5 leading-none">
           <Label htmlFor="smsOptIn" className="font-normal text-sm">
              SMS Opt-In (optional)
           </Label>
             <p className="text-xs text-muted-foreground">
              By subscribing, you agree to receive SMS notifications from Taylored Instruction. We value your privacy and will never share or sell your phone number. For more details, please review our <a href="/privacy-policy" className="text-blue-500">Privacy Policy</a>. Standard message and data rates may apply. You can unsubscribe at any time by replying &quot;STOP&quot; to any of our messages.
             </p>
        </div>
      </div>
      
       <div>
        <Label>How should we reach out to you? <span className="text-red-500">*</span></Label>
        <div className="mt-2 space-y-2">
            <div className="flex items-center space-x-2">
                <Checkbox id="contact-email" name="contactMethod" value="Email" disabled={status.loading}/>
                <Label htmlFor="contact-email" className="font-normal">Email</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="contact-phone" name="contactMethod" value="Phone call" disabled={status.loading}/>
                <Label htmlFor="contact-phone" className="font-normal">Phone call</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="contact-sms" name="contactMethod" value="SMS message" disabled={status.loading} />
                <Label htmlFor="contact-sms" className="font-normal">SMS message (requires opt-in above)</Label>
            </div>
        </div>
         {/* Validation message if needed */}
        {status.error?.includes('contact method') && <p className="text-sm text-red-600 mt-1">Please select at least one contact method.</p>}
      </div>

      <div>
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={status.loading}>
          {status.loading ? (
            <>
             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
            ) : ( 
            'Send Message'
             )}
        </Button>
      </div>
    </form>
  )
} 