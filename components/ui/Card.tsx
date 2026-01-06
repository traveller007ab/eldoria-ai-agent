/**
 * UI Components - Card
 * Unified card component for content containers
 */

import React from 'react';
import { cn } from '../../utils/index';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps {
  variant?: CardVariant;
  size?: CardSize;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  size = 'md',
  className,
  children,
  onClick
}) => {
  const baseStyles = 'rounded-lg transition-all duration-200';
  
  const variantStyles: Record<CardVariant, string> = {
    default: 'bg-gray-900/95 backdrop-blur-sm border border-gray-700',
    elevated: 'bg-gray-800 border border-gray-700 shadow-lg',
    outlined: 'bg-transparent border-2 border-gray-600',
    filled: 'bg-gray-800 border-none',
  };
  
  const sizeStyles: Record<CardSize, string> = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
  
  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        onClick && 'cursor-pointer hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children
}) => (
  <div className={cn('flex items-center justify-between mb-3 pb-3 border-b border-gray-700', className)}>
    {children}
  </div>
);

export const CardBody: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children
}) => (
  <div className={cn('', className)}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children
}) => (
  <div className={cn('flex items-center justify-between mt-3 pt-3 border-t border-gray-700', className)}>
    {children}
  </div>
);
