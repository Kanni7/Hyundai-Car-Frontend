export type Lang = 'en' | 'hi';
export type Genre = 'lofi' | 'romantic' | 'party' | 'devotional' | 'retro';
export type AmbientColor =
  | 'blue' | 'red' | 'green' | 'purple' | 'pink' | 'orange' | 'white' | 'yellow' | 'cyan' | 'gold';
export type DriveMode = 'eco' | 'normal' | 'sport';
export type Page = 'home' | 'nav' | 'media' | 'climate' | 'phone' | 'vehicle';
export type Zone = 'driver' | 'passenger' | 'both';
export type Mood = 'party' | 'relax' | 'romantic' | 'focus';
export type WiperMode = 'off' | 'slow' | 'fast';
export type SceneId = 'live' | 'night' | 'day';
export type Gear = 'P' | 'R' | 'N' | 'D';
/** Push-button ignition: OFF, ACC (electronics on, engine off) and ON (engine running). */
export type Ignition = 'off' | 'acc' | 'on';
export type Indicator = 'off' | 'left' | 'right';

export type Intent =
  | { type: 'climate.setTemp'; value: number }
  | { type: 'climate.adjustTemp'; delta: number; feeling?: 'hot' | 'cold' }
  | { type: 'climate.power'; on: boolean }
  | { type: 'climate.fan'; value?: number; delta?: number }
  | { type: 'climate.auto' }
  | { type: 'climate.recirc'; on?: boolean }
  | { type: 'climate.defrost'; on?: boolean }
  | { type: 'media.play'; genre?: Genre; radio?: boolean; freq?: number }
  | { type: 'media.pause' }
  | { type: 'media.skip'; dir: 1 | -1 }
  | { type: 'media.volume'; value?: number; delta?: number; mute?: boolean }
  | { type: 'ambient.color'; color: AmbientColor }
  | { type: 'ambient.power'; on: boolean }
  | { type: 'ambient.brightness'; delta: number }
  | { type: 'mood'; mood: Mood }
  | { type: 'wipers'; mode: WiperMode; rain?: boolean }
  | { type: 'window'; target: Zone; open: number }
  | { type: 'sunroof'; open: boolean; fresh?: boolean }
  | { type: 'seat.vent'; target: Zone; level?: number; delta?: number }
  | { type: 'nav.start'; destination: string }
  | { type: 'nav.stop' }
  | { type: 'phone.call'; contact: string }
  | { type: 'phone.end' }
  | { type: 'drive.mode'; mode: DriveMode }
  | { type: 'lights.head'; on: boolean }
  | { type: 'lights.hazard'; on: boolean }
  | { type: 'scene'; scene: SceneId }
  | { type: 'ignition'; mode: Ignition }
  | { type: 'rev' }
  | { type: 'gear'; gear: Gear }
  | { type: 'indicator'; dir: Indicator }
  | { type: 'lights.cabin'; on: boolean }
  | { type: 'doors.lock'; locked: boolean }
  | { type: 'autohold'; on?: boolean }
  | { type: 'screen'; page: Page }
  | { type: 'query'; topic: 'temp' | 'fuel' | 'music' | 'time' }
  | { type: 'greet' }
  | { type: 'help' }
  | { type: 'thanks' };

export interface CarState {
  scene: SceneId;
  climate: { on: boolean; temp: number; fan: number; auto: boolean; recirc: boolean; defrost: boolean };
  media: { playing: boolean; radio: boolean; freq: number; genre: Genre; track: number; volume: number; muted: boolean };
  ambient: { on: boolean; color: AmbientColor; brightness: number; party: boolean };
  wipers: WiperMode;
  windows: { driver: number; passenger: number };
  sunroof: boolean;
  seats: { driver: number; passenger: number };
  nav: { destination: string; minutes: number; km: number; startedAt: number } | null;
  phone: { contact: string; startedAt: number } | null;
  driveMode: DriveMode;
  headlights: boolean;
  hazard: boolean;
  ignition: Ignition;
  gear: Gear;
  indicator: Indicator;
  cabinLight: boolean;
  locked: boolean;
  autoHold: boolean;
  screen: Page;
  fuel: number;
  range: number;
}

export interface Toast {
  id: number;
  icon: 'climate' | 'fan' | 'music' | 'volume' | 'light' | 'seat' | 'wiper' | 'window' | 'drive' | 'nav' | 'phone' | 'power' | 'lock';
  label: string;
  value: string;
}

export interface Reply {
  en: string;
  hi: string;
  toast?: Omit<Toast, 'id'>;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'car';
  text: string;
  intents?: Intent[];
  via?: 'voice' | 'text' | 'chip';
}
