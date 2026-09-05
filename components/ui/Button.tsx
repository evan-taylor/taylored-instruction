"use client";

import Link from "next/link";
import type React from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  rel?: string;
  size?: "sm" | "md" | "lg";
  target?: string;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "outline";
}

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  href,
  target,
  rel,
  onClick,
  type = "button",
  disabled = false,
}: ButtonProps) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = {
    outline:
      "bg-transparent border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary",
    primary: "bg-primary text-white hover:bg-primary-dark focus:ring-primary",
    // Improve readability: light background, high-contrast text and border
    secondary:
      "bg-white text-primary border border-gray-300 hover:bg-gray-50 focus:ring-primary shadow-sm",
  };

  const sizeClasses = {
    lg: "text-lg px-8 py-4",
    md: "px-6 py-3",
    sm: "text-sm px-4 py-2",
  };

  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  const classes = twMerge(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabledClasses,
    className
  );

  if (href) {
    return (
      <Link className={classes} href={href} rel={rel} target={target}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
};
