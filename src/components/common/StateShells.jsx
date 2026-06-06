import React from 'react';

/**
 * Reusable empty/error/loading state shells. Use these instead of ad-hoc
 * spinners + "no data" text so every list view behaves the same way.
 *
 *   <EmptyState title="No orders yet" message="Orders will appear here once customers place them." />
 *   <ErrorState error={error} onRetry={refetch} />
 *   <SkeletonCard /> / <SkeletonTable rows={5} />
 */

export function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      {Icon && (
        <div className="w-16 h-16 mb-4 rounded-full bg-theme-bg-hover flex items-center justify-center text-theme-text-tertiary">
          <Icon className="w-7 h-7" />
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-theme-text-primary mb-1">{title}</h3>
      )}
      {message && (
        <p className="text-sm text-theme-text-tertiary max-w-sm">{message}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong', className = '' }) {
  const message =
    typeof error === 'string'
      ? error
      : error?.message || 'We could not load this content. Please try again.';

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      <div className="w-16 h-16 mb-4 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-theme-text-primary mb-1">{title}</h3>
      <p className="text-sm text-theme-text-tertiary max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonBlock({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-theme-bg-hover rounded-md ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shine bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`p-5 rounded-xl border border-theme-border-primary bg-theme-bg-secondary ${className}`}>
      <SkeletonBlock className="h-4 w-1/3 mb-3" />
      <SkeletonBlock className="h-7 w-2/3 mb-2" />
      <SkeletonBlock className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }) {
  return (
    <div className={`w-full ${className}`} aria-hidden="true">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows * columns }).map((_, i) => (
          <SkeletonBlock key={i} className="h-4" />
        ))}
      </div>
    </div>
  );
}

export default {
  EmptyState,
  ErrorState,
  SkeletonBlock,
  SkeletonCard,
  SkeletonTable,
};
