// Logo NORTE: rosa dos ventos minimalista em SVG próprio.
export function Compass({ size = 40, ring = true, className }: { size?: number; ring?: boolean; className?: string }) {
  const main = (rot: number) => (
    <g transform={`rotate(${rot})`} key={rot}>
      <polygon points="0,-48 -6.5,-6.5 0,0" fill="currentColor" />
      <polygon points="0,-48 6.5,-6.5 0,0" fill="currentColor" opacity="0.62" />
    </g>
  );
  const minor = (rot: number) => (
    <g transform={`rotate(${rot})`} key={`m${rot}`}>
      <polygon points="0,-24 -4,-4 0,0" fill="currentColor" opacity="0.8" />
      <polygon points="0,-24 4,-4 0,0" fill="currentColor" opacity="0.5" />
    </g>
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {ring && <circle r="31" fill="none" stroke="currentColor" strokeWidth="3.2" />}
      {[45, 135, 225, 315].map(minor)}
      {[0, 90, 180, 270].map(main)}
    </svg>
  );
}
