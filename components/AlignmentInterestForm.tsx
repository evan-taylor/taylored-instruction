'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

const AlignmentInterestForm: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    hasCertification: '', // 'Yes' or 'No'
    agencies: [] as string[],
    message: '',
    smsOptIn: false,
  });
  const [status, setStatus] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      if (name === 'smsOptIn') {
        setFormData(prevState => ({
          ...prevState,
          smsOptIn: checked,
        }));
      } else {
        // Handle agency checkboxes
        setFormData(prevState => {
          const currentAgencies = prevState.agencies;
          if (checked) {
            return { ...prevState, agencies: [...currentAgencies, value] };
          } else {
            return { ...prevState, agencies: currentAgencies.filter(agency => agency !== value) };
          }
        });
      }
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  const handleRadioChange = (value: string) => {
    setFormData(prevState => ({
      ...prevState,
      hasCertification: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('Submitting...');

    try {
      const response = await fetch('/api/alignment-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData), // Send the component's state
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus('Form submitted successfully! We will be in touch soon.');
        setFormData({ // Reset form on success
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          hasCertification: '',
          agencies: [],
          message: '',
          smsOptIn: false,
        });
      } else {
        setStatus(`Submission failed: ${result.error || 'Unknown error. Please check your input and try again.'}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      setStatus('Submission failed due to a network or server error. Please try again later.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label>Do you currently hold an instructor certification? <span className="text-red-500">*</span></Label>
        <RadioGroup 
          value={formData.hasCertification} 
          onValueChange={handleRadioChange} 
          className="mt-2 space-y-2"
          required
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Yes" id="certYes" />
            <Label htmlFor="certYes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="No" id="certNo" />
            <Label htmlFor="certNo" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.hasCertification === 'Yes' && (
        <div>
          <Label>For which agency(s) is your instructor certification?</Label>
          <div className="mt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="agencyARC" name="agencies" value="American Red Cross" onCheckedChange={(checked) => handleChange({ target: { name: 'agencies', value: 'American Red Cross', type: 'checkbox', checked } } as any)} checked={formData.agencies.includes('American Red Cross')} />
              <Label htmlFor="agencyARC" className="font-normal">American Red Cross</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="agencyAHA" name="agencies" value="American Heart Association" onCheckedChange={(checked) => handleChange({ target: { name: 'agencies', value: 'American Heart Association', type: 'checkbox', checked } } as any)} checked={formData.agencies.includes('American Heart Association')} />
              <Label htmlFor="agencyAHA" className="font-normal">American Heart Association</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="agencyHSI" name="agencies" value="Health and Safety Institute" onCheckedChange={(checked) => handleChange({ target: { name: 'agencies', value: 'Health and Safety Institute', type: 'checkbox', checked } } as any)} checked={formData.agencies.includes('Health and Safety Institute')} />
              <Label htmlFor="agencyHSI" className="font-normal">Health and Safety Institute</Label>
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="message">Anything that you would like to share?</Label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className="mt-1"
        />
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox 
            id="smsOptIn" 
            name="smsOptIn" 
            checked={formData.smsOptIn}
            onCheckedChange={(checked) => handleChange({ target: { name: 'smsOptIn', value: '', type: 'checkbox', checked } } as any)} 
        />
        <div className="grid gap-1.5 leading-none">
            <Label htmlFor="smsOptIn" className="text-sm font-normal text-gray-600">
                SMS Opt-In (optional)
            </Label>
            <p className="text-xs text-gray-500">
                By subscribing, you agree to receive SMS notifications from Taylored Instruction. We value your privacy and will never share or sell your phone number. For more details, please review our Privacy Policy at <a href="/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://tayloredinstruction.com/privacy-policy</a>. Standard message and data rates may apply. You can unsubscribe at any time by replying &quot;STOP&quot; to any of our messages.
            </p>
        </div>
      </div>


      <div>
        <Button type="submit" className="w-full">Submit</Button>
      </div>

      {status && 
        <p className={`text-center text-sm mt-4 p-3 rounded ${status.includes('successfully') ? 'bg-green-100 text-green-800' : status.includes('failed') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
            {status}
        </p>}
    </form>
  );
};

export default AlignmentInterestForm; 