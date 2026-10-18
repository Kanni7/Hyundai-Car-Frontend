import { useEffect, useRef } from 'react';
import type { RGB } from '../lib/ambient';

// Luminance weights favour blue: the source LEDs are blue/purple, so B carries their brightness.
const WR = 0.15, WG = 0.25, WB = 0.8;

function tintMatrix([r, g, b]: RGB, k: number) {
  const row = (c: number) => `${WR * c * k} ${WG * c * k} ${WB * c * k} 0 0`;
  return `${row(r)} ${row(g)} ${row(b)} 0 0 0 0 1`;
}

/**
 * SVG filter that finds the cabin's LED strips (strongly blue pixels) and
 * re-lights them in any colour. Applied to a copy of the photo clipped to the
 * interior, so the sky and city outside stay untouched.
 */
export function AmbientFilter({ id, color, gain, threshold }: {
  id: string; color: RGB; gain: number; threshold: number;
}) {
  const tintRef = useRef<SVGFEColorMatrixElement>(null);
  const current = useRef<{ c: RGB; k: number }>({ c: color, k: gain });

  useEffect(() => {
    const el = tintRef.current;
    if (!el) return;
    // Short eased cross-fade; throttled because every update re-runs the filter over the photo.
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / 600);
      if (t - last > 40 || p === 1) {
        last = t;
        const e = 1 - (1 - p) ** 3;
        const c = from.c.map((v, i) => v + (color[i] - v) * e) as RGB;
        const k = from.k + (gain - from.k) * e;
        current.current = { c, k };
        el.setAttribute('values', tintMatrix(c, k));
      }
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [color, gain]);

  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" result="mask"
          values={`0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2 -1 3.2 0 ${-threshold}`} />
        <feColorMatrix ref={tintRef} in="SourceGraphic" type="matrix" result="tint" values={tintMatrix(color, gain)} />
        <feComposite in="tint" in2="mask" operator="in" result="lit" />
        <feComposite in="lit" in2="SourceGraphic" operator="over" />
      </filter>
    </svg>
  );
}
