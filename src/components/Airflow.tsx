import { useEffect, useRef } from 'react';
import type { SceneConfig } from '../scenes';

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number }

function airColor(temp: number): [number, number, number] {
  // 16°C icy blue  →  23°C neutral  →  30°C warm amber
  const cold: [number, number, number] = [110, 195, 255];
  const mid: [number, number, number] = [190, 220, 255];
  const warm: [number, number, number] = [255, 165, 95];
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as [number, number, number];
  return temp <= 23 ? mix(cold, mid, (temp - 16) / 7) : mix(mid, warm, (temp - 23) / 7);
}

function sprite([r, g, b]: [number, number, number]) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grad;
  x.fillRect(0, 0, 64, 64);
  return c;
}

/** Visible air streams leaving the vents; colour follows temperature, density follows fan speed. */
export function Airflow({ scene, on, fan, temp }: { scene: SceneConfig; on: boolean; fan: number; temp: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ on, fan, temp });
  useEffect(() => { live.current = { on, fan, temp }; }, [on, fan, temp]);

  useEffect(() => {
    const cvs = ref.current!;
    const ctx = cvs.getContext('2d')!;
    const ps: P[] = [];
    const carry = scene.vents.map(() => 0);
    let img = sprite(airColor(live.current.temp));
    let imgTemp = live.current.temp;
    let last = performance.now();
    let raf = 0;
    let idle = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { on, fan, temp } = live.current;
      if (!on && ps.length === 0) {
        if (!idle) { ctx.clearRect(0, 0, cvs.width, cvs.height); idle = true; }
        return;
      }
      idle = false;
      if (temp !== imgTemp) { img = sprite(airColor(temp)); imgTemp = temp; }

      const speed = 0.7 + fan * 0.28;
      if (on) {
        scene.vents.forEach(([x1, y1, x2, y2], i) => {
          carry[i] += dt * fan * 11;
          const mx = (x1 + x2) / 2;
          const half = Math.max(1, Math.abs(x2 - x1) / 2);
          while (carry[i] >= 1) {
            carry[i] -= 1;
            const t = Math.random();
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            const spread = (x - mx) / half;
            ps.push({
              x, y,
              vx: spread * speed * (0.5 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.5,
              vy: speed * (0.45 + Math.random() * 0.55),
              life: 0,
              max: 1.1 + Math.random() * 0.9,
              size: 10 + Math.random() * 8,
            });
          }
        });
      }

      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.globalCompositeOperation = 'lighter';
      const intensity = 0.06 + fan * 0.012;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        if (p.life >= p.max) { ps.splice(i, 1); continue; }
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vy += dt * 0.6;
        p.size += dt * 55;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.sin(Math.PI * k) * intensity;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.drawImage(img, -p.size, -p.size * 0.32, p.size * 2, p.size * 0.64);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  return <canvas ref={ref} className="layer" width={scene.width} height={scene.height} />;
}
