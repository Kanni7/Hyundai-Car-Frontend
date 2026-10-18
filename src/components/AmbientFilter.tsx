import { useEffect, useRef } from 'react';
import type { RGB } from '../lib/ambient';
import { rotateHue, runAmbientFx, type FxFrame } from '../lib/ambientFx';
import type { AmbientMode } from '../types';

// Luminance weights favour blue: the source LEDs are blue/purple, so B carries their brightness.
const WR = 0.15, WG = 0.25, WB = 0.8;

function tintMatrix([r, g, b]: RGB, k: number) {
  const row = (c: number) => `${WR * c * k} ${WG * c * k} ${WB * c * k} 0 0`;
  return `${row(r)} ${row(g)} ${row(b)} 0 0 0 0 1`;
}

/**
 * SVG filter that finds the cabin's LED strips (strongly blue pixels) and
 * re-lights them in any colour. Applied to a copy of the photo clipped to the
 * interior, so the sky and city outside stay untouched. Light effects (breathe,
 * music sync, rainbow…) modulate the tint itself, so only the strips change.
 */
export function AmbientFilter({ id, color, gain, threshold, mode }: {
  id: string; color: RGB; gain: number; threshold: number; mode: AmbientMode;
}) {
  const tintRef = useRef<SVGFEColorMatrixElement>(null);
  const current = useRef<{ c: RGB; k: number }>({ c: color, k: gain });
  const fx = useRef<FxFrame>({ level: 1, hue: 0 });
  const lastWrite = useRef(0);

  // Throttled because every update re-runs the filter over the photo.
  const write = (force = false) => {
    const now = performance.now();
    if (!force && now - lastWrite.current < 40) return;
    lastWrite.current = now;
    const { c, k } = current.current;
    tintRef.current?.setAttribute('values', tintMatrix(rotateHue(c, fx.current.hue), k * fx.current.level));
  };

  useEffect(() => {
    // Short eased cross-fade to the new colour and gain.
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / 600);
      const e = 1 - (1 - p) ** 3;
      current.current = { c: from.c.map((v, i) => v + (color[i] - v) * e) as RGB, k: from.k + (gain - from.k) * e };
      write(p === 1);
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [color, gain]);

  useEffect(() => runAmbientFx(mode, (f) => { fx.current = f; write(); }), [mode]);

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
