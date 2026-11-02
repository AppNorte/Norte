// Fundo do topo: céu ao amanhecer, montanhas e pinheiros, tudo em SVG (sem imagens).

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function trees(seed: number, width: number, baseY: number, minH: number, maxH: number, step: number) {
  const r = rng(seed);
  let d = "";
  for (let x = -10; x < width + 10; x += step * (0.6 + r() * 0.8)) {
    const h = minH + r() * (maxH - minH);
    const w = h * (0.32 + r() * 0.08);
    const b = baseY + r() * 6;
    // pinheiro em três camadas
    d += `M${x - w / 2},${b} L${x},${b - h} L${x + w / 2},${b} Z `;
    d += `M${x - w * 0.42},${b - h * 0.32} L${x},${b - h * 1.04} L${x + w * 0.42},${b - h * 0.32} Z `;
  }
  return d;
}

export function Backdrop({ variant = "header", className = "hero-backdrop" }: { variant?: "header" | "splash"; className?: string }) {
  if (variant === "splash") {
    return (
      <svg className={className} viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="sp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#13304a" />
            <stop offset="0.45" stopColor="#24435f" />
            <stop offset="0.62" stopColor="#56677a" />
            <stop offset="0.7" stopColor="#8b8a85" />
          </linearGradient>
          <radialGradient id="sp-sun" cx="0.86" cy="0.555" r="0.45">
            <stop offset="0" stopColor="#ffe2b0" stopOpacity="0.95" />
            <stop offset="0.12" stopColor="#f2c58b" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#c99f78" stopOpacity="0.12" />
            <stop offset="1" stopColor="#c99f78" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sp-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9d0d8" />
            <stop offset="0.35" stopColor="#6d7f92" />
            <stop offset="1" stopColor="#3b4f66" />
          </linearGradient>
          <linearGradient id="sp-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b5068" />
            <stop offset="1" stopColor="#22344a" />
          </linearGradient>
          <linearGradient id="sp-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.55" stopColor="#0c1826" stopOpacity="0" />
            <stop offset="1" stopColor="#0a141f" stopOpacity="0.95" />
          </linearGradient>
          <filter id="sp-blur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <rect width="400" height="860" fill="url(#sp-sky)" />
        <rect width="400" height="860" fill="url(#sp-sun)" />
        <g fill="#e9d6bd" opacity="0.18" filter="url(#sp-blur)">
          <ellipse cx="320" cy="300" rx="90" ry="9" />
          <ellipse cx="60" cy="390" rx="80" ry="7" />
          <ellipse cx="300" cy="450" rx="110" ry="8" />
        </g>
        <circle cx="345" cy="478" r="7" fill="#fff4dc" />
        <path
          d="M0,520 L30,498 L58,506 L96,474 L128,492 L160,470 L196,490 L222,478 L262,446 L292,468 L322,458 L350,476 L376,462 L400,474 L400,600 L0,600 Z"
          fill="url(#sp-far)"
        />
        <path
          d="M0,560 L40,536 L84,548 L130,522 L170,546 L214,528 L254,552 L300,520 L344,540 L400,512 L400,640 L0,640 Z"
          fill="url(#sp-mid)"
        />
        <g fill="#dfe5ea" opacity="0.32" filter="url(#sp-blur)">
          <ellipse cx="120" cy="602" rx="120" ry="12" />
          <ellipse cx="300" cy="620" rx="140" ry="14" />
        </g>
        <path d={trees(7, 400, 640, 34, 62, 13)} fill="#1a2a3a" />
        <path d="M0,640 L400,640 L400,860 L0,860 Z" fill="#132131" />
        <path d={trees(19, 400, 720, 70, 120, 24)} fill="#0f1b28" />
        <path d="M0,720 L400,720 L400,860 L0,860 Z" fill="#0e1925" />
        <path d={trees(41, 400, 860, 120, 210, 34)} fill="#0b151f" />
        <rect width="400" height="860" fill="url(#sp-fade)" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 400 250" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="hd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13304a" />
          <stop offset="0.55" stopColor="#25445f" />
          <stop offset="0.85" stopColor="#4f6377" />
        </linearGradient>
        <radialGradient id="hd-sun" cx="0.82" cy="0.62" r="0.5">
          <stop offset="0" stopColor="#ffe3b5" stopOpacity="0.9" />
          <stop offset="0.12" stopColor="#efc893" stopOpacity="0.45" />
          <stop offset="0.55" stopColor="#b79a7f" stopOpacity="0.1" />
          <stop offset="1" stopColor="#b79a7f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hd-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f9cab" />
          <stop offset="1" stopColor="#3c516a" />
        </linearGradient>
        <linearGradient id="hd-dim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e2a45" stopOpacity="0.15" />
          <stop offset="0.5" stopColor="#0e2a45" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="400" height="250" fill="url(#hd-sky)" />
      <rect width="400" height="250" fill="url(#hd-sun)" />
      <circle cx="328" cy="150" r="5" fill="#fff3da" />
      <path
        d="M120,190 L170,168 L206,176 L240,154 L270,166 L300,146 L322,156 L352,138 L378,150 L400,144 L400,250 L120,250 Z"
        fill="url(#hd-far)"
        opacity="0.9"
      />
      <path
        d="M0,206 L40,192 L80,198 L130,180 L176,196 L220,182 L262,194 L300,176 L344,190 L400,174 L400,250 L0,250 Z"
        fill="#2b415a"
      />
      <path
        d="M0,226 L50,212 L104,220 L160,206 L216,218 L270,204 L330,216 L400,202 L400,250 L0,250 Z"
        fill="#1d3047"
      />
      <path d={trees(5, 400, 236, 18, 40, 14)} fill="#15253a" />
      <path d="M0,236 L400,236 L400,250 L0,250 Z" fill="#15253a" />
      <rect width="400" height="250" fill="url(#hd-dim)" />
    </svg>
  );
}
