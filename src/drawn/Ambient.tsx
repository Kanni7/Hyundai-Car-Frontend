import { useEffect, useRef, useState } from 'react';
import type { AmbientMode } from '../types';
import { runAmbientFx } from '../lib/ambientFx';
import { CABIN_H, CABIN_W, STRIPS } from './geometry';

// Dash, driver-side dash ends and console glow in the primary colour; the door pipes take the second colour in dual tone.
const DASH = [STRIPS[0], STRIPS[1], STRIPS[6]];
const DOOR = [STRIPS[2], STRIPS[3], STRIPS[4], STRIPS[5]];

function Pipes({ paths, flow }: { paths: string[]; flow: boolean }) {
  return (
    <>
      {/* Wide halo, inner glow, coloured body, near-white core */}
      <g className="pipe">
        {paths.map((d) => <path key={`h${d}`} d={d} pathLength={100} stroke="currentColor" strokeWidth="14" opacity="0.16" filter="url(#d-b8)" fill="none" strokeLinecap="round" />)}
        {paths.map((d) => <path key={`g${d}`} d={d} pathLength={100} stroke="currentColor" strokeWidth="5" opacity="0.55" filter="url(#d-b3)" fill="none" strokeLinecap="round" />)}
        {paths.map((d) => <path key={`b${d}`} d={d} pathLength={100} stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />)}
        {paths.map((d) => <path key={`c${d}`} d={d} pathLength={100} stroke="#ffffff" strokeWidth="1" opacity="0.75" fill="none" strokeLinecap="round" />)}
      </g>
      {/* Flow: bright pulses chasing along each pipe */}
      {flow && (
        <g className="amb-run">
          {paths.map((d) => <path key={`r${d}`} d={d} pathLength={100} stroke="currentColor" strokeWidth="7" filter="url(#d-b3)" fill="none" strokeLinecap="round" />)}
          {paths.map((d) => <path key={`w${d}`} d={d} pathLength={100} stroke="#ffffff" strokeWidth="1.6" fill="none" strokeLinecap="round" />)}
        </g>
      )}
    </>
  );
}

/**
 * Ambient light pipes and the light they spill onto nearby trim. Blended with
 * `screen` and coloured through CSS `color`, so a colour change is one cheap
 * repaint. Breathe, Flow and Rainbow are CSS animations on this layer alone;
 * Music sync and Drive mode are driven per frame from the audio and the engine.
 * Powering up plays a welcome sweep along the pipes.
 */
export function Ambient({ color, color2, level, mode }: { color: string; color2: string; level: number; mode: AmbientMode }) {
  const fx = useRef<HTMLDivElement>(null);
  const on = level > 0;
  const [boot, setBoot] = useState(0);
  const [wasOn, setWasOn] = useState(on);
  if (on !== wasOn) {
    setWasOn(on);
    if (on) setBoot(boot + 1);
  }

  useEffect(() => {
    const el = fx.current;
    if (!el || !on || (mode !== 'music' && mode !== 'drive')) return;
    const stop = runAmbientFx(mode, ({ level: k, hue }) => {
      el.style.opacity = k.toFixed(3);
      el.style.filter = hue ? `hue-rotate(${hue.toFixed(0)}deg)` : '';
    });
    return () => { stop(); el.style.opacity = ''; el.style.filter = ''; };
  }, [mode, on]);

  return (
    <div ref={fx} className={`part ambient-layer fx-${mode}`} style={{ left: 0, top: 0, width: CABIN_W, height: CABIN_H }}>
      <svg viewBox={`0 0 ${CABIN_W} ${CABIN_H}`} style={{ opacity: level }} key={boot} className="welcome">
        {/* Spill: footwells, door card under the lower pipe, dash face */}
        <g style={{ color }}>
          <g fill="currentColor">
            <ellipse cx="770" cy="665" rx="165" ry="85" opacity="0.24" filter="url(#d-b40)" />
            <ellipse cx="1560" cy="760" rx="220" ry="55" opacity="0.14" filter="url(#d-b40)" />
            <ellipse cx="1650" cy="745" rx="120" ry="40" opacity="0.18" filter="url(#d-b20)" />
            <path d="M1365 668 L1438 664 L1448 800 L1372 806 Z" opacity="0.07" />
          </g>
          <path d="M625 440 C 760 457, 880 478, 948 510" stroke="currentColor" strokeWidth="34" opacity="0.18" filter="url(#d-b20)" fill="none" />
          <path d="M622 358 Q 790 372 962 384" stroke="currentColor" strokeWidth="26" opacity="0.14" filter="url(#d-b20)" fill="none" />
          <Pipes paths={DASH} flow={mode === 'flow'} />
        </g>
        <g style={{ color: color2 }}>
          <path d="M75 762 C 200 712, 300 672, 340 650 C 372 630, 384 616, 412 603 L 572 527" stroke="currentColor" strokeWidth="46" opacity="0.18" filter="url(#d-b20)" fill="none" />
          <path d="M0 464 Q 290 402 572 361" stroke="currentColor" strokeWidth="36" opacity="0.12" filter="url(#d-b20)" fill="none" />
          <Pipes paths={DOOR} flow={mode === 'flow'} />
        </g>
      </svg>
    </div>
  );
}
