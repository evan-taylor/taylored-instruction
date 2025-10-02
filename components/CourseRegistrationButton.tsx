"use client";

import type React from "react";
import { Button } from "@/components/ui/Button";

interface CourseRegistrationButtonProps {
  courseName: string;
  registrationUrl: string;
  buttonText?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
}

const CourseRegistrationButton: React.FC<CourseRegistrationButtonProps> = ({
  courseName,
  registrationUrl,
  buttonText,
  className = "",
  variant = "primary",
}) => {
  const defaultButtonText = buttonText || `Register for ${courseName}`;

  return (
    <div className={`mb-12 text-center ${className}`}>
      <Button
        href={registrationUrl}
        size="lg"
        variant={variant}
        target="_blank"
        rel="noopener noreferrer"
        className="shadow-lg hover:shadow-xl transition-shadow duration-200"
      >
        {defaultButtonText}
      </Button>
    </div>
  );
};

export default CourseRegistrationButton;