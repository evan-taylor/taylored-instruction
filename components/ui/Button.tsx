"use client";

import Link from "next/link";
import type React from "react";
import { twMerge } from "tailwind-merge";

<<<<<<< HEAD
interface ButtonProps {
  children: React.ReactNode;
=======
const EXTERNAL_HREF = /^https?:\/\//u;

type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
>>>>>>> origin/master
  className?: string;
  disabled?: boolean;
<<<<<<< HEAD
  href?: string;
  onClick?: () => void;
  rel?: string;
  size?: "sm" | "md" | "lg";
  target?: string;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "outline";
}
=======
  /** Associates a button placed outside its form (e.g. a modal footer). */
  form?: string;
  title?: string;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-pressed"?: boolean;
};
>>>>>>> origin/master

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
  form,
  title,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
  "aria-pressed": ariaPressed,
}: ButtonProps) => {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 whitespace-nowrap active:translate-y-px motion-reduce:active:translate-y-0";

  const variantClasses = {
    outline:
      "bg-transparent border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary",
    primary: "bg-primary text-white hover:bg-primary-dark focus:ring-primary",
    // Improve readability: light background, high-contrast text and border
    secondary:
<<<<<<< HEAD
      "bg-white text-primary border border-gray-300 hover:bg-gray-50 focus:ring-primary shadow-sm",
  };

  const sizeClasses = {
    lg: "text-lg px-8 py-4",
    md: "px-6 py-3",
    sm: "text-sm px-4 py-2",
=======
      "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 focus:ring-primary shadow-xs",
    outline:
      "bg-transparent border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary",
    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-primary",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600 shadow-xs",
  };

  const sizeClasses = {
    xs: "text-xs px-2.5 py-1.5 pointer-coarse:min-h-10",
    sm: "text-sm px-4 py-2 pointer-coarse:min-h-11",
    md: "px-6 py-3 min-h-11",
    lg: "text-lg px-8 py-4 min-h-12",
>>>>>>> origin/master
  };

  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed active:translate-y-0"
    : "";

  const classes = twMerge(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabledClasses,
    className
  );

  if (href) {
    const external = EXTERNAL_HREF.test(href);
    return (
      <Link
        aria-controls={ariaControls}
        aria-expanded={ariaExpanded}
        aria-label={ariaLabel}
        className={classes}
        href={href}
        onClick={onClick}
        rel={
          rel ??
          (external && target === "_blank" ? "noopener noreferrer" : undefined)
        }
        target={external ? target : undefined}
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
      aria-pressed={ariaPressed}
      className={classes}
      disabled={disabled}
      form={form}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </button>
  );
};
