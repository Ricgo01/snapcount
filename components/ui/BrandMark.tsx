/**
 * SNAPCOUNT brand mark — a football whose lacing reads as tally marks
 * (counting snaps). Inline SVG so it follows the theme's accent color.
 * Same artwork as app/icon.svg (favicon), which uses a fixed color.
 */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: 'none' }}>
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <g transform="rotate(-45 32 32)" stroke="#fff" strokeLinecap="round" fill="none">
        <ellipse cx="32" cy="32" rx="19" ry="12.5" strokeWidth="3.5" />
        <line x1="23" y1="32" x2="41" y2="32" strokeWidth="2.6" />
        <line x1="26" y1="28" x2="26" y2="36" strokeWidth="2.6" />
        <line x1="30" y1="28" x2="30" y2="36" strokeWidth="2.6" />
        <line x1="34" y1="28" x2="34" y2="36" strokeWidth="2.6" />
        <line x1="38" y1="28" x2="38" y2="36" strokeWidth="2.6" />
      </g>
    </svg>
  );
}
