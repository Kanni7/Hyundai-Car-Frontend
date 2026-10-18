import { CABIN_H, CABIN_W, STRIPS } from './geometry';

/**
 * Ambient light pipes and the light they spill onto nearby trim. Blended with
 * `screen`, coloured through CSS `color`, so a colour change is one cheap repaint
 * and party mode is a GPU hue-rotate on this layer alone.
 */
export function Ambient({ color, level, party }: { color: string; level: number; party: boolean }) {
  return (
    <svg className={`part ambient-layer ${party ? 'party' : ''}`}
      style={{ left: 0, top: 0, width: CABIN_W, height: CABIN_H, color, opacity: level }}
      viewBox={`0 0 ${CABIN_W} ${CABIN_H}`}>
      {/* Spill: footwells, door card under the lower pipe, dash face */}
      <g fill="currentColor">
        <ellipse cx="770" cy="665" rx="165" ry="85" opacity="0.24" filter="url(#d-b40)" />
        <ellipse cx="1560" cy="760" rx="220" ry="55" opacity="0.14" filter="url(#d-b40)" />
        <ellipse cx="1650" cy="745" rx="120" ry="40" opacity="0.18" filter="url(#d-b20)" />
        <path d="M1365 668 L1438 664 L1448 800 L1372 806 Z" opacity="0.07" />
      </g>
      <path d="M75 762 C 200 712, 300 672, 340 650 C 372 630, 384 616, 412 603 L 572 527" stroke="currentColor" strokeWidth="46" opacity="0.18" filter="url(#d-b20)" fill="none" />
      <path d="M0 464 Q 290 402 572 361" stroke="currentColor" strokeWidth="36" opacity="0.12" filter="url(#d-b20)" fill="none" />
      <path d="M625 440 C 760 457, 880 478, 948 510" stroke="currentColor" strokeWidth="34" opacity="0.18" filter="url(#d-b20)" fill="none" />
      <path d="M622 358 Q 790 372 962 384" stroke="currentColor" strokeWidth="26" opacity="0.14" filter="url(#d-b20)" fill="none" />

      {/* The pipes: wide halo, inner glow, coloured body, near-white core */}
      {STRIPS.map((d) => <path key={`h${d}`} d={d} stroke="currentColor" strokeWidth="14" opacity="0.16" filter="url(#d-b8)" fill="none" strokeLinecap="round" />)}
      {STRIPS.map((d) => <path key={`g${d}`} d={d} stroke="currentColor" strokeWidth="5" opacity="0.55" filter="url(#d-b3)" fill="none" strokeLinecap="round" />)}
      {STRIPS.map((d) => <path key={`b${d}`} d={d} stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />)}
      {STRIPS.map((d) => <path key={`c${d}`} d={d} stroke="#ffffff" strokeWidth="1" opacity="0.75" fill="none" strokeLinecap="round" />)}
    </svg>
  );
}
