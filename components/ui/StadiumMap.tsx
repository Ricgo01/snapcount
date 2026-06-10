/**
 * Google Maps embed for a stadium, resolved by name at runtime — no API key,
 * no database. `t=h` (hybrid/satellite) shows the actual stadium from above,
 * doubling as the venue photo. Works for any venue name ESPN sends,
 * including international games (Wembley, Allianz Arena, etc.).
 */
interface Props {
  /** Free-form place query, e.g. "Arrowhead Stadium Kansas City" */
  query: string;
  title?: string;
}

export function StadiumMap({ query, title }: Props) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=h&z=16&output=embed`;
  return (
    <iframe
      className="map-embed"
      src={src}
      title={title ?? `Mapa de ${query}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
