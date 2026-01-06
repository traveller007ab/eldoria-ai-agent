/**
 * UI Components - Input
 * Unified input component with variants and sizes
 */

import React from 'react';
import { cn } from '../../utils/index';

export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  variant = 'default',
  size = 'md',
  error = false,
  leftIcon,
  rightIcon,
  label,
  helperText,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'w-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles: Record<InputVariant, string> = {
    default: 'bg-gray-800 border border-gray-700 focus:border-cyan-500',
    filled: 'bg-gray-900 border-2 border-transparent focus:border-cyan-500',
    outlined: 'bg-transparent border-2 border-gray-700 focus:border-cyan-500',
  };
  
  const sizeStyles: Record<InputSize, string> = {
    sm: 'px-2 py-1 text-sm rounded',
    md: 'px-3 py-2 text-sm rounded-md',
    lg: 'px-4 py-3 text-base rounded-lg',
  };
  
  const errorStyles = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : '';
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          className={cn(
            baseStyles,
            variantStyles[variant],
            sizeStyles[size],
            errorStyles,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          disabled={disabled}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {helperText && (
        <p className={`mt-1 text-xs ${error ? 'text-red-400' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};
