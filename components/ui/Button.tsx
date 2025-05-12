'use client'

import React from 'react'
import Link from 'next/link'
import { twMerge } from 'tailwind-merge'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  href?: string
  target?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  href,
  target,
  onClick,
  type = 'button',
  disabled = false,
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-secondary text-white hover:opacity-90 focus:ring-secondary',
    outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary',
  }
  
  const sizeClasses = {
    sm: 'text-sm px-4 py-2',
    md: 'px-6 py-3',
    lg: 'text-lg px-8 py-4',
  }
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''
  
  const classes = twMerge(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabledClasses,
    className
  )
  
  if (href) {
    return (
      <Link 
        href={href} 
        className={classes}
        target={target}
      >
        {children}
      </Link>
    )
  }
  
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
} 