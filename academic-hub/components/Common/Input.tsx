import React, { useState } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);

  return (
    <div className={`ah-input-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="ah-input-label">
          {label}
        </label>
      )}
      <div className={`ah-input-container ${hasError ? 'has-error' : ''}`}>
        {leftIcon && <span className="ah-input-icon ah-input-icon--left">{leftIcon}</span>}
        <input
          id={inputId}
          className={`ah-input ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''}`}
          {...props}
        />
        {rightIcon && <span className="ah-input-icon ah-input-icon--right">{rightIcon}</span>}
      </div>
      {error && <span className="ah-input-error">{error}</span>}
      {helperText && !error && <span className="ah-input-helper">{helperText}</span>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);

  return (
    <div className={`ah-input-wrapper ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="ah-input-label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`ah-textarea ${hasError ? 'has-error' : ''}`}
        {...props}
      />
      {error && <span className="ah-input-error">{error}</span>}
      {helperText && !error && <span className="ah-input-helper">{helperText}</span>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);

  return (
    <div className={`ah-input-wrapper ${className}`}>
      {label && (
        <label htmlFor={selectId} className="ah-input-label">
          {label}
        </label>
      )}
      <div className={`ah-select-container ${hasError ? 'has-error' : ''}`}>
        <select id={selectId} className="ah-select" {...props}>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && <span className="ah-input-error">{error}</span>}
      {helperText && !error && <span className="ah-input-helper">{helperText}</span>}
    </div>
  );
};

export default Input;
