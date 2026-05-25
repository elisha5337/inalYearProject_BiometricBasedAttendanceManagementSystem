import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface SkeletonLoaderProps {
  className?: string; // Optional custom wrapper classes
  rows?: number;         // For tables
  type?: 'card' | 'table' | 'text';
}

export default function SkeletonLoader({ className, rows = 5, type = 'card' }: SkeletonLoaderProps) {
  if (type === 'table') {
    return (
      <div className={cn("w-full professional-card overflow-hidden", className)}>
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 relative overflow-hidden">
          <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="p-0">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex gap-4 border-b border-slate-50 last:border-0 items-center">
              <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse"></div>
                <div className="h-3 bg-slate-50 rounded w-1/4 animate-pulse"></div>
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse"></div>
              <div className="h-8 w-8 bg-slate-100 rounded-2xl animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
        <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse"></div>
      </div>
    );
  }

  // Default 'card'
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("professional-card p-6 space-y-4", className)}
    >
      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
        <div className="h-12 w-12 bg-slate-200 rounded-2xl animate-pulse"></div>
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-slate-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-3 bg-slate-100 rounded w-1/4 animate-pulse"></div>
        </div>
      </div>
      <div className="space-y-3 pt-2">
         <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
         <div className="h-4 bg-slate-100 rounded w-4/5 animate-pulse"></div>
      </div>
      <div className="pt-4 flex justify-end">
         <div className="h-10 w-28 bg-slate-200 rounded-2xl animate-pulse"></div>
      </div>
    </motion.div>
  );
}
