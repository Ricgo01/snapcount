interface Props { small?: boolean; }

export function LiveBadge({ small }: Props) {
  return (
    <span className={`live-badge${small ? ' sm' : ''}`}>
      <span className="live-dot" />LIVE
    </span>
  );
}
