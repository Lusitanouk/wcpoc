interface LsegWorldCheckLogoProps {
  className?: string;
}

/**
 * LSEG World-Check One logo, recreated in SVG from the reference image.
 * White serif wordmark: "LSEG World-Check One"
 */
export function LsegWorldCheckLogo({ className }: LsegWorldCheckLogoProps) {
  return (
    <svg
      viewBox="0 0 560 48"
      role="img"
      aria-label="LSEG World-Check One"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="36"
        fill="currentColor"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="34"
        fontWeight="600"
        letterSpacing="0.5"
      >
        LSEG
      </text>
      <text
        x="118"
        y="36"
        fill="currentColor"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="34"
        fontWeight="400"
        letterSpacing="0.5"
      >
        World-Check One
      </text>
    </svg>
  );
}
