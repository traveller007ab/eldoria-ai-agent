import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick
}) => {
  const classNames = [
    'ah-card',
    `ah-card--padding-${padding}`,
    hover && 'ah-card--hover',
    className
  ].filter(Boolean).join(' ');

  if (onClick) {
    return (
      <div className={classNames} onClick={onClick} role="button" tabIndex={0}>
        {children}
      </div>
    );
  }

  return (
    <div className={classNames}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`ah-card-header ${className}`}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return (
    <h3 className={`ah-card-title ${className}`}>
      {children}
    </h3>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`ah-card-content ${className}`}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`ah-card-footer ${className}`}>
      {children}
    </div>
  );
};

export default Card;
