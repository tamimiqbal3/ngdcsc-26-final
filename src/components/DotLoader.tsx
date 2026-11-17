import React from 'react';

interface DotLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'emerald' | 'white' | 'slate';
  className?: string;
}

export default function DotLoader({
  size = 'md',
  color = 'emerald',
  className = ''
}: DotLoaderProps) {
  const dotSizeClass =
    size === 'sm'
      ? 'w-1.5 h-1.5'
      : size === 'lg'
      ? 'w-3 h-3'
      : 'w-2 h-2';

  const gapClass =
    size === 'sm' ? 'gap-1' : size === 'lg' ? 'gap-2' : 'gap-1.5';

  const colorClass =
    color === 'white'
      ? 'bg-white'
      : color === 'slate'
      ? 'bg-slate-600'
      : 'bg-emerald-600';

  return (
    <span
      className={`inline-flex items-center justify-center ${gapClass} ${className}`}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2, 3].map((idx) => (
        <span
          key={idx}
          className={`rounded-full ${dotSizeClass} ${colorClass} animate-dot-scale`}
          style={{ animationDelay: `${idx * 0.14}s` }}
        />
      ))}
    </span>
  );
}
