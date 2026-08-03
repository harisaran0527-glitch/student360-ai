import React from "react";

export const Skeleton: React.FC<{ className?: string }> = ({ className = "h-4 w-full" }) => {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`} />
  );
};
