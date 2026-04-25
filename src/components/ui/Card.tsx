import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  hover = false,
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-100 shadow-sm',
        hover && 'hover:shadow-md hover:border-slate-200 transition-all duration-200 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('px-5 py-4 border-b border-slate-100', className)}>
    {children}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('p-5', className)}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl', className)}>
    {children}
  </div>
);
