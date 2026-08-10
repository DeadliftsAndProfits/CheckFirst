/**
 * Check First brand mark + wordmark.
 * Mark: white tile, black magnifying glass, green tick — "search + verified".
 * Simple, geometric, legible at favicon size.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      {/* magnifying glass */}
      <circle cx="17" cy="17" r="9" stroke="#0f172a" strokeWidth="3" fill="none" />
      <line x1="23.5" y1="23.5" x2="31.5" y2="31.5" stroke="#0f172a" strokeWidth="3.6" strokeLinecap="round" />
      {/* green tick inside the lens */}
      <path d="M12.5 17.4l3.1 3.1 6-6.6" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="text-lg font-bold tracking-tight text-ink">
        Check<span className="text-brand-600">First</span>
      </span>
    </span>
  );
}
