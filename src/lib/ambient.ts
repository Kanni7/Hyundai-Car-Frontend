import type { AmbientMode, CarState, DriveMode } from '../types';

export type RGB = [number, number, number];

export const AMBIENT_RGB: Record<string, RGB> = {
  blue: [0.25, 0.55, 1.0],
  red: [1.0, 0.1, 0.08],
  green: [0.2, 1.0, 0.38],
  purple: [0.62, 0.28, 1.0],
  pink: [1.0, 0.28, 0.66],
  orange: [1.0, 0.48, 0.08],
  white: [0.92, 0.95, 1.0],
  yellow: [1.0, 0.86, 0.18],
  cyan: [0.08, 0.95, 1.0],
  gold: [1.0, 0.7, 0.28],
  off: [0.12, 0.12, 0.14],
};

/** The Verna's ambient lighting offers 64 colours: evenly spaced, fully saturated hues. */
export const HUE_STEPS = 64;

function hsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

// Precomputed so each colour is a stable reference (the photo filter only cross-fades on a real change).
const HUE_RGB = Array.from({ length: HUE_STEPS }, (_, i) => hsl((i * 360) / HUE_STEPS, 1, 0.56));
export const hueRgb = (step: number): RGB => HUE_RGB[step];
export const hueCss = (step: number) => `hsl(${((step * 360) / HUE_STEPS).toFixed(1)} 100% 56%)`;
const toCss = ([r, g, b]: RGB) => `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;

/** "Link to drive mode": Eco glows green, Sport red, Normal keeps the chosen colour. */
const DRIVE_RGB: Record<DriveMode, RGB | null> = { eco: [0.2, 1.0, 0.45], normal: null, sport: [1.0, 0.12, 0.08] };

export const AMBIENT_MODES: { id: AmbientMode; en: string; hi: string }[] = [
  { id: 'static', en: 'Static', hi: 'static' },
  { id: 'breathe', en: 'Breathe', hi: 'saans lene wali' },
  { id: 'flow', en: 'Flow', hi: 'behti hui' },
  { id: 'music', en: 'Music sync', hi: 'music ke saath' },
  { id: 'drive', en: 'Drive mode', hi: 'drive mode ke saath' },
  { id: 'rainbow', en: 'Rainbow', hi: 'satrangi' },
  { id: 'dual', en: 'Dual tone', hi: 'do rang wali' },
];

/** Resolved colours for the light pipes: dash (primary) and doors (secondary). */
export function ambientColors(car: CarState): { rgb: RGB; css: string; rgb2: RGB; css2: string } {
  const a = car.ambient;
  let rgb = a.hue !== null ? hueRgb(a.hue) : AMBIENT_RGB[a.color];
  if (a.mode === 'drive') rgb = DRIVE_RGB[car.driveMode] ?? rgb;
  const rgb2 = a.mode === 'dual' ? AMBIENT_RGB[a.color2] : rgb;
  return { rgb, css: toCss(rgb), rgb2, css2: toCss(rgb2) };
}
