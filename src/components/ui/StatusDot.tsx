import { profile } from '@/data/profile';

export function Availability({ className = '' }: { className?: string }) {
  const { available, label } = profile.availability;
  if (!label) return null;
  return (
    <p className={`inline-flex items-center gap-2.5 text-sm text-bone ${className}`}>
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ background: available ? '#16A362' : 'var(--mute)', animation: available ? 'pulse-dot 2.4s infinite' : undefined }}
      />
      {label}
    </p>
  );
}
