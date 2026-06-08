export type ServerIconKind = 'browndog' | 'whitedog' | 'orangecat';

interface ServerIconProps {
  kind: ServerIconKind;
  size?: number;
}

/** Small animal mascots used to label each stream server. */
export default function ServerIcon({ kind, size = 18 }: ServerIconProps) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const };

  if (kind === 'orangecat') {
    return (
      <svg {...common}>
        {/* ears */}
        <path d="M5 2.5 8.5 9 3 8.5Z" fill="#f97316" />
        <path d="M19 2.5 21 8.5 15.5 9Z" fill="#f97316" />
        <path d="M5.6 4 7.7 8 4.3 7.7Z" fill="#fdba74" />
        <path d="M18.4 4 19.7 7.7 16.3 8Z" fill="#fdba74" />
        {/* head */}
        <circle cx="12" cy="13" r="7.2" fill="#fb923c" />
        {/* eyes */}
        <ellipse cx="9.3" cy="12" rx="1" ry="1.4" fill="#1f2937" />
        <ellipse cx="14.7" cy="12" rx="1" ry="1.4" fill="#1f2937" />
        {/* nose + mouth */}
        <path d="M11 14.6 13 14.6 12 15.8Z" fill="#7c2d12" />
        {/* whiskers */}
        <g stroke="#7c2d12" strokeWidth=".5" strokeLinecap="round">
          <path d="M11.4 15.4 5.5 14.2M11.4 16 6 16.4M12.6 15.4 18.5 14.2M12.6 16 18 16.4" />
        </g>
      </svg>
    );
  }

  // Brown vs white dog share the same shape, different palette.
  const isWhite = kind === 'whitedog';
  const body = isWhite ? '#f3f4f6' : '#a16207';
  const ear = isWhite ? '#d1d5db' : '#78350f';
  const snout = isWhite ? '#ffffff' : '#ca8a04';
  const stroke = isWhite ? '#9ca3af' : 'none';

  return (
    <svg {...common}>
      <g stroke={stroke} strokeWidth={isWhite ? 0.8 : 0}>
        {/* floppy ears */}
        <ellipse cx="5" cy="10" rx="2.8" ry="5.2" fill={ear} />
        <ellipse cx="19" cy="10" rx="2.8" ry="5.2" fill={ear} />
        {/* head */}
        <circle cx="12" cy="12" r="7" fill={body} />
        {/* snout */}
        <ellipse cx="12" cy="15" rx="4" ry="3" fill={snout} />
      </g>
      {/* nose + eyes */}
      <ellipse cx="12" cy="14" rx="1.4" ry="1.1" fill="#1f2937" />
      <circle cx="9.4" cy="10.8" r="1" fill="#1f2937" />
      <circle cx="14.6" cy="10.8" r="1" fill="#1f2937" />
    </svg>
  );
}
