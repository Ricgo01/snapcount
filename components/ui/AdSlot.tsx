const AD_VARIANTS: Record<string, { label: string }> = {
  sidebar: { label: "160 × 600" },
  inline:  { label: "300 × 250" },
  mobile:  { label: "320 × 100" },
};

interface Props { variant?: 'sidebar' | 'inline' | 'mobile'; }

export function AdSlot({ variant = 'inline' }: Props) {
  const v = AD_VARIANTS[variant] || AD_VARIANTS.inline;
  return (
    <aside className={`gx-promo gx-promo--${variant}`} role="complementary" aria-label="Espacio publicitario">
      <span className="gx-promo-tag">Publicidad</span>
      <span className="gx-promo-size">{v.label}</span>
    </aside>
  );
}
