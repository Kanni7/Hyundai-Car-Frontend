import type { ReactNode } from 'react';
import type { CarState, Intent } from '../types';
import { FAN_MAX } from '../state/car';
import { Part } from './Part';

const SEGS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc',
  '7': 'abc', '8': 'abcdefg', '9': 'abfgcd', O: 'abcdef', F: 'aefg', '-': 'g', ' ': '',
};

/** Seven-segment readout, the way the real climate LCD draws digits. */
export function SevenSeg({ text, x, y, w, h, t = 1.8, gap = 2.2, color = 'currentColor' }: {
  text: string; x: number; y: number; w: number; h: number; t?: number; gap?: number; color?: string;
}) {
  const out: ReactNode[] = [];
  let cx = x;
  for (const [i, ch] of [...text].entries()) {
    if (ch === '.') {
      out.push(<circle key={i} cx={cx - gap / 2} cy={y + h - t / 2} r={t * 0.55} />);
      continue;
    }
    const on = SEGS[ch] ?? '';
    const hh = h / 2;
    const seg: Record<string, [number, number, number, number]> = {
      a: [cx + t / 2 + 0.4, y, w - t - 0.8, t],
      g: [cx + t / 2 + 0.4, y + hh - t / 2, w - t - 0.8, t],
      d: [cx + t / 2 + 0.4, y + h - t, w - t - 0.8, t],
      f: [cx, y + t / 2 + 0.4, t, hh - t / 2 - 0.8],
      b: [cx + w - t, y + t / 2 + 0.4, t, hh - t / 2 - 0.8],
      e: [cx, y + hh + 0.4, t, hh - t / 2 - 0.8],
      c: [cx + w - t, y + hh + 0.4, t, hh - t / 2 - 0.8],
    };
    out.push(
      <g key={i}>
        {[...on].map((s) => {
          const [sx, sy, sw, sh] = seg[s];
          return <rect key={s} x={sx} y={sy} width={sw} height={sh} rx={t / 2} />;
        })}
      </g>,
    );
    cx += w + gap;
  }
  return <g fill={color} transform={`skewX(-6) translate(${y * 0.105} 0)`}>{out}</g>;
}

function Btn({ x, y, label, lit, led, onClick, children }: {
  x: number; y: number; label: string; lit?: boolean; led?: string; onClick: () => void; children: ReactNode;
}) {
  return (
    <g className="hit btn" onClick={onClick} role="button" aria-label={label}>
      <title>{label}</title>
      <rect x={x - 12} y={y - 8} width="24" height="16" rx="3" fill="transparent" />
      {led && <circle cx={x} cy={y - 7} r="1.6" fill={lit ? led : '#2a2f38'} className={lit ? 'led-on' : ''} />}
      <g className="glyph" stroke="#8fd0ff" fill="none" strokeWidth="1.1" strokeLinecap="round" opacity={lit === false ? 0.65 : 1}>{children}</g>
    </g>
  );
}

/** Piano-black climate panel under the vents: real buttons, LCD temperature and fan readout. */
export function ClimatePanel({ car, onIntent }: { car: CarState; onIntent: (i: Intent) => void }) {
  const c = car.climate;
  const live = car.ignition !== 'off' && c.on;
  const [whole, dec] = c.temp.toFixed(1).split('.');
  const step = (d: number) => onIntent({ type: 'climate.setTemp', value: c.temp + d });

  return (
    <Part x={980} y={498} w={332} h={72} className="climate-panel">
      <path d="M988 503 L1302 506 Q1308 506 1307 512 L1304 558 Q1303 565 1296 565 L994 563 Q987 563 987 556 L985 510 Q985 503 988 503 Z" fill="url(#d-piano)" stroke="#1b212b" strokeWidth="1" />
      <path d="M992 505 L1298 508" stroke="#3a4454" strokeWidth="0.8" opacity="0.8" />
      <path d="M1052 547 L1246 558" stroke="url(#d-chromeH)" strokeWidth="1.6" />

      {/* LCD: cabin temperature (single zone) */}
      <g className="lcd-glow" color="#a8dcff" opacity={live ? 1 : 0.12}>
        <g filter="url(#d-b1)" opacity="0.8">
          {live ? <SevenSeg text={whole} x={1064} y={520} w={8} h={13} /> : <SevenSeg text="OFF" x={1064} y={520} w={8} h={13} />}
        </g>
        {live ? <SevenSeg text={whole} x={1064} y={520} w={8} h={13} /> : <SevenSeg text="OFF" x={1064} y={520} w={8} h={13} />}
        {live && <SevenSeg text={dec} x={1087} y={526} w={5} h={7} t={1.3} />}
      </g>
      <g className="hit" onWheel={(e) => step(e.deltaY < 0 ? 0.5 : -0.5)}>
        <title>Temperature: click top half to raise, bottom half to lower, or scroll</title>
        <rect x="1058" y="514" width="44" height="12" fill="transparent" onClick={() => step(0.5)} />
        <rect x="1058" y="526" width="44" height="12" fill="transparent" onClick={() => step(-0.5)} />
      </g>

      {/* Centre: fan bars and airflow mode */}
      <g opacity={live ? 1 : 0.12} stroke="#a8dcff" fill="none" strokeWidth="1.1">
        <circle cx="1112" cy="529" r="4.2" />
        <path d="M1112 525 L1112 529 L1116 531 M1112 529 L1108 531" />
        {Array.from({ length: FAN_MAX }, (_, k) => (
          <rect key={k} x={1122 + k * 4.6} y={533 - k * 1.1 - 3} width="2.6" height={3 + k * 1.1} rx="0.6"
            fill={k < c.fan ? '#a8dcff' : 'none'} stroke="#a8dcff" strokeWidth="0.5" opacity={k < c.fan ? 1 : 0.35} />
        ))}
        <circle cx="1172" cy="523" r="2" />
        <path d="M1172 526 L1170 533 L1176 533 M1176 528 L1184 525 M1176 531 L1184 533" />
      </g>

      {/* Right LCD: blower level */}
      <g color="#a8dcff" opacity={live ? 1 : 0.12}>
        <g stroke="#a8dcff" fill="none" strokeWidth="1.1">
          <circle cx="1205" cy="533" r="4.5" />
          <path d="M1205 528.5 Q1208 531 1205 533 Q1202 535 1205 537.5 M1200.5 533 Q1203 530 1205 533 Q1207 536 1209.5 533" />
        </g>
        <SevenSeg text={String(live ? c.fan : 0)} x={1214} y={527} w={8} h={13} />
      </g>
      <g className="hit" onWheel={(e) => onIntent({ type: 'climate.fan', delta: e.deltaY < 0 ? 1 : -1 })}>
        <title>Fan speed: click top half to increase, bottom half to decrease</title>
        <rect x="1196" y="520" width="34" height="11" fill="transparent" onClick={() => onIntent({ type: 'climate.fan', delta: 1 })} />
        <rect x="1196" y="531" width="34" height="11" fill="transparent" onClick={() => onIntent({ type: 'climate.fan', delta: -1 })} />
      </g>

      {/* Buttons */}
      <Btn x={1016} y={518} label="Auto climate" lit={c.auto && live} led="#ffd23a" onClick={() => onIntent({ type: 'climate.auto' })}>
        <text x="1016" y="521" className="btn-txt">AUTO</text>
      </Btn>
      <Btn x={1042} y={520} label="A/C" lit={live} led="#ff8a2a" onClick={() => onIntent({ type: 'climate.power', on: !c.on })}>
        <text x="1042" y="523" className="btn-txt">A/C</text>
      </Btn>
      <Btn x={1015} y={541} label="Front defrost" lit={c.defrost} led="#ff8a2a" onClick={() => onIntent({ type: 'climate.defrost' })}>
        <path d="M1009 544 Q1015 536 1021 544 M1012 539 L1012 535 M1015 538 L1015 534 M1018 539 L1018 535" />
      </Btn>
      <Btn x={1041} y={543} label="Recirculation" lit={c.recirc} led="#ff8a2a" onClick={() => onIntent({ type: 'climate.recirc' })}>
        <path d="M1034 546 L1048 546 L1046 541 L1036 541 Z M1037 538 Q1041 534 1045 538 L1043 538" />
      </Btn>
      <Btn x={1240} y={532} label="Fan slower" onClick={() => onIntent({ type: 'climate.fan', delta: -1 })}>
        <circle cx="1240" cy="533" r="3" /><path d="M1236 528 L1244 528" />
      </Btn>
      <Btn x={1268} y={530} label="Fan faster" onClick={() => onIntent({ type: 'climate.fan', delta: 1 })}>
        <circle cx="1268" cy="531" r="4.2" /><path d="M1268 524 L1268 527 M1264.5 526 L1271.5 526" />
      </Btn>
      <Btn x={1239} y={554} label="Rear defrost" lit={c.defrost} onClick={() => onIntent({ type: 'climate.defrost' })}>
        <rect x="1233" y="551" width="12" height="7" rx="1" /><path d="M1236 549 L1236 547 M1239 549 L1239 547 M1242 549 L1242 547" />
      </Btn>
      <Btn x={1267} y={556} label="Climate off" onClick={() => onIntent({ type: 'climate.power', on: !c.on })}>
        <path d="M1264 553 A4.2 4.2 0 1 0 1270 553 M1267 551 L1267 556" />
      </Btn>
    </Part>
  );
}
