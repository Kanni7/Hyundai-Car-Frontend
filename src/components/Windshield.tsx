import { useEffect, useRef } from 'react';
import type { SceneConfig } from '../scenes';
import type { WiperMode } from '../types';

interface Drop { x: number; y: number; r: number; a: number; vy: number }

const PARK = Math.PI + 0.02;
const RANGE = Math.PI / 2 + 0.42;
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

/** Rain on the glass plus animated wiper blades, clipped to the windshield. */
export function Windshield({ scene, mode }: { scene: SceneConfig; mode: WiperMode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const cvs = ref.current!;
    const ctx = cvs.getContext('2d')!;
    const { clip, holes, pivots } = scene.windshield;
    const glass = new Path2D();
    glass.moveTo(clip[0][0], clip[0][1]);
    for (const [x, y] of clip.slice(1)) glass.lineTo(x, y);
    glass.closePath();
    for (const h of holes) {
      glass.moveTo(h.cx + h.rx, h.cy);
      glass.ellipse(h.cx, h.cy, h.rx, h.ry, 0, 0, Math.PI * 2);
    }
    const xs = clip.map((p) => p[0]);
    const ys = clip.map((p) => p[1]);
    const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };

    const drops: Drop[] = [];
    let phase = 0;
    let prevSweep = 0;
    let last = performance.now();
    let raf = 0;
    let idle = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = modeRef.current;
      const raining = m !== 'off';

      if (!raining && phase === 0 && drops.length === 0) {
        if (!idle) { ctx.clearRect(0, 0, cvs.width, cvs.height); idle = true; }
        return;
      }
      idle = false;

      // Rain lands on the glass
      if (raining && drops.length < 900) {
        for (let i = 0; i < (m === 'fast' ? 7 : 4); i++) {
          const x = box.x + Math.random() * box.w;
          const y = box.y + Math.random() * box.h;
          if (!ctx.isPointInPath(glass, x, y, 'evenodd')) continue;
          drops.push({ x, y, r: 1.1 + Math.random() ** 2 * 4, a: 0, vy: Math.random() < 0.08 ? 0.15 + Math.random() * 0.4 : 0 });
        }
      }

      // Wiper cycle: sweep up and back, with a short rest when on low speed
      const active = m === 'fast' ? 0.85 : 1.15;
      const cycle = m === 'fast' ? 0.9 : 1.75;
      if (raining || phase !== 0) {
        phase += dt / cycle;
        if (phase >= 1) phase = raining ? phase - 1 : 0;
      }
      const t = Math.min(1, (phase * cycle) / active);
      const sweep = t < 0.5 ? ease(t * 2) : ease((1 - t) * 2);
      const a0 = PARK + prevSweep * RANGE;
      const a1 = PARK + sweep * RANGE;
      prevSweep = sweep;

      // Blades clear the drops they pass over
      const lo = Math.min(a0, a1) - 0.01;
      const hi = Math.max(a0, a1) + 0.01;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.a = Math.min(1, d.a + dt * 3);
        if (!raining) d.a -= dt * 0.6;
        d.y += d.vy;
        if (d.a <= 0 && !raining) { drops.splice(i, 1); continue; }
        for (const p of pivots) {
          const dx = d.x - p.x;
          const dy = d.y - p.y;
          const dist = Math.hypot(dx, dy);
          let ang = Math.atan2(dy, dx);
          if (ang < 0) ang += Math.PI * 2;
          if (dist > p.len * 0.2 && dist < p.len && ang >= lo && ang <= hi) { drops.splice(i, 1); break; }
        }
      }

      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.save();
      ctx.clip(glass, 'evenodd');
      for (const d of drops) {
        const alpha = Math.max(0, d.a);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190,210,240,${0.26 * alpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, Math.PI * 0.1, Math.PI * 0.9);
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * alpha})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
        if (d.vy > 0) {
          ctx.beginPath();
          ctx.moveTo(d.x, d.y - d.r);
          ctx.lineTo(d.x, d.y - d.r - 14);
          ctx.strokeStyle = `rgba(200,220,255,${0.12 * alpha})`;
          ctx.lineWidth = d.r * 0.8;
          ctx.stroke();
        }
      }
      for (const p of pivots) {
        const tipX = p.x + Math.cos(a1) * p.len;
        const tipY = p.y + Math.sin(a1) * p.len;
        const midX = p.x + Math.cos(a1) * p.len * 0.2;
        const midY = p.y + Math.sin(a1) * p.len * 0.2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tipX, tipY); ctx.stroke();
        ctx.strokeStyle = '#040405';
        ctx.lineWidth = 11;
        ctx.beginPath(); ctx.moveTo(midX, midY); ctx.lineTo(tipX, tipY); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(midX, midY - 3); ctx.lineTo(tipX, tipY - 3); ctx.stroke();
      }
      ctx.restore();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  return <canvas ref={ref} className="layer" width={scene.width} height={scene.height} />;
}
