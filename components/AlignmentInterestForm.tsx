"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

const AlignmentInterestForm: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    hasCertification: "", // 'Yes' or 'No'
    agencies: [] as string[],
    message: "",
    smsOptIn: false,
    smsOptOut: false,
  });
  const [status, setStatus] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      if (name === "smsOptIn") {
        setFormData((prevState) => ({
          ...prevState,
          smsOptIn: checked,
        }));
      } else if (name === "smsOptOut") {
        setFormData((prevState) => ({
          ...prevState,
          smsOptOut: checked,
        }));
      } else {
        // Handle agency checkboxes
        setFormData((prevState) => {
          const currentAgencies = prevState.agencies;
          if (checked) {
            return { ...prevState, agencies: [...currentAgencies, value] };
          }
          return {
            ...prevState,
            agencies: currentAgencies.filter((agency) => agency !== value),
          };
        });
      }
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  const handleRadioChange = (value: string) => {
    setFormData((prevState) => ({
      ...prevState,
      hasCertification: value,
    }));
  };

  const handleAgencyCheckboxChange = (
    agencyValue: string,
    checked: boolean
  ) => {
    setFormData((prevState) => {
      const currentAgencies = prevState.agencies;
      if (checked) {
        return { ...prevState, agencies: [...currentAgencies, agencyValue] };
      }
      return {
        ...prevState,
        agencies: currentAgencies.filter((agency) => agency !== agencyValue),
      };
    });
  };

  const handleSmsCheckboxChange = (
    field: "smsOptIn" | "smsOptOut",
    checked: boolean
  ) => {
    setFormData((prevState) => ({
      ...prevState,
      [field]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("Submitting...");

    try {
      const response = await fetch("/api/alignment-interest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData), // Send the component's state
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus("Form submitted successfully! We will be in touch soon.");
        setFormData({
          // Reset form on success
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          hasCertification: "",
          agencies: [],
          message: "",
          smsOptIn: false,
          smsOptOut: false,
        });
      } else {
        setStatus(
          `Submission failed: ${result.error || "Unknown error. Please check your input and try again."}`
        );
      }
    } catch (_error) {
      setStatus(
        "Submission failed due to a network or server error. Please try again later."
      );
    }
  };

  return (
    <form
      className="mx-auto max-w-xl space-y-6 rounded-lg bg-white p-6 shadow-md"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">
            First Name <span className="text-red-500">*</span>
          </Label>
          <Input
            className="mt-1"
            id="firstName"
            name="firstName"
            onChange={handleChange}
            required
            type="text"
            value={formData.firstName}
          />
        </div>
        <div>
          <Label htmlFor="lastName">
            Last Name <span className="text-red-500">*</span>
          </Label>
          <Input
            className="mt-1"
            id="lastName"
            name="lastName"
            onChange={handleChange}
            required
            type="text"
            value={formData.lastName}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          className="mt-1"
          id="email"
          name="email"
          onChange={handleChange}
          required
          type="email"
          value={formData.email}
        />
      </div>

      <div>
        <Label htmlFor="phone">
          Phone <span className="text-red-500">*</span>
        </Label>
        <Input
          className="mt-1"
          id="phone"
          name="phone"
          onChange={handleChange}
          required
          type="tel"
          value={formData.phone}
        />
      </div>

      <div>
        <Label>
          Do you currently hold an instructor certification?{" "}
          <span className="text-red-500">*</span>
        </Label>
        <RadioGroup
          className="mt-2 space-y-2"
          onValueChange={handleRadioChange}
          required
          value={formData.hasCertification}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem id="certYes" value="Yes" />
            <Label className="font-normal" htmlFor="certYes">
              Yes
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem id="certNo" value="No" />
            <Label className="font-normal" htmlFor="certNo">
              No
            </Label>
          </div>
        </RadioGroup>
      </div>

      {formData.hasCertification === "Yes" && (
        <div>
          <Label>For which agency(s) is your instructor certification?</Label>
          <div className="mt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.agencies.includes("American Red Cross")}
                id="agencyARC"
                name="agencies"
                onCheckedChange={(checked) =>
                  handleAgencyCheckboxChange(
                    "American Red Cross",
                    checked === true
                  )
                }
                value="American Red Cross"
              />
              <Label className="font-normal" htmlFor="agencyARC">
                American Red Cross
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.agencies.includes(
                  "American Heart Association"
                )}
                id="agencyAHA"
                name="agencies"
                onCheckedChange={(checked) =>
                  handleAgencyCheckboxChange(
                    "American Heart Association",
                    checked === true
                  )
                }
                value="American Heart Association"
              />
              <Label className="font-normal" htmlFor="agencyAHA">
                American Heart Association
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.agencies.includes(
                  "Health and Safety Institute"
                )}
                id="agencyHSI"
                name="agencies"
                onCheckedChange={(checked) =>
                  handleAgencyCheckboxChange(
                    "Health and Safety Institute",
                    checked === true
                  )
                }
                value="Health and Safety Institute"
              />
              <Label className="font-normal" htmlFor="agencyHSI">
                Health and Safety Institute
              </Label>
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="message">Anything that you would like to share?</Label>
        <Textarea
          className="mt-1"
          id="message"
          name="message"
          onChange={handleChange}
          rows={4}
          value={formData.message}
        />
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          checked={formData.smsOptIn}
          id="smsOptIn"
          name="smsOptIn"
          onCheckedChange={(checked) =>
            handleSmsCheckboxChange("smsOptIn", checked === true)
          }
        />
        <div className="grid gap-1.5 leading-none">
          <Label
            className="font-normal text-gray-600 text-sm"
            htmlFor="smsOptIn"
          >
            Yes, I agree to receive text messages from Taylored Instruction sent
            from 360-685-8199.
          </Label>
          <p className="text-gray-500 text-xs">
            Message frequency varies and may include appointment reminders,
            course information, or promotional messages. Message and data rates
            may apply. Reply STOP at any time to unsubscribe or HELP for
            assistance. Contact support at 360-685-8199. Please review our{" "}
            <a
              className="text-primary hover:underline"
              href="/privacy-policy/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Privacy Policy
            </a>{" "}
            for details on how we handle your information.
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-start space-x-2">
        <Checkbox
          checked={formData.smsOptOut}
          id="smsOptOut"
          name="smsOptOut"
          onCheckedChange={(checked) =>
            handleSmsCheckboxChange("smsOptOut", checked === true)
          }
        />
        <div className="grid gap-1.5 leading-none">
          <Label
            className="font-normal text-gray-600 text-sm"
            htmlFor="smsOptOut"
          >
            No, I do not want to receive text messages from Taylored
            Instruction.
          </Label>
        </div>
      </div>

      <div>
        <Button className="w-full" type="submit">
          Submit
        </Button>
      </div>

      {status &&
        (() => {
          let statusClass = "bg-blue-100 text-blue-800";
          if (status.includes("successfully")) {
            statusClass = "bg-green-100 text-green-800";
          } else if (status.includes("failed")) {
            statusClass = "bg-red-100 text-red-800";
          }
          return (
            <p
              className={`mt-4 rounded p-3 text-center text-sm ${statusClass}`}
            >
              {status}
            </p>
          );
        })()}
    </form>
  );
};

export default AlignmentInterestForm;
