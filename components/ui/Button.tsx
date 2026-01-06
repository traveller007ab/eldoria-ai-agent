/**
 * UI Components - Button
 * Unified button component with variants and sizes
 */

import React from 'react';
import { cn } from '../../utils/index';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white focus:ring-cyan-500',
    secondary: 'bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white focus:ring-gray-500',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300 focus:ring-gray-500',
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white focus:ring-green-500',
  };
  
  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'px-2 py-1 text-xs rounded-sm',
    sm: 'px-3 py-1.5 text-sm rounded',
    md: 'px-4 py-2 text-sm rounded-md',
    lg: 'px-6 py-2.5 text-base rounded-md',
    xl: 'px-8 py-3 text-lg rounded-lg',
  };
  
  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0 2.534-.868 4.869-2.312 6.709l1.429 1.429A9.962 9.962 0 0120 12c0-5.523-4.477-10-10-10H6a10 10 0 000 10v-2a8 8 0 000-8v8h4z"
          />
        </svg>
      ) : (
        <>
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
