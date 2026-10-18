/** Shared gradients, patterns and filters for every drawn part (ids are document-global). */
export function Defs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {/* Surfaces */}
        <linearGradient id="d-dashTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#36516f" />
          <stop offset="0.55" stopColor="#2a425c" />
          <stop offset="1" stopColor="#1c2c3e" />
        </linearGradient>
        <linearGradient id="d-dashFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1620" />
          <stop offset="1" stopColor="#080d13" />
        </linearGradient>
        <linearGradient id="d-lowFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10161e" />
          <stop offset="1" stopColor="#05080c" />
        </linearGradient>
        <linearGradient id="d-door" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#09111a" />
          <stop offset="0.45" stopColor="#04080d" />
          <stop offset="1" stopColor="#010305" />
        </linearGradient>
        <linearGradient id="d-doorTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2c40" />
          <stop offset="0.22" stopColor="#0b141d" />
          <stop offset="1" stopColor="#070e15" />
        </linearGradient>
        <linearGradient id="d-pillar" x1="0" y1="0" x2="1" y2="0.18">
          <stop offset="0" stopColor="#0d0f13" />
          <stop offset="0.55" stopColor="#17181c" />
          <stop offset="0.8" stopColor="#25282f" />
          <stop offset="0.92" stopColor="#555a67" />
          <stop offset="1" stopColor="#7a7787" />
        </linearGradient>
        <linearGradient id="d-pillarShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.25" />
          <stop offset="1" stopColor="#000" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="d-pillarR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a4250" />
          <stop offset="0.12" stopColor="#161a21" />
          <stop offset="1" stopColor="#0b0e14" />
        </linearGradient>
        <linearGradient id="d-stack" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#06090e" />
          <stop offset="0.5" stopColor="#080b11" />
          <stop offset="1" stopColor="#04060a" />
        </linearGradient>
        <linearGradient id="d-console" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070b" />
          <stop offset="1" stopColor="#010203" />
        </linearGradient>
        <linearGradient id="d-piano" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c222c" />
          <stop offset="0.12" stopColor="#090c11" />
          <stop offset="0.7" stopColor="#040507" />
          <stop offset="1" stopColor="#0b0e13" />
        </linearGradient>
        <linearGradient id="d-bezel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1f2530" />
          <stop offset="0.08" stopColor="#0c0f15" />
          <stop offset="1" stopColor="#07090d" />
        </linearGradient>
        <linearGradient id="d-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020408" />
          <stop offset="1" stopColor="#000102" />
        </linearGradient>

        {/* Metal */}
        <linearGradient id="d-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#c8cfd9" />
          <stop offset="0.65" stopColor="#6d7583" />
          <stop offset="1" stopColor="#262b33" />
        </linearGradient>
        <linearGradient id="d-chromeH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a4049" />
          <stop offset="0.3" stopColor="#e9edf3" />
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="0.8" stopColor="#9aa2ae" />
          <stop offset="1" stopColor="#2f343c" />
        </linearGradient>
        <linearGradient id="d-satin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9ced6" />
          <stop offset="0.5" stopColor="#7b828d" />
          <stop offset="1" stopColor="#3a3f47" />
        </linearGradient>
        <linearGradient id="d-pedal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a5260" />
          <stop offset="0.45" stopColor="#1f242c" />
          <stop offset="1" stopColor="#0a0c10" />
        </linearGradient>

        {/* Leather */}
        <radialGradient id="d-leather" cx="0.42" cy="0.18" r="0.9">
          <stop offset="0" stopColor="#2d2e36" />
          <stop offset="0.35" stopColor="#15181e" />
          <stop offset="1" stopColor="#07090c" />
        </radialGradient>
        <radialGradient id="d-seat" cx="0.68" cy="0.35" r="0.85">
          <stop offset="0" stopColor="#4a4448" />
          <stop offset="0.35" stopColor="#22252c" />
          <stop offset="1" stopColor="#05070a" />
        </radialGradient>
        <radialGradient id="d-hub" cx="0.45" cy="0.25" r="0.85">
          <stop offset="0" stopColor="#1d2026" />
          <stop offset="0.55" stopColor="#121418" />
          <stop offset="1" stopColor="#090a0d" />
        </radialGradient>
        <linearGradient id="d-rimLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.12" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Cluster / screens */}
        <radialGradient id="d-clusterBg" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#040912" />
          <stop offset="1" stopColor="#010204" />
        </radialGradient>

        {/* Patterns */}
        <pattern id="d-perf" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="0.9" fill="#000" opacity="0.65" />
        </pattern>
        <pattern id="d-grille" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="2.5" cy="2.5" r="1.1" fill="#000" opacity="0.8" />
          <circle cx="2" cy="2" r="0.5" fill="#3a4350" opacity="0.5" />
        </pattern>
        <pattern id="d-ribs" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect width="9" height="4" fill="#0f141c" />
        </pattern>

        {/* Filters */}
        <filter id="d-b1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1" /></filter>
        <filter id="d-b3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="d-b8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="d-b20" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="20" /></filter>
        <filter id="d-b40" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="40" /></filter>
        <filter id="d-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.09" />
          </feComponentTransfer>
        </filter>
        <filter id="d-leatherGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="3" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.14" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
