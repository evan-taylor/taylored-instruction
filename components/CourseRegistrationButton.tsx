"use client";

import { usePostHog } from "posthog-js/react";
import type React from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type CourseRegistrationButtonProps = {
  courseName: string;
  registrationUrl: string;
  buttonText?: string;
  buttonClassName?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline";
};

const CourseRegistrationButton: React.FC<CourseRegistrationButtonProps> = ({
  courseName,
  registrationUrl,
  buttonText,
  buttonClassName = "",
  className = "",
  size = "lg",
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
    <div className={cn("mb-12 text-center", className)}>
      <Button
        className={cn(
          "shadow-lg transition-shadow duration-200 hover:shadow-xl",
          buttonClassName
        )}
        href={registrationUrl}
        onClick={handleClick}
        rel="noopener noreferrer"
        size={size}
        target="_blank"
        variant={variant}
      >
        {defaultButtonText}
      </Button>
    </div>
  );
};

export default CourseRegistrationButton;
