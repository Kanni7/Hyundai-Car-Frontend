import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CarState } from '../types';
import { engine, type Telemetry } from '../lib/engine';
import { currentTrack } from '../state/car';
import { Part } from './Part';
import { arc, polar } from './geometry';

const THEME = { eco: '#35f08b', normal: '#38c6ff', sport: '#ff3b30' } as const;
const RED = '#ff4040';
const AMBER = '#ffb02e';
const GREEN = '#3dff7a';
const TANK_L = 45;

// Both dials sweep 190°, angled so their scales stay clear of the steering-wheel hub and spokes.
const L = { cx: 1505, cy: 380, r: 64, a0: 140, a1: 330, max: 240, n: 24, every: 4 };
const R = { cx: 1690, cy: 375, r: 64, a0: 210, a1: 400, max: 8, n: 16, every: 2 };
type Dial = typeof L;

const angle = (g: Dial, v: number) => g.a0 + (g.a1 - g.a0) * Math.max(0, Math.min(1, v / g.max));
const setText = (el: Element | undefined, s: string) => { if (el && el.textContent !== s) el.textContent = s; };
// Per-frame state goes in data attributes, which React never overwrites on a re-render.
const flag = (el: Element | undefined, on: boolean) => el?.setAttribute('data-on', String(on));
const timeNow = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

function Scale({ g, color, redFrom }: { g: Dial; color: string; redFrom?: number }) {
  return (
    <g>
      <g stroke={color} strokeLinecap="round">
        {Array.from({ length: g.n + 1 }, (_, i) => {
          const a = g.a0 + ((g.a1 - g.a0) * i) / g.n;
          const major = i % g.every === 0;
          const [x0, y0] = polar(g.cx, g.cy, g.r - (major ? 10 : 6), a);
          const [x1, y1] = polar(g.cx, g.cy, g.r - 3, a);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={major ? 1.5 : 0.8} opacity={major ? 0.9 : 0.45} />;
        })}
      </g>
      {Array.from({ length: g.n / g.every + 1 }, (_, i) => {
        const v = (g.max * i * g.every) / g.n;
        const [x, y] = polar(g.cx, g.cy, g.r - 17, angle(g, v));
        return <text key={i} x={x} y={y + 2} className="cl-num" fill={redFrom !== undefined && v >= redFrom ? RED : undefined}>{v}</text>;
      })}
    </g>
  );
}

function Needle({ g, k, color }: { g: Dial; k: string; color: string }) {
  return (
    <g data-k={k} transform={`rotate(${g.a0} ${g.cx} ${g.cy})`}>
      <path d={`M${g.cx + 34} ${g.cy} L${g.cx + 61} ${g.cy - 1.5} L${g.cx + 61} ${g.cy + 1.5} Z`} fill={color} filter="url(#d-b1)" opacity="0.85" />
      <path d={`M${g.cx + 34} ${g.cy} L${g.cx + 61} ${g.cy - 0.9} L${g.cx + 61} ${g.cy + 0.9} Z`} fill="#fff1ea" />
    </g>
  );
}

/** One warning or indicator lamp in the cluster's top band. */
function Lamp({ x, show, color, children, title }: { x: number; show: boolean; color: string; children: ReactNode; title: string }) {
  return (
    <g transform={`translate(${x} 298)`} className={`cl-lamp ${show ? 'lit' : ''}`} stroke={color} fill="none" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <title>{title}</title>
      {children}
    </g>
  );
}

/**
 * Blind View Monitor: while indicating, the camera under that side mirror replaces
 * the dial on the same side. Drawn as a night road with the car's own flank.
 */
function BlindView({ side, g }: { side: 'left' | 'right'; g: Dial }) {
  const id = `bvm-${side}`;
  const flip = side === 'right' ? -1 : 1;
  return (
    <g className="bvm">
      <defs>
        <clipPath id={id}><circle cx={g.cx} cy={g.cy} r={g.r - 3} /></clipPath>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#06090f" /><stop offset="1" stopColor="#1b2840" />
        </linearGradient>
        <linearGradient id={`${id}-road`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1d22" /><stop offset="1" stopColor="#2a2e35" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b4250" /><stop offset="0.35" stopColor="#8a93a3" /><stop offset="1" stopColor="#262b33" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id})`}>
        <g transform={`translate(${g.cx} ${g.cy}) scale(${flip} 1)`}>
          <rect x="-70" y="-70" width="140" height="56" fill={`url(#${id}-sky)`} />
          <rect x="-70" y="-14" width="140" height="84" fill={`url(#${id}-road)`} />
          {/* Far streetlights and a following car's headlamps near the vanishing point */}
          <circle cx="-38" cy="-30" r="1.2" fill="#ffd9a0" opacity="0.7" />
          <circle cx="-18" cy="-24" r="0.9" fill="#ffd9a0" opacity="0.6" />
          <ellipse cx="-6" cy="-11" rx="5" ry="1.6" fill="#fff6dc" opacity="0.35" filter="url(#d-b1)" />
          <path d="M14 -14 L-70 60" stroke="#c9ced6" strokeWidth="1.4" opacity="0.7" />
          <path data-k="dash" d="M14 -14 L22 70" stroke="#e8ecf2" strokeWidth="1.6" strokeDasharray="7 6" />
          {/* Own car: rear door and wheel arch along the inside edge */}
          <path d="M30 -70 L70 -70 L70 70 L26 70 Q34 30 30 -10 Z" fill={`url(#${id}-body)`} />
          <path d="M31 -10 Q34 30 27 70" stroke="#c9d2e0" strokeWidth="0.8" opacity="0.6" fill="none" />
          {/* A car following in the next lane: the reason to look */}
          <g transform="translate(-20 6)">
            <path d="M-12 6 L-9 -3 Q-7 -6 -3 -6 L3 -6 Q7 -6 9 -3 L12 6 Z" fill="#0c0f14" stroke="#3a4250" strokeWidth="0.6" />
            <ellipse cx="-7.5" cy="3" rx="3" ry="1.6" fill="#fffbe8" />
            <ellipse cx="7.5" cy="3" rx="3" ry="1.6" fill="#fffbe8" />
            <ellipse cy="4" rx="20" ry="6" fill="#fff6dc" opacity="0.25" filter="url(#d-b3)" />
          </g>
        </g>
        <text x={g.cx} y={g.cy - 44} className="cl-label" fill="#e8f0ff">{side === 'left' ? '◀ BLIND VIEW' : 'BLIND VIEW ▶'}</text>
      </g>
      <circle cx={g.cx} cy={g.cy} r={g.r - 3} stroke={GREEN} strokeWidth="1.2" fill="none" opacity="0.8" />
    </g>
  );
}

/** Digital instrument cluster seen through the steering wheel. */
export function Cluster({ car }: { car: CarState }) {
  const theme = THEME[car.driveMode];
  const live = car.ignition !== 'off';
  const running = car.ignition === 'on';
  const blinkL = car.hazard || car.indicator === 'left';
  const blinkR = car.hazard || car.indicator === 'right';
  const bvm = running && !car.hazard && car.indicator !== 'off' ? car.indicator : null;

  // Bulb check: every lamp lights for a moment when the ignition comes on.
  const [check, setCheck] = useState(live);
  const [wasLive, setWasLive] = useState(live);
  if (live !== wasLive) {
    setWasLive(live);
    setCheck(live);
  }
  useEffect(() => {
    if (!check) return;
    const t = window.setTimeout(() => setCheck(false), 2200);
    return () => window.clearTimeout(t);
  }, [check]);

  const [clock, setClock] = useState(timeNow);
  useEffect(() => {
    const t = window.setInterval(() => setClock(timeNow()), 10_000);
    return () => window.clearInterval(t);
  }, []);

  // Elements tagged with data-k are written straight to the DOM every frame by the vehicle model.
  const root = useRef<SVGGElement>(null);
  const els = useRef<Record<string, Element>>({});
  const latest = useRef(car);
  const sweeping = useRef(false);
  const startedAt = useRef(0);
  const repaint = useRef<(() => void) | null>(null);
  // After every React render: refresh the element lookup and re-apply the live readings.
  useEffect(() => {
    latest.current = car;
    const found: Record<string, Element> = {};
    root.current?.querySelectorAll('[data-k]').forEach((el) => { found[el.getAttribute('data-k')!] = el; });
    els.current = found;
    repaint.current?.();
  });

  useEffect(() => {
    const render = (rpm: number, t: Telemetry, sweep?: number) => {
      const c = latest.current;
      const e = els.current;
      const spd = sweep !== undefined ? sweep * L.max : t.speed;
      const rev = sweep !== undefined ? sweep * R.max : rpm;
      const a = angle(L, spd);
      e.speedFill?.setAttribute('d', arc(L.cx, L.cy, L.r, L.a0, a + 0.01));
      e.speedNeedle?.setAttribute('transform', `rotate(${a.toFixed(2)} ${L.cx} ${L.cy})`);
      setText(e.speed, String(Math.round(spd)));
      const b = angle(R, rev);
      e.rpmFill?.setAttribute('d', arc(R.cx, R.cy, R.r, R.a0, b + 0.01));
      e.rpmNeedle?.setAttribute('transform', `rotate(${b.toFixed(2)} ${R.cx} ${R.cy})`);
      setText(e.rpm, rev.toFixed(1));
      e.red?.setAttribute('opacity', rev > 6.1 ? '1' : '0');
      setText(e.gearNo, t.selector === 'D' && t.running ? String(t.gear) : '');

      // Coolant warms up over the first half-minute after a start.
      if (t.running && !startedAt.current) startedAt.current = performance.now();
      if (!t.running) startedAt.current = 0;
      const warm = t.running ? Math.min(3, 1 + Math.floor((performance.now() - startedAt.current) / 9000)) : c.ignition === 'off' ? 0 : 1;
      e.coolant?.querySelectorAll('rect').forEach((el, i) => flag(el, i < warm));

      const fuelPct = Math.max(0, c.fuel - (t.fuelUsed / TANK_L) * 100);
      e.fuel?.querySelectorAll('rect').forEach((el, i) => flag(el, i < Math.ceil(fuelPct / 12.5)));
      setText(e.dte, `${Math.round((c.range * fuelPct) / c.fuel)} km`);
      if (e.trip) {
        setText(e.trip, t.trip.toFixed(1));
        setText(e.avg, t.trip > 0.05 && t.fuelUsed > 0 ? (t.trip / t.fuelUsed).toFixed(1) : '--.-');
        setText(e.odo, Math.floor(t.odo).toLocaleString('en-IN'));
        e.inst?.setAttribute('width', ((Math.min(30, t.instant ?? 0) / 30) * 50).toFixed(1));
      }

      // Lane Keeping Assist turns the lane lines green once it is actively steering (above 60 km/h).
      const steering = c.adas.lka && t.running && t.speed > 60;
      flag(e.lanes, steering);
      flag(e.lka, steering);
      flag(e.held, t.held);
      e.lanes?.setAttribute('stroke-dashoffset', ((t.odo * 1000 * 0.8) % 11).toFixed(2));
      e.dash?.setAttribute('stroke-dashoffset', (-(t.odo * 1000 * 1.2) % 13).toFixed(2));
    };
    repaint.current = () => { if (!sweeping.current) render(engine.rpm, engine.telemetry()); };
    const off = engine.subscribe((rpm, _th, t) => { if (!sweeping.current) render(rpm, t); });
    if (!live) return off;
    // Needle sweep to full scale and back, like a real cluster waking up.
    sweeping.current = true;
    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const p = Math.min(1, (now - t0) / 1500);
      if (p < 1) {
        render(0, engine.telemetry(), Math.sin(Math.PI * p) ** 1.4);
        raf = requestAnimationFrame(loop);
      } else {
        sweeping.current = false;
        render(engine.rpm, engine.telemetry());
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { off(); cancelAnimationFrame(raf); sweeping.current = false; };
  }, [live]);

  let info: [string, string];
  if (car.phone) info = [car.phone.contact, 'ON CALL'];
  else if (car.nav) info = [`${car.nav.km} km`, car.nav.destination.toUpperCase()];
  else if (car.media.playing) info = [car.media.radio ? `FM ${car.media.freq.toFixed(1)}` : currentTrack(car.media).title, 'NOW PLAYING'];
  else info = [car.driveMode.toUpperCase(), 'DRIVE MODE'];

  const acc = car.ignition === 'acc';
  const tpmsLow = car.tyres.some((p) => p < 30);
  const [fl, fr, rl, rr] = car.tyres;

  return (
    <Part x={1418} y={280} w={364} h={154} className="cluster">
      <defs>
        <linearGradient id="cl-tacho" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme} stopOpacity="0.5" />
          <stop offset="0.6" stopColor={theme} />
          <stop offset="1" stopColor="#ff2b2b" />
        </linearGradient>
        <linearGradient id="cl-speedo" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={theme} stopOpacity="0.35" />
          <stop offset="1" stopColor={theme} />
        </linearGradient>
        <linearGradient id="cl-lane" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M1425 300 Q1428 292 1440 291 L1760 291 Q1772 292 1774 302 L1770 420 Q1768 428 1758 428 L1438 428 Q1428 428 1427 420 Z" fill="url(#d-clusterBg)" />

      <g ref={root} className={live ? 'cluster-on' : 'cluster-off'}>
        {/* Drive-mode theme wash behind each dial */}
        <circle cx={L.cx} cy={L.cy} r={L.r - 4} fill={theme} opacity="0.06" filter="url(#d-b8)" />
        <circle cx={R.cx} cy={R.cy} r={R.r - 4} fill={theme} opacity="0.06" filter="url(#d-b8)" />

        {/* Speedometer: 0-240 km/h */}
        <path d={arc(L.cx, L.cy, L.r + 2, L.a0, L.a1)} stroke={theme} strokeWidth="6" opacity="0.12" filter="url(#d-b3)" fill="none" />
        <path d={arc(L.cx, L.cy, L.r, L.a0, L.a1)} stroke="#16243a" strokeWidth="2.4" fill="none" />
        <path data-k="speedFill" d={arc(L.cx, L.cy, L.r, L.a0, L.a0 + 0.01)} stroke="url(#cl-speedo)" strokeWidth="4.5" fill="none" />
        <Scale g={L} color="#cfe6ff" />
        {car.adas.cruise !== null && running && (() => {
          const [x, y] = polar(L.cx, L.cy, L.r + 4, angle(L, car.adas.cruise));
          return <circle cx={x} cy={y} r="2.2" fill={GREEN} filter="url(#d-b1)" />;
        })()}
        <Needle g={L} k="speedNeedle" color="#ff5a3c" />
        {car.adas.cruise !== null && running && <text x={L.cx} y={L.cy - 18} className="cl-label" fill={GREEN}>SCC {car.adas.cruise}</text>}
        <text data-k="speed" x={L.cx} y={L.cy + 5} className="cl-big">0</text>
        <text x={L.cx} y={L.cy + 14} className="cl-unit">km/h</text>
        {/* Coolant temperature */}
        <g data-k="coolant" className="cl-bars">
          <path d="M1484 394.5 v4.2 M1484 397 h1.6 M1484 395.5 h1.6" stroke="#8fa3c0" strokeWidth="0.7" fill="none" /><circle cx="1484" cy="399.4" r="1.2" fill="#8fa3c0" />
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={1489 + i * 6} y="398" width="5" height="2.2" rx="0.6" />)}
        </g>

        {/* Tachometer: 0-8 x1000 rpm, redline from 6.5 */}
        <path d={arc(R.cx, R.cy, R.r, R.a0, R.a1)} stroke="#16243a" strokeWidth="2.4" fill="none" />
        <path d={arc(R.cx, R.cy, R.r, angle(R, 6.5), R.a1)} stroke="#ff2b2b" strokeWidth="2.6" fill="none" opacity="0.9" />
        <path data-k="red" d={arc(R.cx, R.cy, R.r + 3, angle(R, 6.5), R.a1)} stroke="#ff2b2b" strokeWidth="9" opacity="0" filter="url(#d-b3)" fill="none" />
        <path data-k="rpmFill" d={arc(R.cx, R.cy, R.r, R.a0, R.a0 + 0.01)} stroke="url(#cl-tacho)" strokeWidth="4.5" fill="none" />
        <Scale g={R} color="#cfe6ff" redFrom={7} />
        <Needle g={R} k="rpmNeedle" color="#ff5a3c" />
        <text data-k="rpm" x={R.cx} y={R.cy + 4} className="cl-big">0.0</text>
        <text x={R.cx} y={R.cy + 13} className="cl-unit">x1000 rpm</text>
        <text x={R.cx} y={R.cy + 25} className="cl-line">{info[0].length > 16 ? `${info[0].slice(0, 15)}…` : info[0]}</text>
        <text x={R.cx} y={R.cy + 31} className="cl-label">{info[1].slice(0, 22)}</text>
        {/* Fuel gauge and distance to empty */}
        <g data-k="fuel" className="cl-bars cl-fuel">
          <path d="M1660 414 v-4.5 h3 v4.5 Z M1663 411 l1.3 0.8 v2" stroke="#8fa3c0" strokeWidth="0.7" fill="none" />
          {Array.from({ length: 8 }, (_, i) => <rect key={i} x={1667 + i * 4.2} y="411.5" width="3.4" height="2.4" rx="0.5" />)}
        </g>
        <text data-k="dte" x="1713" y="414" className="cl-small">{car.range} km</text>

        {/* Top band: clock and outside temperature */}
        <text x="1560" y="300" className="cl-small">{clock}</text>
        <text x="1630" y="300" className="cl-small">27°C</text>
        {acc && <text x="1595" y="300" className="cl-acc">ACC</text>}

        {/* Gear selector with the gearbox's current ratio */}
        <text x="1595" y="325" className="cl-gear">{car.gear}</text>
        <text data-k="gearNo" x="1604" y="325" className="cl-gearno" />

        {/* Centre: driving assist, trip computer or tyre pressures */}
        {car.cluster === 'drive' && (
          <g>
            <g data-k="lanes" className={`cl-lanes ${car.adas.lka ? 'lka' : ''}`} strokeDasharray="6 5">
              <path d="M1552 412 L1578 332" />
              <path d="M1638 412 L1612 332" />
            </g>
            {car.adas.cruise !== null && running && (
              <g>
                <g transform="translate(1595 345) scale(0.55)" opacity="0.9">
                  <rect x="-11" y="-14" width="22" height="28" rx="6" fill="#aab6c8" />
                  <rect x="-8" y="-9" width="16" height="6" rx="2" fill="#2a3446" />
                </g>
                {[0, 1, 2].map((i) => <path key={i} d={`M${1586 + i} ${357 + i * 4} L${1604 - i} ${357 + i * 4}`} stroke={GREEN} strokeWidth="1.4" opacity={0.9 - i * 0.2} />)}
              </g>
            )}
            <ellipse cx="1595" cy="378" rx="18" ry="10" fill={theme} opacity="0.18" filter="url(#d-b3)" />
            <g transform="translate(1595 386)">
              <rect x="-11" y="-16" width="22" height="32" rx="6" fill="#e8eef8" />
              <rect x="-8" y="-11" width="16" height="7" rx="2" fill="#2a3446" />
              <rect x="-8" y="5" width="16" height="5" rx="2" fill="#2a3446" />
              <rect x="-13" y="-8" width="3" height="6" rx="1" fill="#e8eef8" />
              <rect x="10" y="-8" width="3" height="6" rx="1" fill="#e8eef8" />
            </g>
          </g>
        )}
        {car.cluster === 'trip' && (
          <g className="cl-trip">
            <text x="1595" y="337" className="cl-label">TRIP COMPUTER</text>
            <text x="1556" y="350" className="k">TRIP A</text><text data-k="trip" x="1626" y="350" className="v">0.0</text><text x="1636" y="350" className="u">km</text>
            <text x="1556" y="363" className="k">AVG</text><text data-k="avg" x="1626" y="363" className="v">--.-</text><text x="1636" y="363" className="u">km/l</text>
            <text x="1556" y="376" className="k">INSTANT</text>
            <rect x="1586" y="372.5" width="50" height="3" rx="1.5" fill="#1b2638" />
            <rect data-k="inst" x="1586" y="372.5" width="0" height="3" rx="1.5" fill={theme} />
            <text x="1556" y="389" className="k">ODO</text><text data-k="odo" x="1626" y="389" className="v">0</text><text x="1636" y="389" className="u">km</text>
          </g>
        )}
        {car.cluster === 'tyres' && (
          <g className="cl-trip">
            <text x="1595" y="337" className="cl-label">TYRE PRESSURE · PSI</text>
            <g transform="translate(1595 368)">
              <rect x="-9" y="-19" width="18" height="38" rx="6" fill="none" stroke="#8fa3c0" strokeWidth="1" />
              {[[-11, -11], [11, -11], [-11, 11], [11, 11]].map(([x, y], i) => <rect key={i} x={x - 2} y={y - 4.5} width="4" height="9" rx="1.2" fill={car.tyres[i] < 30 ? AMBER : GREEN} />)}
            </g>
            <text x="1566" y="360" className="v p">{fl}</text><text x="1624" y="360" className="v p">{fr}</text>
            <text x="1566" y="383" className="v p">{rl}</text><text x="1624" y="383" className="v p">{rr}</text>
          </g>
        )}

        {/* Lamps, left: warnings (lit with the ignition on and the engine off, as in a real car) */}
        <Lamp x={1465} show={car.headlights || check} color={GREEN} title="Headlights">
          <path d="M-1.5 0 Q2 -3.6 4 0 Q2 3.6 -1.5 0 Z" fill={GREEN} stroke="none" /><path d="M-2.5 -2.4 h-2.2 M-2.5 0 h-2.2 M-2.5 2.4 h-2.2" />
        </Lamp>
        <Lamp x={1476} show={(car.gear === 'P' && live) || check} color={RED} title="Parking brake">
          <circle r="3.4" /><path d="M-4.8 -2.6 Q-6 0 -4.8 2.6 M4.8 -2.6 Q6 0 4.8 2.6" /><text y="1.9" className="cl-tell" fill={RED} stroke="none">P</text>
        </Lamp>
        <Lamp x={1488} show={acc || check} color={RED} title="Battery charge">
          <rect x="-4" y="-2.4" width="8" height="5" rx="0.6" /><path d="M-2.6 -3.3 v0.9 M2.6 -3.3 v0.9 M-3 0.1 h2 M1 0.1 h2 M2 -0.9 v2" />
        </Lamp>
        <Lamp x={1499} show={acc || check} color={RED} title="Engine oil pressure">
          <path d="M-4.6 1.8 L-0.8 1.8 L2 -0.2 L4.6 -1.4 M-4.6 1.8 L-4.6 -0.8 L-1.6 -0.8 L-0.6 -2 L1 -2 L2 -0.2" /><circle cx="4.7" cy="0.8" r="0.5" fill={RED} />
        </Lamp>
        <Lamp x={1510} show={acc || check} color={AMBER} title="Check engine">
          <path d="M-4.2 -1.4 h1 v-1.2 h4 l1 1.2 h1.4 v1 h1 v2.2 h-1 v1 h-1.4 l-1 1 h-4 v-1 h-1 Z" />
        </Lamp>
        <Lamp x={1521} show={tpmsLow || check} color={AMBER} title="Tyre pressure">
          <path d="M-3.4 -2.8 Q-5 0.2 -3.4 2.8 L3.4 2.8 Q5 0.2 3.4 -2.8" /><path d="M0 -1.6 v2.2 M0 1.8 v0.1" />
        </Lamp>

        {/* Lamps, right: driver assistance */}
        <g data-k="held" className={`cl-hold ${car.autoHold || check ? 'lit' : ''}`}>
          <text x="1655" y="300" className="cl-tell">AUTO HOLD</text>
        </g>
        <g data-k="lka" className={`cl-lka ${car.adas.lka || check ? 'lit' : ''}`}>
          <Lamp x={1671} show color="currentColor" title="Lane Keeping Assist">
            <path d="M-4 3 L-2 -3 M4 3 L2 -3" /><circle cy="0.6" r="1.5" />
          </Lamp>
        </g>
        <Lamp x={1682} show={(car.adas.cruise !== null && running) || check} color={GREEN} title="Smart Cruise Control">
          <path d="M-3.6 1.6 A3.7 3.7 0 1 1 3.6 1.6" /><path d="M0 0.6 L1.9 -1.7" />
        </Lamp>

        {/* Blind View Monitor replaces the dial on the side being indicated */}
        {bvm === 'left' && <BlindView side="left" g={L} />}
        {bvm === 'right' && <BlindView side="right" g={R} />}
      </g>

      {/* Turn signals stay live even with the engine off (hazards) */}
      <path className={blinkL ? 'cl-turn on' : 'cl-turn'} d="M1538 311 L1549 303 L1549 307.5 L1557 307.5 L1557 314.5 L1549 314.5 L1549 319 Z" />
      <path className={blinkR ? 'cl-turn on' : 'cl-turn'} d="M1652 311 L1641 303 L1641 307.5 L1633 307.5 L1633 314.5 L1641 314.5 L1641 319 Z" />
      {!live && <text x="1595" y="372" className="cl-unit" opacity="0.55">PRESS START</text>}
    </Part>
  );
}
