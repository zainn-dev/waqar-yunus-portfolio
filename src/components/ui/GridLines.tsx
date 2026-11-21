/** Thin vertical editorial grid lines (decorative). */
export function GridLines({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      {[7.5, 26, 44.5, 63, 81.5].map((x) => (
        <span key={x} className="absolute inset-y-0 w-px bg-[#111]/[0.07]" style={{ left: `${x}%` }} />
      ))}
    </div>
  );
}
