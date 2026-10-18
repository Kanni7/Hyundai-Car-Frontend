import type { CarState, Intent } from '../types';
import { Part } from './Part';

const SLATS = [448, 455, 462, 469, 476, 483];

/** Chrome-ringed centre vents with the hazard switch between them. */
export function VentModule({ car, onIntent }: { car: CarState; onIntent: (i: Intent) => void }) {
  const open = car.ignition !== 'off' && car.climate.on;
  return (
    <Part x={950} y={420} w={392} h={84} className="vents">
      <path d="M976 427 L1318 428 Q1333 428 1331 441 L1323 471 Q1316 496 1290 497 L1012 497 Q986 496 979 476 L962 443 Q959 427 976 427 Z" fill="#04060a" />
      {/* Slats tilt open when air is flowing */}
      {SLATS.map((y, i) => (
        <g key={y} className={`slat ${open ? 'open' : ''}`} style={{ transitionDelay: `${i * 40}ms` }}>
          <path d={`M988 ${y} L1118 ${y + 1}`} stroke="#141a23" strokeWidth="4.5" />
          <path d={`M988 ${y - 1.4} L1118 ${y - 0.4}`} stroke="#3b4553" strokeWidth="0.8" className="slat-edge" />
          <path d={`M1174 ${y + 3} L1306 ${y + 4.5}`} stroke="#141a23" strokeWidth="4.5" />
          <path d={`M1174 ${y + 1.6} L1306 ${y + 3.1}`} stroke="#3b4553" strokeWidth="0.8" className="slat-edge" />
        </g>
      ))}
      <rect x="1040" y="455" width="28" height="4" rx="2" fill="url(#d-chromeH)" />
      <rect x="1214" y="461" width="30" height="4" rx="2" fill="url(#d-chromeH)" />
      <path d="M1000 487 L1300 491" stroke="#1d2530" strokeWidth="1.5" />
      {[1030, 1075, 1120, 1180, 1230, 1275].map((x) => <path key={x} d={`M${x} 485 L${x - 3} 492`} stroke="#3a4452" strokeWidth="1" />)}
      {/* Chrome surround (outer bright line, inner softer line) */}
      <path d="M976 427 L1318 428 Q1333 428 1331 441 L1323 471 Q1316 496 1290 497 L1012 497 Q986 496 979 476 L962 443 Q959 427 976 427 Z" fill="none" stroke="url(#d-chrome)" strokeWidth="3" />
      <path d="M980 433 L1314 434 Q1325 434 1324 444 L1317 469 Q1311 490 1289 491 L1014 491 Q992 490 986 473 L970 444 Q967 433 980 433 Z" fill="none" stroke="#8e97a5" strokeWidth="0.9" opacity="0.55" />
      <path d="M1012 497 L1290 497" stroke="#f2f5fa" strokeWidth="1.2" opacity="0.85" />

      {/* Hazard switch */}
      <g className={`hit hazard ${car.hazard ? 'on' : ''}`} onClick={() => onIntent({ type: 'lights.hazard', on: !car.hazard })} role="button" aria-label="Hazard lights">
        <title>Hazard lights</title>
        <rect x="1123" y="447" width="47" height="34" rx="4" fill="#0b0d11" stroke="#262d38" strokeWidth="1" />
        <path d="M1125 449 L1168 449" stroke="#3a4250" strokeWidth="0.8" />
        <g className="hz-glow"><path d="M1146 452 L1160 476 L1132 476 Z" fill="#ff2a2a" opacity="0.6" filter="url(#d-b3)" /></g>
        <path d="M1146 453 L1159.5 475.5 L1132.5 475.5 Z" fill="none" stroke="#ff3030" strokeWidth="2.6" strokeLinejoin="round" className="hz-tri" />
        <path d="M1146 461 L1152 471.5 L1140 471.5 Z" fill="none" stroke="#ff3030" strokeWidth="1.6" strokeLinejoin="round" className="hz-tri" />
      </g>
    </Part>
  );
}
