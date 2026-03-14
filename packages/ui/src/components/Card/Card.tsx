import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}
