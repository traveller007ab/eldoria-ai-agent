/**
 * UI Components - Dialog
 * Unified dialog/modal component
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/index';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  showCloseButton = true
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const sizeStyles: Record<typeof size, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div
        className={cn(
          'relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col',
          sizeStyles[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            {title && (
              <h2 id="dialog-title" className="text-lg font-semibold text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children
}) => (
  <div className={cn('flex items-center justify-between px-6 py-4 border-b border-gray-700', className)}>
    {children}
  </div>
);

export const DialogBody: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children
}) => (
  <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)}>
    {children}
  </div>
);

export const DialogFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children
}) => (
  <div className={cn('px-6 py-4 border-t border-gray-700 bg-gray-800/50', className)}>
    {children}
  </div>
);
