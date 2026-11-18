import React from 'react';

export default function LoadingSpinner({ size = 'md', color = 'black', className = '' }) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-2'
  };

  const colorClasses = {
    black: 'border-neutral-900 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-neutral-400 border-t-transparent'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`rounded-full animate-spin ${sizeClasses[size] || sizeClasses.md} ${
          colorClasses[color] || colorClasses.black
        }`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
}
