
export function TechList({ stack, className = '' }: { stack?: string[]; className?: string }) {
  if (!stack?.length) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Technology">
      {stack.map((s) => (
        <li key={s} className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-mute">{s}</li>
      ))}
    </ul>
  );
}
