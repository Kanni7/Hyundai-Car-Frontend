import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { CornerUpRight, Fan, Phone } from 'lucide-react';
import type { SceneConfig, XY } from '../scenes';
import type { CarState, Intent, Toast } from '../types';
import { quadToMatrix3d } from '../lib/homography';
import { carAudio } from '../lib/audio';
import { AMBIENT_RGB } from '../lib/ambient';
import { AmbientFilter } from './AmbientFilter';
import { Airflow } from './Airflow';
import { Windshield } from './Windshield';
import { Infotainment, type VoicePhase } from './Infotainment';
import { DrawnCabin } from '../drawn/DrawnCabin';

interface Props {
  car: CarState;
  scene: SceneConfig;
  toast: Toast | null;
  voice: { phase: VoicePhase; interim: string; reply: string };
  onIntent: (i: Intent) => void;
  reserveBottom: number;
  focused: boolean;
  onToggleFocus: () => void;
  onMic: () => void;
}

const COMPARE = new URLSearchParams(window.location.search).get('compare');
const poly = (pts: XY[]) => `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(',')})`;
const at = ([x, y]: XY, extra?: CSSProperties): CSSProperties => ({ left: x, top: y, ...extra });

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

export function Cockpit({ car, scene, toast, voice, onIntent, reserveBottom, focused, onToggleFocus, onMic }: Props) {
  const vp = useViewport();

  // Fill the width; keep at least (viewport - dock) of height; crop sides around the focal point.
  let s = Math.max(vp.w / scene.width, (vp.h - reserveBottom) / scene.height);
  let sw = scene.width * s;
  let sh = scene.height * s;
  let left = sw > vp.w ? -(sw - vp.w) * scene.focusX : (vp.w - sw) / 2;
  let top = sh > vp.h ? -(sh - vp.h) * 0.4 : 0;
  const cabinBottom = Math.min(vp.h, top + sh);
  if (focused) {
    // Lean in towards the centre stack, like a driver glancing at the screen.
    const [x0, y0, x1, y1] = scene.focus;
    const room = vp.h - reserveBottom - 90;
    s = Math.min((vp.w * 0.9) / (x1 - x0), room / (y1 - y0));
    sw = scene.width * s;
    sh = scene.height * s;
    left = vp.w / 2 - ((x0 + x1) / 2) * s;
    top = 70 + room / 2 - ((y0 + y1) / 2) * s;
  }

  const screenTransform = useMemo(() => quadToMatrix3d(scene.screen.ui.w, scene.screen.ui.h, scene.screen.quad), [scene]);
  const amb = car.ambient;
  const ambientColor = amb.on ? AMBIENT_RGB[amb.color] : AMBIENT_RGB.off;
  const c = car.climate;
  const drawn = scene.kind === 'drawn';
  const airflow = <Airflow scene={scene} on={c.on && car.ignition !== 'off'} fan={c.fan} temp={c.temp} />;
  const screen = (
    <div className="screen" onDoubleClick={onToggleFocus} style={{ transform: screenTransform, width: scene.screen.ui.w, height: scene.screen.ui.h, borderRadius: scene.screen.radius }}>
      <Infotainment car={car} toast={toast} voice={voice} onIntent={onIntent} width={scene.screen.ui.w} height={scene.screen.ui.h} />
    </div>
  );

  return (
    <div className="viewport">
      <div className={`stage ${focused ? 'focused' : ''}`} key={scene.id}
        style={{ width: scene.width, height: scene.height, transform: `translate(${left}px, ${top}px) scale(${s})` }}>
        <div className="cabin" style={{ width: scene.width, height: scene.height }}>
          <img className="layer" src={scene.src} alt="Hyundai Verna interior" draggable={false} />
          {!drawn && (
            <>
              <AmbientFilter id={`amb-${scene.id}`} color={amb.party ? AMBIENT_RGB.red : ambientColor} gain={amb.on ? amb.brightness : 1} threshold={scene.ambient.threshold} />
              {/* Party mode spins the hue of the already-filtered layer on the GPU instead of re-running the filter. */}
              <div className={`layer ambient ${amb.on && amb.party ? 'party' : ''}`}>
                <img className="layer" src={scene.src} alt="" draggable={false}
                  style={{ filter: `url(#amb-${scene.id})`, clipPath: poly(scene.ambient.clip) }} />
              </div>
            </>
          )}

          {scene.windshield.headlight && (
            <div className={`headlight ${car.headlights ? 'on' : ''}`} style={ellipseStyle(scene.windshield.headlight)} />
          )}
          <div className={`sunlight ${car.sunroof ? 'on' : ''} ${scene.id}`} />
          <Windshield scene={scene} mode={car.wipers} />

          {drawn ? (
            <>
              <DrawnCabin car={car} onIntent={onIntent} onMic={onMic} airflow={airflow} screen={screen} />
              {/* Dev aid: ?compare=split or ?compare=overlay lays the source photo over the drawing */}
              {COMPARE && <img className={`layer compare-${COMPARE}`} src={scene.src} alt="" />}
            </>
          ) : (
            <>
              {airflow}
              {scene.seat && <div className={`seat-glow lvl-${car.seats.passenger}`} style={ellipseStyle(scene.seat)} />}
              {scene.cluster && <Cluster car={car} cfg={scene.cluster} />}
              {scene.climate.kind === 'lcd' ? (
                <>
                  <LcdTemp pos={scene.climate.left} size={scene.climate.size} value={c.temp} on={c.on} label="Cabin temperature"
                    onStep={(d) => onIntent({ type: 'climate.setTemp', value: c.temp + d })} />
                  {/* Single-zone AC: the second display shows blower speed instead of a duplicate temperature. */}
                  <LcdFan pos={scene.climate.right} size={scene.climate.size} fan={c.on ? c.fan : 0}
                    onStep={(d) => onIntent({ type: 'climate.fan', delta: d })} />
                </>
              ) : (
                <div className="lcd-chip" style={at(scene.climate.at, { width: scene.climate.w, height: scene.climate.h })}>
                  <span>{c.on ? `${c.temp.toFixed(1)}°` : 'OFF'}</span>
                  <i>{Array.from({ length: 8 }, (_, k) => <b key={k} className={c.on && k < c.fan ? 'on' : ''} />)}</i>
                </div>
              )}
              <button className={`hazard-btn ${car.hazard ? 'on' : ''}`} style={at(scene.hazard)}
                onClick={() => onIntent({ type: 'lights.hazard', on: !car.hazard })} aria-label="Hazard lights" title="Hazard lights" />
              {screen}
              <button className="horn" style={{ left: scene.horn.cx, top: scene.horn.cy, width: scene.horn.r * 2, height: scene.horn.r * 2 }}
                onClick={() => carAudio.horn()} aria-label="Horn" title="Horn" />
            </>
          )}
        </div>
      </div>
      <div className="viewport-fade" style={{ top: cabinBottom - 160, opacity: focused ? 0 : 1 }} />
    </div>
  );
}

function ellipseStyle(e: { cx: number; cy: number; rx: number; ry: number }): CSSProperties {
  return { left: e.cx - e.rx, top: e.cy - e.ry, width: e.rx * 2, height: e.ry * 2 };
}

function LcdTemp({ pos, size, value, on, label, onStep }: {
  pos: XY; size: number; value: number; on: boolean; label: string; onStep: (d: number) => void;
}) {
  return (
    <div className="lcd" style={at(pos, { fontSize: size })} title={`${label}: scroll or click top/bottom half`}
      onWheel={(e) => onStep(e.deltaY < 0 ? 0.5 : -0.5)}>
      <button className="lcd-up" onClick={() => onStep(0.5)} aria-label={`Raise ${label}`} />
      <button className="lcd-down" onClick={() => onStep(-0.5)} aria-label={`Lower ${label}`} />
      <span key={`${on}-${value}`}>{on ? value.toFixed(1) : 'OFF'}</span>
    </div>
  );
}

function LcdFan({ pos, size, fan, onStep }: { pos: XY; size: number; fan: number; onStep: (d: number) => void }) {
  return (
    <div className="lcd lcd-fan" style={at(pos, { fontSize: size })} title="Fan speed: scroll or click top/bottom half"
      onWheel={(e) => onStep(e.deltaY < 0 ? 1 : -1)}>
      <button className="lcd-up" onClick={() => onStep(1)} aria-label="Fan faster" />
      <button className="lcd-down" onClick={() => onStep(-1)} aria-label="Fan slower" />
      <span key={fan}><Fan /><i>{Array.from({ length: 8 }, (_, k) => <b key={k} className={k < fan ? 'on' : ''} />)}</i></span>
    </div>
  );
}

const MODE_TINT = { eco: '#2bff88', normal: null, sport: '#ff2a2a' } as const;

function Cluster({ car, cfg }: { car: CarState; cfg: NonNullable<SceneConfig['cluster']> }) {
  const tint = MODE_TINT[car.driveMode];
  let info: ReactNode;
  if (car.phone) info = <><b className="sm"><Phone /> {car.phone.contact}</b><small>ON CALL</small></>;
  else if (car.nav) info = <><b className="sm"><CornerUpRight /> 400 m</b><small>{car.nav.destination.toUpperCase()}</small></>;
  else info = <><b className={`mode-${car.driveMode}`}>{car.driveMode.toUpperCase()}</b><small>DRIVE MODE</small></>;
  return (
    <>
      {tint && (
        <>
          <div className="cluster-tint" style={{ ...ellipseStyle(cfg.tint), background: `radial-gradient(ellipse at center, ${tint} 0%, ${tint} 55%, transparent 72%)` }} />
          <div className="cluster-glow" style={{ ...ellipseStyle(cfg.tint), background: `radial-gradient(ellipse at center, ${tint}22 0%, transparent 70%)` }} />
        </>
      )}
      <div className="cl-patch cl-speed" style={at(cfg.speed)}><b>0</b><small>km/h</small></div>
      <div className="cl-patch cl-info" style={at(cfg.info)}>{info}</div>
      {car.hazard && cfg.arrows.map(([x, y], i) => (
        <svg key={i} className="cl-arrow" style={{ left: x - 7, top: y - 6 }} width="14" height="12" viewBox="0 0 14 12">
          <path d={i === 0 ? 'M0 6 L7 0 L7 3.5 L14 3.5 L14 8.5 L7 8.5 L7 12 Z' : 'M14 6 L7 0 L7 3.5 L0 3.5 L0 8.5 L7 8.5 L7 12 Z'} />
        </svg>
      ))}
    </>
  );
}
