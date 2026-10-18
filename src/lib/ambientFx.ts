import type { AmbientMode } from '../types';
import type { RGB } from './ambient';
import { carAudio } from './audio';
import { engine } from './engine';

/** One frame of an animated light effect: a brightness multiplier and a hue shift in degrees. */
export interface FxFrame { level: number; hue: number }

/**
 * Runs an ambient light effect outside React and hands each frame to `apply`.
 * Music sync pulses with the bass and steps the hue on every beat; Drive mode
 * brightens with engine revs; Breathe, Flow and Rainbow are timed loops.
 * Returns a stop function.
 */
export function runAmbientFx(mode: AmbientMode, apply: (f: FxFrame) => void): () => void {
  if (mode === 'drive') {
    return engine.subscribe((rpm, _t, tele) => {
      apply({ level: tele.running ? 0.55 + 0.45 * Math.min(1, rpm / 6.2) : 0.55, hue: 0 });
    });
  }
  if (mode === 'static' || mode === 'dual') {
    apply({ level: 1, hue: 0 });
    return () => {};
  }
  const data = new Uint8Array(64);
  let raf = 0;
  let avg = 0;
  let hue = 0;
  let lastBeat = 0;
  let level = 0.6;
  const t0 = performance.now();
  const loop = (now: number) => {
    const t = (now - t0) / 1000;
    if (mode === 'breathe') apply({ level: 0.22 + 0.78 * (0.5 + 0.5 * Math.cos(t * 1.5)), hue: 0 });
    else if (mode === 'flow') apply({ level: 0.65 + 0.35 * (0.5 + 0.5 * Math.cos(t * 4)), hue: 0 });
    else if (mode === 'rainbow') apply({ level: 1, hue: (t * 60) % 360 });
    else {
      const an = carAudio.analyser;
      let e = 0;
      if (an) {
        an.getByteFrequencyData(data);
        for (let i = 1; i < 7; i++) e += data[i];
        e /= 6 * 255;
      }
      // A beat is a sudden jump in bass energy over its running average.
      if (e > 0.18 && e > avg * 1.22 + 0.02 && now - lastBeat > 230) {
        hue = (hue + 47) % 360;
        lastBeat = now;
        level = 1;
      }
      avg += (e - avg) * 0.06;
      const idle = 0.5 + 0.12 * Math.sin(t * 1.4);
      level += ((e > 0.03 ? 0.25 + e * 0.95 : idle) - level) * 0.2;
      apply({ level: Math.min(1, level), hue });
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

/** Rotates a colour round the hue wheel (same maths as CSS `hue-rotate`). */
export function rotateHue([r, g, b]: RGB, deg: number): RGB {
  if (!deg) return [r, g, b];
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const m = [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return [clamp(m[0] * r + m[1] * g + m[2] * b), clamp(m[3] * r + m[4] * g + m[5] * b), clamp(m[6] * r + m[7] * g + m[8] * b)];
}
