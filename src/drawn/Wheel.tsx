import { useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import type { CarState, Intent } from '../types';
import { carAudio } from '../lib/audio';
import { Part } from './Part';
import { RIM, WHEEL } from './geometry';

const BOX = { x: 1320, y: 230, w: 506, h: 472 };

function Key({ x, y, w = 22, h = 13, label, onClick, children }: {
  x: number; y: number; w?: number; h?: number; label: string; onClick: () => void; children: ReactNode;
}) {
  return (
    <g className="hit btn" onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerDown={(e) => e.stopPropagation()} role="button" aria-label={label}>
      <title>{label}</title>
      <rect x={x - w / 2} y={y - h / 2 + 1} width={w} height={h} rx="4" fill="#000" opacity="0.6" />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx="4" fill="#16181d" stroke="#30353e" strokeWidth="0.8" />
      <path d={`M${x - w / 2 + 2.5} ${y - h / 2 + 1.2} L${x + w / 2 - 2.5} ${y - h / 2 + 1.2}`} stroke="#545b67" strokeWidth="0.6" />
      <g className="key-glyph" stroke="#e4f2ff" fill="none" strokeWidth="1.1" strokeLinecap="round">{children}</g>
    </g>
  );
}

/**
 * Steering wheel. The geometry rotates (drag the rim to steer, it springs back);
 * the lighting stays fixed on top so highlights don't spin with it.
 */
export function Wheel({ car, onIntent, onMic }: { car: CarState; onIntent: (i: Intent) => void; onMic: () => void }) {
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ a0: number; base: number; cx: number; cy: number } | null>(null);

  const pointerAngle = (e: RPointerEvent, cx: number, cy: number) => (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  const onDown = (e: RPointerEvent<SVGPathElement>) => {
    const svg = (e.currentTarget.ownerSVGElement ?? e.currentTarget) as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    // Wheel centre in screen space (rotation keeps it fixed)
    const cx = r.left + ((WHEEL.cx - BOX.x) / BOX.w) * r.width;
    const cy = r.top + ((WHEEL.cy - BOX.y) / BOX.h) * r.height;
    start.current = { a0: pointerAngle(e, cx, cy), base: angle, cx, cy };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onMove = (e: RPointerEvent) => {
    const s = start.current;
    if (!s) return;
    let d = pointerAngle(e, s.cx, s.cy) - s.a0;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    setAngle(Math.max(-450, Math.min(450, s.base + d)));
  };
  const onUp = () => { start.current = null; setDragging(false); setAngle(0); };

  const m = car.media;
  return (
    <>
      <Part x={BOX.x} y={BOX.y} w={BOX.w} h={BOX.h + 20}>
        <path d={RIM} fillRule="evenodd" fill="#000" opacity="0.55" transform="translate(5 9)" filter="url(#d-b8)" />
      </Part>
      <div className={`wheel-rot ${dragging ? 'dragging' : ''}`}
        style={{ left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, transformOrigin: `${WHEEL.cx - BOX.x}px ${WHEEL.cy - BOX.y}px`, transform: `rotate(${angle}deg)` }}>
        <svg viewBox={`${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`} width={BOX.w} height={BOX.h} style={{ overflow: 'visible' }}>
          <defs>
            {/* Cross-section of the rim: dark edges, soft crest, so it reads as a padded tube */}
            <radialGradient id="w-tube" gradientUnits="userSpaceOnUse" cx={WHEEL.cx} cy={WHEEL.cy} r={WHEEL.rx}
              gradientTransform={`translate(${WHEEL.cx} ${WHEEL.cy}) scale(1 ${WHEEL.ry / WHEEL.rx}) translate(${-WHEEL.cx} ${-WHEEL.cy})`}>
              <stop offset="0.862" stopColor="#030304" />
              <stop offset="0.885" stopColor="#0e1013" />
              <stop offset="0.915" stopColor="#1d1f24" />
              <stop offset="0.938" stopColor="#25272d" />
              <stop offset="0.962" stopColor="#17191d" />
              <stop offset="0.988" stopColor="#08090b" />
              <stop offset="1" stopColor="#030304" />
            </radialGradient>
            <linearGradient id="w-satin" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#353940" />
              <stop offset="0.18" stopColor="#8c939e" />
              <stop offset="0.32" stopColor="#d3d8df" />
              <stop offset="0.5" stopColor="#737a85" />
              <stop offset="0.78" stopColor="#3f444b" />
              <stop offset="1" stopColor="#868d97" />
            </linearGradient>
            <linearGradient id="w-gloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#23262d" />
              <stop offset="0.28" stopColor="#08090b" />
              <stop offset="1" stopColor="#0d0e11" />
            </linearGradient>
            <radialGradient id="w-hubFace" cx="0.45" cy="0.28" r="0.8">
              <stop offset="0" stopColor="#24272d" />
              <stop offset="0.55" stopColor="#15171b" />
              <stop offset="1" stopColor="#0b0c0f" />
            </radialGradient>
            <pattern id="w-perf" width="4.2" height="4.2" patternUnits="userSpaceOnUse">
              <circle cx="2.1" cy="2.1" r="0.7" fill="#000" />
              <circle cx="1.8" cy="1.8" r="0.35" fill="#3a3d44" opacity="0.6" />
            </pattern>
            <clipPath id="w-grips">
              <path d={`M${WHEEL.cx} ${WHEEL.cy} L${WHEEL.cx - 400} ${WHEEL.cy - 150} L${WHEEL.cx - 400} ${WHEEL.cy + 170} Z`} />
              <path d={`M${WHEEL.cx} ${WHEEL.cy} L${WHEEL.cx + 400} ${WHEEL.cy - 150} L${WHEEL.cx + 400} ${WHEEL.cy + 170} Z`} />
            </clipPath>
            {/* The chrome badge is photographed under studio light; dim and cool it to sit in a night cabin */}
            <filter id="w-logoTone" x="-5%" y="-5%" width="110%" height="110%">
              <feColorMatrix type="matrix" values="0.78 0 0 0 0  0 0.8 0 0 0  0 0 0.88 0 0.015  0 0 0 1 0" />
            </filter>
          </defs>

          {/* Rim: padded leather, perforated grips at 9 and 3 o'clock, double stitching */}
          <path d={RIM} fillRule="evenodd" fill="url(#w-tube)" />
          <path d={RIM} fillRule="evenodd" fill="url(#w-perf)" clipPath="url(#w-grips)" opacity="0.9" />
          <path d={RIM} fillRule="evenodd" fill="#000" filter="url(#d-leatherGrain)" opacity="0.8" />
          <path d={RIM} fillRule="evenodd" fill="#000" opacity="0.001" className="hit rim"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <title>Drag the rim to steer</title>
          </path>
          <ellipse cx={WHEEL.cx} cy={WHEEL.cy} rx={WHEEL.irx + 3.5} ry={WHEEL.iry + 3.5} stroke="#5a606b" strokeWidth="0.8" strokeDasharray="2.2 2" fill="none" opacity="0.6" />
          <ellipse cx={WHEEL.cx} cy={WHEEL.cy} rx={WHEEL.irx + 6.5} ry={WHEEL.iry + 6.5} stroke="#5a606b" strokeWidth="0.8" strokeDasharray="2.2 2" fill="none" opacity="0.45" />
          <ellipse cx={WHEEL.cx} cy={WHEEL.cy} rx={WHEEL.irx + 5} ry={WHEEL.iry + 5} stroke="#020203" strokeWidth="0.8" fill="none" opacity="0.8" />
          <ellipse cx={WHEEL.cx} cy={WHEEL.cy} rx={WHEEL.irx} ry={WHEEL.iry} stroke="#000" strokeWidth="3" fill="none" filter="url(#d-b1)" />
          {/* Seams where the perforated grip panels begin */}
          <g stroke="#020203" strokeWidth="1.4">
            <path d="M1349 384 L1377 392" /><path d="M1347 553 L1375 543" />
            <path d="M1795 384 L1767 392" /><path d="M1797 553 L1769 543" />
          </g>

          {/* Side spokes: leather sleeve, gloss-black switch panel, satin frame */}
          <path d="M1354 436 Q1400 426 1466 440 L1468 528 Q1420 528 1393 518 Q1362 504 1354 482 Z" fill="#000" opacity="0.55" filter="url(#d-b3)" />
          <path d="M1790 438 Q1745 426 1656 440 L1654 528 Q1702 529 1750 518 Q1782 504 1790 482 Z" fill="#000" opacity="0.55" filter="url(#d-b3)" />
          <path d="M1358 440 Q1400 430 1464 444 L1464 522 Q1420 522 1395 513 Q1366 500 1358 480 Z" fill="#0f1114" />
          <path d="M1786 442 Q1745 430 1660 444 L1658 522 Q1702 523 1748 513 Q1780 500 1786 480 Z" fill="#0f1114" />
          <path d="M1374 447 Q1405 438 1454 449 L1454 508 Q1418 510 1397 503 Q1378 494 1374 478 Z" fill="url(#w-gloss)" stroke="#2c3038" strokeWidth="0.8" />
          <path d="M1770 449 Q1740 438 1670 449 L1668 508 Q1710 511 1745 503 Q1766 494 1770 478 Z" fill="url(#w-gloss)" stroke="#2c3038" strokeWidth="0.8" />
          <path d="M1376 449 Q1405 441 1452 451" stroke="#4a505b" strokeWidth="0.7" fill="none" />
          <path d="M1768 451 Q1740 441 1672 451" stroke="#4a505b" strokeWidth="0.7" fill="none" />
          <path d="M1361 476 Q1370 505 1398 513 Q1430 522 1464 522" stroke="url(#d-chromeH)" strokeWidth="2.8" fill="none" />
          <path d="M1783 478 Q1774 505 1748 513 Q1714 523 1658 522" stroke="url(#d-chromeH)" strokeWidth="2.8" fill="none" />

          {/* Lower V spoke in brushed satin */}
          <path d="M1455 530 L1488 645 Q1492 657 1506 657 L1622 657 Q1636 657 1640 645 L1672 528" stroke="#000" strokeWidth="10" opacity="0.5" fill="none" filter="url(#d-b3)" />
          <path d="M1452 525 L1480 525 L1512 628 L1618 628 L1641 523 L1669 523 L1644 640 Q1640 652 1626 652 L1502 652 Q1488 652 1485 640 Z" fill="url(#w-satin)" />
          <path d="M1458 527 L1487 636 Q1491 646 1503 646 L1625 646 Q1637 646 1640 636 L1664 525" stroke="#16181c" strokeWidth="6" fill="none" opacity="0.75" />
          <path d="M1452 525 L1485 640 Q1488 652 1502 652 L1626 652 Q1640 652 1644 640 L1669 523" stroke="url(#d-chromeH)" strokeWidth="2.2" fill="none" />
          <path d="M1480 525 L1512 628 L1618 628 L1641 523" stroke="#c9ced6" strokeWidth="1" fill="none" opacity="0.7" />

          {/* Hub: drop shadow, bevelled airbag pad, real Hyundai badge */}
          <path d="M1478 426 Q1561 408 1648 426 Q1670 433 1668 478 Q1664 548 1604 564 Q1561 572 1520 564 Q1460 548 1456 478 Q1454 433 1478 426 Z" fill="#000" opacity="0.7" filter="url(#d-b8)" />
          <path d="M1474 418 Q1558 400 1644 418 Q1666 425 1664 470 Q1660 540 1600 556 Q1558 564 1516 556 Q1456 540 1452 470 Q1450 425 1474 418 Z" fill="#0a0b0e" stroke="#1d2026" strokeWidth="1" />
          <path d="M1480 424 Q1558 407 1638 424 Q1657 431 1655 470 Q1651 534 1597 548 Q1558 556 1519 548 Q1465 534 1461 470 Q1459 431 1480 424 Z" fill="url(#w-hubFace)" />
          <path d="M1480 424 Q1558 407 1638 424 Q1657 431 1655 470 Q1651 534 1597 548 Q1558 556 1519 548 Q1465 534 1461 470 Q1459 431 1480 424 Z" fill="#000" filter="url(#d-leatherGrain)" opacity="0.55" />
          <path d="M1484 426 Q1558 410 1634 426" stroke="#454b56" strokeWidth="1.4" fill="none" opacity="0.85" filter="url(#d-b1)" />
          <path d="M1466 488 Q1472 530 1519 546 Q1558 553 1597 546 Q1644 530 1650 488" stroke="#000" strokeWidth="2" fill="none" opacity="0.6" />
          <ellipse cx="1558" cy="483" rx="45" ry="21" fill="#000" opacity="0.65" filter="url(#d-b3)" />
          <image href="/images/hyundai-logo.webp" x="1514" y="459" width="88" height="40" preserveAspectRatio="none" filter="url(#w-logoTone)" />
          <text x="1558" y="532" className="airbag">AIRBAG</text>
          <circle cx={WHEEL.cx - 15} cy={WHEEL.cy + 13} r="66" fill="transparent" className="hit" onClick={() => carAudio.horn()}>
            <title>Horn</title>
          </circle>

          {/* Left spoke: audio */}
          <Key x={1402} y={447} label="Play / pause" onClick={() => onIntent(m.playing ? { type: 'media.pause' } : { type: 'media.play' })}>
            {m.playing ? <path d="M1399 443 L1399 451 M1405 443 L1405 451" /> : <path d="M1399 443 L1406 447 L1399 451 Z" />}
          </Key>
          <Key x={1438} y={447} label="Mute" onClick={() => onIntent({ type: 'media.volume', mute: !m.muted })}>
            <path d="M1432 445 L1435 445 L1438 442 L1438 452 L1435 449 L1432 449 Z M1441 445 L1445 449 M1445 445 L1441 449" />
          </Key>
          <Key x={1421} y={469} w={46} label="Volume up" onClick={() => onIntent({ type: 'media.volume', delta: 2 })}>
            <path d="M1430 469 L1438 469 M1434 465 L1434 473" />
          </Key>
          <rect x="1398" y="463" width="20" height="12" rx="4" fill="transparent" className="hit"
            onClick={(e) => { e.stopPropagation(); onIntent({ type: 'media.volume', delta: -2 }); }}><title>Volume down</title></rect>
          <path d="M1404 469 L1412 469" stroke="#d6ecff" strokeWidth="1.1" />
          <Key x={1399} y={493} label="Previous track" onClick={() => onIntent({ type: 'media.skip', dir: -1 })}>
            <path d="M1396 489 L1396 497 M1403 489 L1397 493 L1403 497 Z" />
          </Key>
          <Key x={1434} y={495} label="Next track" onClick={() => onIntent({ type: 'media.skip', dir: 1 })}>
            <path d="M1437 491 L1437 499 M1430 491 L1436 495 L1430 499 Z" />
          </Key>

          {/* Right spoke: voice, phone, climate */}
          <Key x={1688} y={461} label="Voice assistant" onClick={onMic}>
            <path d="M1686 456 Q1686 454 1688 454 Q1690 454 1690 456 L1690 461 Q1690 463 1688 463 Q1686 463 1686 461 Z M1684 460 Q1684 466 1688 466 Q1692 466 1692 460 M1688 466 L1688 468" />
          </Key>
          <Key x={1724} y={461} label={car.phone ? 'End call' : 'Phone'} onClick={() => onIntent(car.phone ? { type: 'phone.end' } : { type: 'screen', page: 'phone' })}>
            <path d="M1719 457 Q1720 465 1729 466 L1729 463 L1726 462 L1725 463 Q1722 462 1721 459 L1722 458 L1721 455 Z" fill={car.phone ? '#ff6b6b' : 'none'} />
          </Key>
          <Key x={1712} y={487} w={46} label="Temperature up" onClick={() => onIntent({ type: 'climate.setTemp', value: car.climate.temp + 0.5 })}>
            <path d="M1722 490 L1726 484 L1730 490" />
          </Key>
          <rect x="1689" y="481" width="20" height="12" rx="4" fill="transparent" className="hit"
            onClick={(e) => { e.stopPropagation(); onIntent({ type: 'climate.setTemp', value: car.climate.temp - 0.5 }); }}><title>Temperature down</title></rect>
          <path d="M1694 484 L1698 490 L1702 484" stroke="#d6ecff" strokeWidth="1.1" fill="none" />
          <Key x={1692} y={513} label="Previous screen" onClick={() => onIntent({ type: 'screen', page: 'home' })}>
            <path d="M1694 509 L1689 513 L1694 517" />
          </Key>
          <Key x={1728} y={513} label="Climate screen" onClick={() => onIntent({ type: 'screen', page: 'climate' })}>
            <path d="M1726 509 L1731 513 L1726 517" />
          </Key>
        </svg>
      </div>

      {/* Fixed lighting over the rim */}
      <Part x={BOX.x} y={BOX.y} w={BOX.w} h={BOX.h} className="no-hit">
        <path d={RIM} fillRule="evenodd" fill="url(#d-rimLight)" />
        <path d="M1365 400 Q1420 285 1572 241 Q1700 245 1770 330" stroke="#c9c2d4" strokeWidth="2.2" opacity="0.22" fill="none" filter="url(#d-b1)" />
        <path d="M1392 360 Q1450 290 1572 270" stroke="#ffffff" strokeWidth="1" opacity="0.08" fill="none" />
        <path d="M1346 500 Q1356 560 1400 610" stroke="#8e9ab0" strokeWidth="1.6" opacity="0.14" fill="none" filter="url(#d-b1)" />
        <ellipse cx="1540" cy="432" rx="60" ry="9" fill="#ffffff" opacity="0.05" filter="url(#d-b3)" />
        <path d="M1352 520 Q1380 640 1500 684" stroke="#9fb4d0" strokeWidth="1.4" opacity="0.12" fill="none" />
      </Part>
    </>
  );
}

/** Column stalks behind the wheel: left = wipers, right = indicators (Indian RHD layout). */
export function Stalks({ car, onIntent }: { car: CarState; onIntent: (i: Intent) => void }) {
  const tilt = car.indicator === 'right' ? -7 : car.indicator === 'left' ? 7 : 0;
  const wiperTilt = car.wipers === 'fast' ? -10 : car.wipers === 'slow' ? -5 : 0;
  return (
    <Part x={1370} y={392} w={414} h={42} className="stalks">
      <g className="hit stalk" style={{ transform: `rotate(${wiperTilt}deg)`, transformOrigin: '1428px 410px' }}
        onClick={() => onIntent({ type: 'wipers', mode: car.wipers === 'off' ? 'slow' : car.wipers === 'slow' ? 'fast' : 'off' })} role="button" aria-label="Wiper stalk">
        <title>Wipers: click to cycle off / low / high</title>
        <path d="M1382 400 L1430 404 L1430 416 L1380 414 Q1373 407 1382 400 Z" fill="#14171c" stroke="#2c323b" strokeWidth="0.8" />
        <path d="M1384 402 L1428 405" stroke="#555d69" strokeWidth="0.8" />
        <rect x="1386" y="403" width="7" height="9" rx="1.5" fill="#22262d" />
      </g>
      <g className="hit stalk" style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '1726px 418px' }} role="button" aria-label="Indicator stalk">
        <title>Indicators: top half = right, bottom half = left</title>
        <path d="M1772 410 L1726 412 L1726 426 L1774 424 Q1781 417 1772 410 Z" fill="#14171c" stroke="#2c323b" strokeWidth="0.8" />
        <path d="M1770 412 L1728 414" stroke="#555d69" strokeWidth="0.8" />
        <rect x="1726" y="404" width="56" height="13" fill="transparent" onClick={() => onIntent({ type: 'indicator', dir: car.indicator === 'right' ? 'off' : 'right' })} />
        <rect x="1726" y="417" width="56" height="13" fill="transparent" onClick={() => onIntent({ type: 'indicator', dir: car.indicator === 'left' ? 'off' : 'left' })} />
      </g>
    </Part>
  );
}
