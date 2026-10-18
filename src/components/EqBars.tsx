import { useEffect, useRef } from 'react';
import { carAudio } from '../lib/audio';

/** Live spectrum bars driven by the synth's AnalyserNode. */
export function EqBars({ bars = 24, active, className = '' }: { bars?: number; active: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const kids = Array.from(el.children) as HTMLElement[];
    if (!active) {
      kids.forEach((k) => { k.style.transform = 'scaleY(0.06)'; });
      return;
    }
    const data = new Uint8Array(64);
    let raf = 0;
    const loop = () => {
      const an = carAudio.analyser;
      if (an) an.getByteFrequencyData(data);
      kids.forEach((k, i) => {
        const bin = Math.floor(1 + (i / kids.length) ** 1.4 * 40);
        const v = an ? data[bin] / 255 : 0.1;
        k.style.transform = `scaleY(${Math.max(0.06, v)})`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div ref={ref} className={`eq ${className}`}>
      {Array.from({ length: bars }, (_, i) => <span key={i} />)}
    </div>
  );
}
