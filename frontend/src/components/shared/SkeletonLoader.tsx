/**
 * SkeletonLoader — reusable skeleton loading states for cards, tables, list items, and charts
 */

import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'table-row' | 'avatar' | 'chart';
  count?: number;
}

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/[0.06] rounded ${className}`} />
);

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  count = 1,
}) => {
  const items = Array.from({ length: count });

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-3 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={`space-y-2 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
          >
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="h-64 flex items-end gap-3 pt-8">
          {[40, 65, 30, 85, 50, 90, 70, 45, 60, 80].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-white/[0.06] rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'avatar') {
    return <Skeleton className={`h-10 w-10 rounded-full ${className}`} />;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
};

export default SkeletonLoader;
