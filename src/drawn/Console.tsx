import { useRef } from 'react';
import type { CarState, Gear, Intent } from '../types';
import { Part } from './Part';

const GEARS: Gear[] = ['P', 'R', 'N', 'D'];
const TRAVEL: Record<Gear, number> = { P: 0, R: 9, N: 18, D: 28 };

const bootPath = (dy: number) =>
  `M1060 ${694 + dy} L1106 ${692 + dy} Q1150 ${730 + dy / 2} 1150 800 L1012 802 Q1010 ${730 + dy / 2} 1060 ${694 + dy} Z`;

/** Gear selector with the lit P-R-N-D column, and the drive-assist button strip. */
export function Console({ car, onIntent }: { car: CarState; onIntent: (i: Intent) => void }) {
  const dy = TRAVEL[car.gear];
  const drag = useRef<{ y: number; moved: boolean } | null>(null);

  const shift = (g: Gear) => { if (g !== car.gear) onIntent({ type: 'gear', gear: g }); };
  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const steps = Math.round((e.clientY - d.y) / 22);
    if (steps !== 0) {
      d.moved = true;
      d.y = e.clientY;
      const idx = Math.min(3, Math.max(0, GEARS.indexOf(car.gear) + steps));
      shift(GEARS[idx]);
    }
  };
  const onUp = () => {
    if (drag.current && !drag.current.moved) shift(car.gear === 'P' ? 'D' : 'P');
    drag.current = null;
  };

  const strip: { label: string; on: boolean; act: () => void; glyph: React.ReactNode }[] = [
    { label: `Drive mode: ${car.driveMode}`, on: car.driveMode !== 'normal', act: () => onIntent({ type: 'drive.mode', mode: car.driveMode === 'normal' ? 'sport' : car.driveMode === 'sport' ? 'eco' : 'normal' }),
      glyph: <path d="M-6 3 A7 7 0 0 1 6 3 M0 3 L3 -2" /> },
    { label: 'Auto Hold', on: car.autoHold, act: () => onIntent({ type: 'autohold' }), glyph: <><circle r="5" /><text y="2.4" className="btn-txt">A</text></> },
    { label: 'Hazard lights', on: car.hazard, act: () => onIntent({ type: 'lights.hazard', on: !car.hazard }), glyph: <path d="M0 -5 L5 4 L-5 4 Z" /> },
    { label: 'Parking sensors', on: car.gear === 'R', act: () => onIntent({ type: 'gear', gear: car.gear === 'R' ? 'P' : 'R' }), glyph: <path d="M-5 4 L-5 -4 L1 -4 Q5 -4 5 0 Q5 3 1 3 L-5 3" /> },
    { label: 'Door lock', on: car.locked, act: () => onIntent({ type: 'doors.lock', locked: !car.locked }), glyph: <path d="M-4 0 h8 v6 h-8 Z M-2.5 0 v-2.5 a2.5 2.5 0 0 1 5 0 V0" /> },
  ];

  return (
    <Part x={880} y={570} w={330} h={244} className="console">
      {/* Button strip, chrome-edged, following the console slope */}
      <path d="M992 668 L1046 666 L990 802 L934 804 Z" fill="#07090d" stroke="url(#d-chromeH)" strokeWidth="1.4" />
      {strip.map((b, i) => {
        const x = 1018 - i * 13.2;
        const y = 682 + i * 27;
        return (
          <g key={b.label} className={`hit btn ${b.on ? 'lit' : ''}`} onClick={b.act} role="button" aria-label={b.label}
            transform={`translate(${x} ${y}) skewX(-22)`}>
            <title>{b.label}</title>
            <rect x="-17" y="-10" width="34" height="20" rx="3" fill="#10141b" stroke="#2a323e" strokeWidth="0.8" />
            <path d="M-15 -8.5 L15 -8.5" stroke="#3a4352" strokeWidth="0.6" />
            <g transform="skewX(22)" stroke={b.on ? '#ffffff' : '#8fd0ff'} fill="none" strokeWidth="1.1" strokeLinecap="round">{b.glyph}</g>
            {b.on && <rect x="-10" y="6.5" width="20" height="1.6" rx="0.8" fill="#ffb02e" />}
          </g>
        );
      })}

      {/* P-R-N-D indicator column */}
      <path d="M1122 690 L1176 688 L1192 800 L1136 802 Z" fill="#06080b" stroke="#161d27" strokeWidth="1" />
      {GEARS.map((g, i) => (
        <g key={g} className={`hit gear-led ${car.gear === g ? 'on' : ''}`} onClick={() => shift(g)} role="button" aria-label={`Gear ${g}`}>
          <title>{`Shift to ${g}`}</title>
          <rect x={1158 + i * 2.5} y={694 + i * 17} width="20" height="15" fill="transparent" />
          <text x={1168 + i * 2.5} y={705 + i * 17}>{g}</text>
        </g>
      ))}

      {/* Gear lever: boot follows the knob along its travel */}
      <path className="boot" style={{ d: `path('${bootPath(dy)}')` } as React.CSSProperties} fill="#0a0c10" />
      <g stroke="#1b2028" strokeWidth="1.2" fill="none" className="boot" style={{ transform: `translateY(${dy * 0.5}px)` }}>
        <path d="M1050 730 Q1080 722 1116 728" /><path d="M1036 760 Q1080 750 1128 758" /><path d="M1024 788 Q1080 778 1140 786" />
      </g>
      <path d={`M1072 ${694 + dy} Q1050 760 1040 800 M1096 ${693 + dy} Q1114 760 1122 800`} stroke="#59606d" strokeWidth="1" strokeDasharray="2 2.4" fill="none" className="boot" />
      <g className="hit knob" style={{ transform: `translateY(${dy}px)` }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} role="slider" aria-label="Gear selector" aria-valuetext={car.gear}>
        <title>Gear selector: drag up/down or click (P ↔ D)</title>
        <path d="M1062 682 L1104 680 L1106 692 L1060 694 Z" fill="url(#d-chromeH)" />
        <path d="M1052 598 Q1050 580 1072 578 L1098 578 Q1120 580 1118 596 L1112 640 Q1108 662 1100 680 L1066 682 Q1058 662 1056 640 Z" fill="url(#d-leather)" />
        <ellipse cx="1085" cy="584" rx="29" ry="6.5" fill="#4f4a50" />
        <path d="M1058 586 Q1084 576 1112 586" stroke="#6c7686" strokeWidth="1" fill="none" />
        <path d="M1055 600 Q1053 640 1065 680" stroke="url(#d-chrome)" strokeWidth="2" fill="none" opacity="0.85" />
        <rect x="1104" y="606" width="7" height="16" rx="2" fill="#181c22" stroke="#2c333e" strokeWidth="0.6" />
        <text x="1085" y="588" className="knob-txt">{car.gear}</text>
      </g>
    </Part>
  );
}
