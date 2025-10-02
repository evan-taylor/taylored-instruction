"use client";

import { usePostHog } from "posthog-js/react";
import type React from "react";
import { Button } from "@/components/ui/Button";

type CourseRegistrationButtonProps = {
  courseName: string;
  registrationUrl: string;
  buttonText?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
};

const CourseRegistrationButton: React.FC<CourseRegistrationButtonProps> = ({
  courseName,
  registrationUrl,
  buttonText,
  className = "",
  variant = "primary",
}) => {
  const posthog = usePostHog();
  const defaultButtonText = buttonText || `Register for ${courseName}`;

  const handleClick = () => {
    posthog.capture("course_registration_clicked", {
      courseName,
      registrationUrl,
      buttonText: defaultButtonText,
      variant,
    });
  };

  return (
    <div className={`mb-12 text-center ${className}`}>
      <Button
        className="shadow-lg transition-shadow duration-200 hover:shadow-xl"
        href={registrationUrl}
        onClick={handleClick}
        rel="noopener noreferrer"
        size="lg"
        target="_blank"
        variant={variant}
      >
        {defaultButtonText}
      </Button>
    </div>
  );
};

export default CourseRegistrationButton;
