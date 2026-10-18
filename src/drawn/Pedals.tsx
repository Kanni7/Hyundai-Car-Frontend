import { useEffect, useState } from 'react';
import { engine } from '../lib/engine';
import { carAudio } from '../lib/audio';
import { Part } from './Part';

const BRAKE = 'M1560 712 Q1557 707 1563 707 L1662 716 Q1668 717 1667 723 L1655 774 Q1653 779 1647 778 L1553 770 Q1547 769 1548 763 Z';
const ACCEL = 'M1738 706 L1768 702 Q1774 702 1774 708 L1778 796 Q1778 801 1772 801 L1744 803 Q1738 803 1738 797 Z';

/**
 * Brake and accelerator. Hold the accelerator (or ↑ / W) to rev the engine:
 * the pedal travels, the tachometer climbs and the engine note rises.
 */
export function Pedals({ tint }: { tint: string }) {
  const [throttle, setThrottle] = useState(0);
  const [brake, setBrake] = useState(false);
  useEffect(() => engine.subscribe((_, t) => setThrottle(t)), []);

  const press = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    carAudio.unlock();
    if (!engine.press()) carAudio.chime('error');
  };
  const release = () => engine.release();

  return (
    <Part x={1540} y={680} w={250} h={130} className="pedals">
      <g className={`hit pedal ${brake ? 'pressed' : ''}`} style={{ transformOrigin: '1640px 690px' }}
        onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); setBrake(true); engine.brakeHeld = true; }}
        onPointerUp={() => { setBrake(false); engine.brakeHeld = false; }}
        onPointerCancel={() => { setBrake(false); engine.brakeHeld = false; }} role="button" aria-label="Brake pedal">
        <title>Brake (hold it and press START to fire the engine straight away)</title>
        <path d="M1630 708 L1640 686" stroke="#121821" strokeWidth="7" strokeLinecap="round" />
        <path d={BRAKE} fill="url(#d-pedal)" stroke="#c4cedc" strokeWidth="1.2" />
        <path d={BRAKE} fill={tint} opacity="0.28" />
        <g fill="#0b1422" opacity="0.85">
          {[0, 1, 2].map((row) => [0, 1].map((col) => (
            <rect key={`${row}${col}`} x={1566 + col * 46 - row * 1.5} y={722 + row * 16 + col * 2} width="40" height="8" rx="4" />
          )))}
        </g>
      </g>
      <g className="hit pedal accel" style={{ transform: `translateY(${throttle * 7}px) scaleY(${1 - throttle * 0.07})`, transformOrigin: '1756px 690px' }}
        onPointerDown={press} onPointerUp={release} onPointerCancel={release} role="button" aria-label="Accelerator pedal">
        <title>Accelerator: hold to rev (or hold ↑ / W)</title>
        <path d="M1752 703 L1760 686" stroke="#121821" strokeWidth="6" strokeLinecap="round" />
        <path d={ACCEL} fill="url(#d-pedal)" stroke="#c4cedc" strokeWidth="1.1" />
        <path d={ACCEL} fill={tint} opacity={0.2 + throttle * 0.15} />
        <g fill="#0b1422" opacity="0.85">
          {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={1744 + i * 0.6} y={716 + i * 13} width="26" height="5" rx="2.5" />)}
        </g>
        <path d={ACCEL} fill="#000" opacity={throttle * 0.25} />
      </g>
    </Part>
  );
}
