import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { CarState, Intent } from '../types';
import { engine } from '../lib/engine';
import { Part } from './Part';
import { SIDE_WINDOW } from './geometry';

/** The passenger door's own window switch, centred on the armrest panel. */
const ROCKER = { x: 506, y: 519 };
/** Window travel while a switch is held, in % per second. */
const WINDOW_SPEED = 40;
/** Releasing sooner than this counts as a tap: one-touch, all the way. */
const TAP_MS = 320;

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

/**
 * Passenger door glass and its rocker switch. Top half raises, bottom half
 * lowers. A tap runs the window all the way (one-touch); holding moves it
 * gradually and it stops where you let go.
 */
export function Door({ car, onIntent }: { car: CarState; onIntent: (i: Intent) => void }) {
  const [held, setHeld] = useState<{ dir: 1 | -1; value: number | null } | null>(null);
  const hold = useRef<{ dir: 1 | -1; from: number; start: number; raf: number } | null>(null);
  useEffect(() => () => { if (hold.current) cancelAnimationFrame(hold.current.raf); }, []);

  const travelled = (h: NonNullable<typeof hold.current>, now: number) =>
    clampPct(h.from + (h.dir * WINDOW_SPEED * Math.max(0, now - h.start - TAP_MS)) / 1000);

  const press = (dir: 1 | -1) => (e: PointerEvent<SVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const h = { dir, from: car.windows.passenger, start: performance.now(), raf: 0 };
    hold.current = h;
    setHeld({ dir, value: null });
    const tick = (now: number) => {
      if (now - h.start > TAP_MS) setHeld({ dir, value: travelled(h, now) });
      h.raf = requestAnimationFrame(tick);
    };
    h.raf = requestAnimationFrame(tick);
  };
  const release = () => {
    const h = hold.current;
    if (!h) return;
    cancelAnimationFrame(h.raf);
    hold.current = null;
    const now = performance.now();
    const tap = now - h.start <= TAP_MS;
    const open = tap ? (h.dir > 0 ? 100 : 0) : Math.round(travelled(h, now));
    setHeld(null);
    onIntent({ type: 'window', target: 'passenger', open });
  };

  const live = held?.value != null;
  const passenger = live ? held!.value! : car.windows.passenger;
  const drop = (passenger / 100) * 300;
  const { x, y } = ROCKER;
  const up = held?.dir === -1;
  const down = held?.dir === 1;
  const pct = Math.round(passenger);

  return (
    <>
      <Part x={0} y={0} w={612} h={312} className="no-hit">
        <defs>
          <clipPath id="d-sideClip"><path d={SIDE_WINDOW} /></clipPath>
          <linearGradient id="d-sideTint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0a1424" stopOpacity="0.5" />
            <stop offset="1" stopColor="#04080f" stopOpacity="0.38" />
          </linearGradient>
        </defs>
        <g clipPath="url(#d-sideClip)">
          <g className={`glass ${live ? 'moving' : ''}`} style={{ transform: `translateY(${drop}px)` }}>
            <path d="M0 0 L440 0 L612 268 L600 320 L0 330 Z" fill="url(#d-sideTint)" />
            <path d="M120 0 L260 0 L80 312 L0 312 L0 190 Z" fill="#ffffff" opacity="0.035" />
            <path d="M0 1.5 L440 1.5" stroke="#9fb3cc" strokeWidth="2" opacity="0.5" />
          </g>
        </g>
      </Part>
      <Part x={444} y={486} w={156} h={70} className="switches">
        <path d="M450 520 L584 494 Q592 493 592 500 L594 520 Q594 526 587 527 L456 549 Q449 550 449 543 Z" fill="url(#d-piano)" stroke="#1f2631" strokeWidth="1" />
        <g transform={`rotate(-11 ${x} ${y})`} role="group" aria-label="Passenger window switch">
          <rect x={x - 11} y={y - 10} width="22" height="20" rx="3" fill="#13161c" stroke="#2f3744" strokeWidth="0.8" />
          <rect x={x - 10} y={y - 9} width="20" height="8.5" rx="2" fill={up ? '#2b4a6e' : '#1b1f26'} />
          <rect x={x - 10} y={y + 0.5} width="20" height="8.5" rx="2" fill={down ? '#2b4a6e' : '#1b1f26'} />
          <path d={`M${x - 3.5} ${y - 2.5} L${x} ${y - 6.5} L${x + 3.5} ${y - 2.5} Z`} fill={up ? '#ffffff' : '#8fd0ff'} />
          <path d={`M${x - 3.5} ${y + 2.5} L${x} ${y + 6.5} L${x + 3.5} ${y + 2.5} Z`} fill={down ? '#ffffff' : '#8fd0ff'} />
          {/* How far the window is open */}
          <rect x={x + 13} y={y - 9} width="1.8" height="18" rx="0.9" fill="#1d232c" />
          <rect x={x + 13} y={y - 9} width="1.8" height={(18 * pct) / 100} rx="0.9" fill="#8fd0ff" opacity="0.85" />
          {/* Generous hit zones: upper half raises, lower half lowers */}
          <rect x={x - 18} y={y - 15} width="36" height="15" fill="transparent" className="hit"
            onPointerDown={press(-1)} onPointerUp={release} onPointerCancel={release}>
            <title>{`Window: tap to close fully, hold to raise (${pct}% open)`}</title>
          </rect>
          <rect x={x - 18} y={y} width="36" height="15" fill="transparent" className="hit"
            onPointerDown={press(1)} onPointerUp={release} onPointerCancel={release}>
            <title>{`Window: tap to open fully, hold to lower (${pct}% open)`}</title>
          </rect>
        </g>
        <g className="hit btn" onClick={() => onIntent({ type: 'doors.lock', locked: !car.locked })} role="button" aria-label="Door lock">
          <title>{car.locked ? 'Unlock doors' : 'Lock doors'}</title>
          <rect x="556" y="502" width="22" height="15" rx="3" fill="#161a21" stroke="#2f3744" strokeWidth="0.8" transform="rotate(-11 567 510)" />
          <path d="M563 509 h8 v5 h-8 Z M564.5 509 v-2 a2.5 2.5 0 0 1 5 0 v2" stroke="#8fd0ff" strokeWidth="0.9" fill="none" transform="rotate(-11 567 510)" />
          <circle cx="580" cy="503" r="1.6" fill={car.locked ? '#ff4a3a' : '#2a2f38'} className={car.locked ? 'led-on' : ''} />
        </g>
      </Part>
    </>
  );
}

/** Ventilated passenger seat in the foreground; perforations glow when cooling runs. */
export function Seat({ level }: { level: number }) {
  return (
    <Part x={236} y={696} w={656} h={118} className="no-hit">
      <path d="M240 814 L266 762 Q290 728 330 722 Q470 706 620 704 Q760 706 842 740 Q874 760 888 814 Z" fill="url(#d-seat)" />
      <path d="M240 814 L266 762 Q290 728 330 722 Q470 706 620 704 Q760 706 842 740 Q874 760 888 814 Z" fill="#000" filter="url(#d-leatherGrain)" opacity="0.9" />
      <path d="M380 814 L392 750 Q520 735 650 736 Q762 740 800 770 L812 814 Z" fill="url(#d-perf)" />
      <path d="M380 814 L392 750 Q520 735 650 736 Q762 740 800 770 L812 814" stroke="#2d323b" strokeWidth="1" strokeDasharray="2.5 2.5" fill="none" />
      <path d="M392 754 Q520 739 650 740 Q760 744 796 773" stroke="#05060a" strokeWidth="2" fill="none" />
      <path d="M272 760 Q296 730 334 725 Q470 709 620 707 Q758 709 838 742" stroke="#5a616d" strokeWidth="1.6" opacity="0.45" fill="none" filter="url(#d-b1)" />
      {level > 0 && (
        <g className="seat-cool" style={{ opacity: 0.3 + level * 0.22 }}>
          <path d="M380 814 L392 750 Q520 735 650 736 Q762 740 800 770 L812 814 Z" fill="#4fc8ff" opacity="0.18" filter="url(#d-b8)" />
          <path d="M380 814 L392 750 Q520 735 650 736 Q762 740 800 770 L812 814 Z" fill="url(#d-perfLit)" />
        </g>
      )}
      <defs>
        <pattern id="d-perfLit" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1" fill="#8fe0ff" />
        </pattern>
      </defs>
    </Part>
  );
}

/** Roof console buttons (cabin light) under the rear-view mirror. */
export function MirrorButtons({ car, onIntent }: { car: CarState; onIntent: (i: Intent) => void }) {
  return (
    <Part x={1050} y={40} w={96} h={22}>
      <circle cx="1066" cy="52" r="1.8" fill="#ff3b30" className="led-on" />
      {[1098, 1126].map((x) => (
        <g key={x} className="hit btn" onClick={() => onIntent({ type: 'lights.cabin', on: !car.cabinLight })} role="button" aria-label="Cabin light">
          <title>Cabin light</title>
          <rect x={x - 9} y={44} width="18" height="12" rx="3" fill="#13161c" stroke="#252b35" strokeWidth="0.7" />
          <circle cx={x} cy={50} r="2.6" fill={car.cabinLight ? '#fff3d6' : 'none'} stroke="#7fb4e8" strokeWidth="0.9" />
        </g>
      ))}
    </Part>
  );
}

const NEXT_IGNITION = { off: 'acc', acc: 'on', on: 'off' } as const;
const RING = { off: '#59606c', acc: '#ffb02e', on: '#8fd0ff' } as const;

/** Driver-side switch row with the ENGINE START/STOP button (OFF → ACC → ON). */
export function DriverSwitches({ car, onIntent }: { car: CarState; onIntent: (i: Intent) => void }) {
  return (
    <Part x={1796} y={560} w={130} h={46}>
      <g className="hit btn" onClick={() => onIntent({ type: 'lights.head', on: !car.headlights })} role="button" aria-label="Headlights">
        <title>Headlights</title>
        <rect x="1804" y="568" width="28" height="22" rx="4" fill="#0f1319" stroke="#232a34" strokeWidth="0.8" />
        <path d="M1812 579 Q1818 573 1823 579 Q1818 585 1812 579 Z M1825 576 L1829 576 M1825 579 L1829 579 M1825 582 L1829 582" stroke={car.headlights ? '#3dff7a' : '#8fd0ff'} strokeWidth="1" fill="none" />
      </g>
      <g className={`hit btn engine ${car.ignition}`} role="button" aria-label="Engine start stop"
        onClick={() => onIntent({ type: 'ignition', mode: engine.brakeHeld && car.ignition !== 'on' ? 'on' : NEXT_IGNITION[car.ignition] })}>
        <title>{`Ignition: ${car.ignition.toUpperCase()}. Press for ${NEXT_IGNITION[car.ignition].toUpperCase()} (hold the brake to start the engine directly)`}</title>
        <circle cx="1856" cy="580" r="15" fill="#0e1117" stroke="url(#d-chrome)" strokeWidth="2" />
        <circle cx="1856" cy="580" r="11.5" fill="none" stroke={RING[car.ignition]} strokeWidth="1.2" className="engine-ring" />
        <text x="1856" y="578" className="eng-txt">ENGINE</text>
        <text x="1856" y="584.5" className="eng-txt">START STOP</text>
      </g>
      <g className="hit btn" onClick={() => onIntent({ type: 'lights.cabin', on: !car.cabinLight })} role="button" aria-label="Cabin light">
        <title>Cabin light</title>
        <rect x="1880" y="570" width="28" height="22" rx="4" fill="#0f1319" stroke="#232a34" strokeWidth="0.8" />
        <circle cx="1894" cy="581" r="4" stroke={car.cabinLight ? '#fff3d6' : '#8fd0ff'} strokeWidth="1" fill="none" />
        <path d="M1894 575 L1894 573 M1888 581 L1886 581 M1900 581 L1902 581" stroke="#8fd0ff" strokeWidth="1" />
      </g>
    </Part>
  );
}
