"use client";

import Link from "next/link";
import type React from "react";
import { twMerge } from "tailwind-merge";

type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
};

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
  title,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
}: ButtonProps) => {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 whitespace-nowrap";

  const variantClasses = {
    primary: "bg-primary text-white hover:bg-primary-dark focus:ring-primary",
    // Improve readability: light background, high-contrast text and border
    secondary:
      "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 focus:ring-primary shadow-xs",
    outline:
      "bg-transparent border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary",
    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-primary",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600 shadow-xs",
  };

  const sizeClasses = {
    xs: "text-xs px-2.5 py-1.5",
    sm: "text-sm px-4 py-2",
    md: "px-6 py-3",
    lg: "text-lg px-8 py-4",
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
      <Link
        aria-controls={ariaControls}
        aria-expanded={ariaExpanded}
        aria-label={ariaLabel}
        className={classes}
        href={href}
        rel={rel}
        target={target}
        title={title}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </button>
  );
};
