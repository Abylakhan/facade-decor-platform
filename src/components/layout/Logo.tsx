/** Wordmark with an architectural capital mark. Placeholder brand. */
export function Logo({ light = false }: { light?: boolean }) {
  const c = light ? "#fffdf9" : "#1b1a18";
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path d="M2 4h22M4 7h18M6 7v15M20 7v15M10 7v15M16 7v15M3 22h20M2 24.5h22" stroke={c} strokeWidth="1.2" />
        <path d="M2 4 13 1l11 3" stroke="#b48450" strokeWidth="1.2" />
      </svg>
      <span className={`font-display text-[21px] leading-none tracking-[0.02em] ${light ? "text-white" : "text-ink"}`}>Atelier Façade</span>
    </span>
  );
}
