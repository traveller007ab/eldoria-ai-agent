import React from 'react';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const classNames = [
    'ah-button',
    `ah-button--${variant}`,
    `ah-button--${size}`,
    fullWidth && 'ah-button--full-width',
    isLoading && 'ah-button--loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classNames}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="ah-button__spinner" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeLinecap="round" />
        </svg>
      ) : (
        <>
          {leftIcon && <span className="ah-button__icon ah-button__icon--left">{leftIcon}</span>}
          <span className="ah-button__label">{children}</span>
          {rightIcon && <span className="ah-button__icon ah-button__icon--right">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
