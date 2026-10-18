// Stylised night map. Not real geography: a believable city grid for the demo.

const ROADS = [
  'M-10 60 C 80 70, 160 40, 250 58 S 380 80, 420 70',
  'M-10 150 C 60 140, 140 160, 220 150 S 340 120, 420 132',
  'M-10 210 L 420 196',
  'M60 -10 C 70 60, 50 140, 72 250',
  'M150 -10 L 160 250',
  'M250 -10 C 238 80, 262 170, 246 250',
  'M340 -10 C 352 70, 330 160, 348 250',
  'M-10 100 L 420 108',
  'M110 -10 L 410 250',
];
const MINOR = [
  'M20 30 L 380 26', 'M30 180 L 390 172', 'M100 -10 L 104 250', 'M200 -10 L 208 250', 'M300 -10 L 292 250',
  'M-10 240 L 180 -10', 'M210 250 L 420 30',
];
const ROUTES = [
  'M72 214 C 70 180, 60 160, 72 150 C 120 154, 150 158, 160 150 L 156 108 C 200 106, 230 106, 250 106 C 252 80, 246 66, 250 58 L 340 66',
  'M160 236 L 157 150 C 190 152, 210 152, 220 150 C 260 145, 300 128, 346 128 L 340 60 C 360 56, 380 60, 400 64',
  'M60 40 C 64 70, 70 90, 66 104 L 150 106 C 152 130, 156 150, 160 150 C 200 152, 222 150, 246 150 L 248 205',
];

export function MapView({ destination, mini = false }: { destination: string | null; mini?: boolean }) {
  const idx = destination ? [...destination].reduce((a, ch) => a + ch.charCodeAt(0), 0) % ROUTES.length : 0;
  const route = ROUTES[idx];
  const start = route.match(/M(\d+) (\d+)/)!;
  const ends = [...route.matchAll(/(\d+) (\d+)/g)];
  const end = ends[ends.length - 1];
  return (
    <svg className={`map ${mini ? 'map-mini' : ''}`} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="240" fill="#0a1220" />
      <path d="M-10 118 C 90 128, 180 92, 270 120 S 380 170, 420 160 L 420 190 C 330 196, 280 150, 200 140 S 60 160, -10 150 Z" fill="#0d2238" />
      <rect x="176" y="20" width="56" height="30" rx="6" fill="#0f2119" />
      <rect x="20" y="160" width="40" height="34" rx="6" fill="#0f2119" />
      {MINOR.map((d) => <path key={d} d={d} stroke="#16202f" strokeWidth="2" fill="none" />)}
      {ROADS.map((d) => <path key={d} d={d} stroke="#22314a" strokeWidth="5" fill="none" strokeLinecap="round" />)}
      {ROADS.map((d) => <path key={`${d}c`} d={d} stroke="#2c3e5c" strokeWidth="1" fill="none" />)}
      {destination && (
        <>
          <path d={route} stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={route} stroke="var(--accent)" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="route-line" />
          <g transform={`translate(${end[1]} ${end[2]})`}>
            <circle r="9" fill="var(--accent)" opacity="0.25" className="pulse" />
            <path d="M0 -14 C 7 -14, 9 -8, 9 -6 C 9 0, 0 6, 0 6 C 0 6, -9 0, -9 -6 C -9 -8, -7 -14, 0 -14 Z" fill="#fff" />
            <circle cy="-6" r="3.2" fill="var(--accent)" />
          </g>
        </>
      )}
      <g transform={`translate(${destination ? start[1] : 160} ${destination ? start[2] : 150})`}>
        <circle r="14" fill="var(--accent)" opacity="0.18" />
        <path d="M0 -8 L 6 7 L 0 3.5 L -6 7 Z" fill="#fff" stroke="var(--accent)" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
