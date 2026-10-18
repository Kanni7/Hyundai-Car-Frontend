import type { Intent } from '../types';

export const SUGGESTIONS = [
  'AC 20 pe kar do',
  'Garmi lag rahi hai',
  'Romantic gaane chalao',
  'Music band kar do',
  'Light gulabi kar do',
  'Baarish ho rahi hai',
  'Ghar le chalo',
  'Sunroof kholo',
  'Sport mode on karo',
  'Seat thandi karo',
  'Mummy ko call karo',
  'Party mode on',
  'Thak gaya hoon',
  'एसी बाईस पर कर दो',
  'Set temperature to 24',
  'Night mode / day mode',
];

export function describeIntent(i: Intent): string {
  const { type, ...rest } = i;
  const args = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? k : `${k}: ${v}`))
    .join(', ');
  return args ? `${type}(${args})` : type;
}
