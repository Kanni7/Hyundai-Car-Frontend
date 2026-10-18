import { useEffect, useRef } from 'react';
import type { CarState } from '../types';
import { engine } from '../lib/engine';
import { currentTrack } from '../state/car';
import { Part } from './Part';
import { arc, polar } from './geometry';

const THEME = { eco: '#35f08b', normal: '#38c6ff', sport: '#ff3b30' } as const;
const L = { cx: 1505, cy: 380, r: 64, a0: 125, a1: 330 };
const R = { cx: 1690, cy: 375, r: 64, a0: 210, a1: 415 };

function Ticks({ g, n, color }: { g: typeof L; n: number; color: string }) {
  return (
    <g stroke={color} strokeLinecap="round">
      {Array.from({ length: n + 1 }, (_, i) => {
        const a = g.a0 + ((g.a1 - g.a0) * i) / n;
        const major = i % 4 === 0;
        const [x0, y0] = polar(g.cx, g.cy, g.r - (major ? 11 : 7), a);
        const [x1, y1] = polar(g.cx, g.cy, g.r - 3, a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={major ? 1.6 : 0.9} opacity={major ? 0.9 : 0.5} />;
      })}
    </g>
  );
}

const tachoAngle = (rpm: number) => R.a0 + (R.a1 - R.a0) * Math.min(1, rpm / 8);

/** Tachometer fill, needle and readout, driven every frame by the engine model (no React renders). */
function Tacho() {
  const fill = useRef<SVGPathElement>(null);
  const needle = useRef<SVGGElement>(null);
  const label = useRef<SVGTextElement>(null);
  const red = useRef<SVGPathElement>(null);
  useEffect(() => engine.subscribe((rpm) => {
    const a = tachoAngle(rpm);
    fill.current?.setAttribute('d', arc(R.cx, R.cy, R.r, R.a0, a + 0.01));
    needle.current?.setAttribute('transform', `rotate(${a.toFixed(2)} ${R.cx} ${R.cy})`);
    if (label.current) label.current.textContent = rpm.toFixed(1);
    red.current?.setAttribute('opacity', rpm > 6.1 ? '1' : '0');
  }), []);
  return (
    <>
      <path ref={red} d={arc(R.cx, R.cy, R.r + 3, R.a1 - 45, R.a1)} stroke="#ff2b2b" strokeWidth="9" opacity="0" filter="url(#d-b3)" fill="none" />
      <path ref={fill} d={arc(R.cx, R.cy, R.r, R.a0, tachoAngle(engine.rpm) + 0.01)} stroke="url(#cl-tacho)" strokeWidth="5" fill="none" className="sweep" pathLength={100} />
      <g ref={needle} transform={`rotate(${tachoAngle(engine.rpm)} ${R.cx} ${R.cy})`}>
        <path d={`M${R.cx + 36} ${R.cy} L${R.cx + 61} ${R.cy - 1.4} L${R.cx + 61} ${R.cy + 1.4} Z`} fill="#ff5a3c" filter="url(#d-b1)" opacity="0.8" />
        <path d={`M${R.cx + 36} ${R.cy} L${R.cx + 61} ${R.cy - 0.9} L${R.cx + 61} ${R.cy + 0.9} Z`} fill="#ffe3d9" />
      </g>
      <text ref={label} x={R.cx} y={R.cy + 4} className="cl-big">{engine.rpm.toFixed(1)}</text>
    </>
  );
}

/** Digital instrument cluster seen through the steering wheel. */
export function Cluster({ car }: { car: CarState }) {
  const theme = THEME[car.driveMode];
  const live = car.ignition !== 'off';
  const blinkL = car.hazard || car.indicator === 'left';
  const blinkR = car.hazard || car.indicator === 'right';

  let info: [string, string];
  if (car.phone) info = [car.phone.contact, 'ON CALL'];
  else if (car.nav) info = [`${car.nav.km} km`, car.nav.destination.toUpperCase()];
  else if (car.media.playing) info = [car.media.radio ? `FM ${car.media.freq.toFixed(1)}` : currentTrack(car.media).title, 'NOW PLAYING'];
  else info = [car.driveMode.toUpperCase(), 'DRIVE MODE'];

  return (
    <Part x={1418} y={280} w={364} h={154} className="cluster">
      <path d="M1425 300 Q1428 292 1440 291 L1760 291 Q1772 292 1774 302 L1770 420 Q1768 428 1758 428 L1438 428 Q1428 428 1427 420 Z" fill="url(#d-clusterBg)" />
      <g className={live ? 'cluster-on' : 'cluster-off'} key={live ? 'on' : 'off'}>
        {/* Speedometer */}
        <path d={arc(L.cx, L.cy, L.r + 2, L.a0, L.a1)} stroke={theme} strokeWidth="6" opacity="0.22" filter="url(#d-b3)" fill="none" />
        <path d={arc(L.cx, L.cy, L.r, L.a0, L.a1)} stroke={theme} strokeWidth="2.6" fill="none" className="sweep" pathLength={100} />
        <Ticks g={L} n={20} color="#cfe6ff" />
        <text x={L.cx} y={L.cy + 6} className="cl-big">0</text>
        <text x={L.cx} y={L.cy + 18} className="cl-unit">km/h</text>

        {/* Tachometer, idling at 0.8 */}
        <defs>
          <linearGradient id="cl-tacho" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={theme} stopOpacity="0.5" />
            <stop offset="0.6" stopColor={theme} />
            <stop offset="1" stopColor="#ff2b2b" />
          </linearGradient>
        </defs>
        <path d={arc(R.cx, R.cy, R.r, R.a0, R.a1)} stroke="#16243a" strokeWidth="2.4" fill="none" />
        <path d={arc(R.cx, R.cy, R.r, R.a1 - 45, R.a1)} stroke="#ff2b2b" strokeWidth="2.6" fill="none" opacity="0.9" />
        <Tacho />
        <Ticks g={R} n={16} color="#cfe6ff" />
        <text x={R.cx} y={R.cy + 15} className="cl-unit">x1000 rpm</text>
        <rect x="1712" y="390" width="26" height="9" rx="2" fill={theme} opacity="0.55" />
        <rect x="1712" y="390" width={(26 * car.fuel) / 100} height="9" rx="2" fill={theme} />

        {/* Centre: lane view and the car */}
        <defs>
          <linearGradient id="cl-lane" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M1550 414 L1576 330 M1640 414 L1614 330" stroke="url(#cl-lane)" strokeWidth="2" />
        <ellipse cx="1595" cy="356" rx="18" ry="10" fill={theme} opacity="0.18" filter="url(#d-b3)" />
        <g transform="translate(1595 384)">
          <rect x="-11" y="-16" width="22" height="32" rx="6" fill="#e8eef8" />
          <rect x="-8" y="-11" width="16" height="7" rx="2" fill="#2a3446" />
          <rect x="-8" y="5" width="16" height="5" rx="2" fill="#2a3446" />
          <rect x="-13" y="-8" width="3" height="6" rx="1" fill="#e8eef8" />
          <rect x="10" y="-8" width="3" height="6" rx="1" fill="#e8eef8" />
        </g>

        {/* Info readout under the tachometer */}
        <text x={R.cx} y="409" className="cl-info">{info[0].length > 16 ? `${info[0].slice(0, 15)}…` : info[0]}</text>
        <text x={R.cx} y="417" className="cl-label">{info[1].slice(0, 22)}</text>

        {/* Gear row */}
        <g className="cl-gears">
          {(['P', 'R', 'N', 'D'] as const).map((g, i) => (
            <text key={g} x={1571 + i * 16} y="423" className={car.gear === g ? 'on' : ''}>{g}</text>
          ))}
        </g>

        {/* Telltales */}
        <g transform="translate(1452 412)">
          {car.headlights && <path d="M0 0 Q6 -5 10 0 Q6 5 0 0 Z M12 -3 L17 -3 M12 0 L17 0 M12 3 L17 3" stroke="#3dff7a" fill="#3dff7a" strokeWidth="1" />}
          {car.autoHold && <text x="24" y="3" className="cl-tell" fill="#3dff7a">A</text>}
          {car.gear === 'P' && live && <g transform="translate(40 0)"><circle r="5" stroke="#ff4040" fill="none" strokeWidth="1.2" /><text y="2.6" className="cl-tell" fill="#ff4040">P</text></g>}
          {car.locked && <path d="M54 -1 h7 v6 h-7 Z M55.5 -1 v-2 a2 2 0 0 1 4 0 v2" stroke="#9fb4d4" fill="none" strokeWidth="1" />}
        </g>
      </g>

      {/* Turn signals stay live even with the engine off (hazards) */}
      <path className={blinkL ? 'cl-turn on' : 'cl-turn'} d="M1540 312 L1552 303 L1552 308 L1562 308 L1562 316 L1552 316 L1552 321 Z" />
      <path className={blinkR ? 'cl-turn on' : 'cl-turn'} d="M1650 312 L1638 303 L1638 308 L1628 308 L1628 316 L1638 316 L1638 321 Z" />
      {!live && <text x="1595" y="372" className="cl-unit" opacity="0.55">PRESS START</text>}
      {car.ignition === 'acc' && <text x="1595" y="302" className="cl-acc">ACC · ENGINE OFF</text>}
    </Part>
  );
}
