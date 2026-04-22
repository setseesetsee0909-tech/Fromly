export function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 shrink-0"
      >
        <rect x="3" y="3" width="26" height="26" rx="7" fill="hsl(var(--primary) / 0.1)" stroke="currentColor" strokeWidth="2.2" className="text-primary" />
        <path
          d="M10 11h12M10 16h8M10 21h5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="text-primary"
        />
      </svg>
      <span className="text-xl font-bold tracking-tight text-foreground">Formly</span>
    </div>
  );
}