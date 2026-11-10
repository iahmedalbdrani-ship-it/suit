import Link from "next/link";

/** The Suitly mark (pin + apartment window) taken from the brand logo, in brand colours. */
export function LogoMark({ size = 34, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true" focusable="false">
      <path d="M64 119s41-43 41-72a41 41 0 1 0-82 0c0 29 41 72 41 72Z" fill={light ? "#72B6A2" : "#173B3B"} />
      <rect x="43" y="30" width="42" height="43" rx="8" fill={light ? "#173B3B" : "#F6F1E8"} />
      <rect x="51" y="38" width="11" height="11" rx="2.5" fill="#72B6A2" />
      <rect x="66" y="38" width="11" height="11" rx="2.5" fill="#72B6A2" />
      <rect x="51" y="54" width="11" height="11" rx="2.5" fill="#72B6A2" />
      <rect x="66" y="54" width="11" height="11" rx="2.5" fill="#D5A76B" />
    </svg>
  );
}

export function Logo({ href, light = false, label }: { href: string; light?: boolean; label: string }) {
  return (
    <Link href={href} className="brand" aria-label={label}>
      <LogoMark light={light} />
      <span>
        <span className="brand-word">
          SUIT<span className="ly">LY</span>
        </span>
        <span className="brand-sub">FURNISHED STAYS</span>
      </span>
    </Link>
  );
}
