import type { AmbientColor, CarState, Genre, Intent, Lang, Reply, Toast } from '../types';

export const TEMP_MIN = 16;
export const TEMP_MAX = 30;
export const FAN_MAX = 8;
export const VOLUME_MAX = 30;

export const TRACKS: Record<Genre, { title: string; artist: string }[]> = {
  lofi: [
    { title: 'Monsoon Window', artist: 'Verna Sessions' },
    { title: 'Late Night Chai', artist: 'Verna Sessions' },
    { title: 'Sea Link Drift', artist: 'Verna Sessions' },
  ],
  romantic: [
    { title: 'Baarish Mein Tum', artist: 'Sound Lab Hyderabad' },
    { title: 'Slow Lanes', artist: 'Sound Lab Hyderabad' },
    { title: 'Marine Drive Nights', artist: 'Sound Lab Hyderabad' },
  ],
  party: [
    { title: 'Highway Dhamaal', artist: 'Turbo GDi' },
    { title: 'Neon Bazaar', artist: 'Turbo GDi' },
    { title: 'Sport Mode Bhangra', artist: 'Turbo GDi' },
  ],
  devotional: [
    { title: 'Subah Ki Aarti', artist: 'Mandir Strings' },
    { title: 'Ganga Ghat Dawn', artist: 'Mandir Strings' },
  ],
  retro: [
    { title: 'Cassette Days', artist: 'Doordarshan Disco' },
    { title: 'Purani Yaadein', artist: 'Doordarshan Disco' },
  ],
};

export const GENRE_LABEL: Record<Genre, { en: string; hi: string }> = {
  lofi: { en: 'lo-fi chill', hi: 'chill lo-fi' },
  romantic: { en: 'romantic', hi: 'romantic' },
  party: { en: 'party', hi: 'party wale' },
  devotional: { en: 'devotional', hi: 'bhakti' },
  retro: { en: 'retro classics', hi: 'purane' },
};

export const COLOR_LABEL: Record<AmbientColor, { en: string; hi: string; css: string }> = {
  blue: { en: 'blue', hi: 'neeli', css: '#3d8bff' },
  red: { en: 'red', hi: 'laal', css: '#ff3b30' },
  green: { en: 'green', hi: 'hari', css: '#34e07a' },
  purple: { en: 'purple', hi: 'baingani', css: '#9d5cff' },
  pink: { en: 'pink', hi: 'gulabi', css: '#ff4fa8' },
  orange: { en: 'orange', hi: 'narangi', css: '#ff8a1f' },
  white: { en: 'white', hi: 'safed', css: '#eef3ff' },
  yellow: { en: 'yellow', hi: 'peeli', css: '#ffd83a' },
  cyan: { en: 'cyan', hi: 'aasmani', css: '#22e4ff' },
  gold: { en: 'gold', hi: 'sunehri', css: '#ffb84d' },
};

export const initialCar: CarState = {
  scene: 'night',
  climate: { on: true, temp: 22, fan: 3, auto: false },
  media: { playing: false, radio: false, freq: 93.5, genre: 'lofi', track: 0, volume: 12, muted: false },
  ambient: { on: true, color: 'blue', brightness: 1, party: false },
  wipers: 'off',
  windows: { driver: 0, passenger: 0 },
  sunroof: false,
  seats: { driver: 0, passenger: 0 },
  nav: null,
  phone: null,
  driveMode: 'normal',
  headlights: false,
  hazard: false,
  screen: 'home',
  fuel: 62,
  range: 478,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const fmt = (t: number) => `${t.toFixed(1).replace(/\.0$/, '')}°C`;

export function currentTrack(m: CarState['media']) {
  const list = TRACKS[m.genre];
  return list[((m.track % list.length) + list.length) % list.length];
}

function hash(s: string) {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const r = (en: string, hi: string, toast?: Reply['toast']): Reply => ({ en, hi, toast });

/** Applies one intent; returns the new state plus what the car says back. */
export function applyIntent(s: CarState, it: Intent): { state: CarState; reply: Reply } {
  const c = s.climate;
  switch (it.type) {
    case 'climate.setTemp': {
      const v = clamp(Math.round(it.value * 2) / 2, TEMP_MIN, TEMP_MAX);
      const note = v !== it.value ? (v === TEMP_MIN ? ' (that is the minimum)' : ' (that is the maximum)') : '';
      return {
        state: { ...s, climate: { ...c, on: true, auto: false, temp: v } },
        reply: r(`Setting the temperature to ${fmt(v)}.${note}`, `Theek hai, AC ${fmt(v)} pe set kar diya.`,
          { icon: 'climate', label: 'Temperature', value: fmt(v) }),
      };
    }
    case 'climate.adjustTemp': {
      const base = c.temp;
      const v = clamp(base + it.delta, TEMP_MIN, TEMP_MAX);
      const climate = { ...c, on: true, auto: false, temp: v };
      // Feeling hot with a weak blower: push more air too.
      if (it.feeling === 'hot' && climate.fan < 4) climate.fan = Math.min(FAN_MAX, climate.fan + 1);
      const state = { ...s, climate };
      const toast = { icon: 'climate' as const, label: 'Temperature', value: fmt(v) };
      if (v === base && c.on) {
        return { state, reply: r(
          `Already at the ${it.delta < 0 ? 'minimum' : 'maximum'}, ${fmt(v)}.`,
          `AC pehle se ${it.delta < 0 ? 'minimum' : 'maximum'} ${fmt(v)} pe hai.`, toast) };
      }
      if (it.feeling === 'hot') return { state, reply: r(`Cooling the cabin down to ${fmt(v)}.`, `Garmi kam karte hain. Temperature ${fmt(v)} kar diya.`, toast) };
      if (it.feeling === 'cold') return { state, reply: r(`Warming the cabin up to ${fmt(v)}.`, `Thoda garam kar raha hoon. Ab ${fmt(v)}.`, toast) };
      return { state, reply: r(`Temperature ${it.delta < 0 ? 'lowered' : 'raised'} to ${fmt(v)}.`, `Temperature ${fmt(v)} kar diya.`, toast) };
    }
    case 'climate.power': {
      const state = { ...s, climate: { ...c, on: it.on, fan: it.on && c.fan === 0 ? 3 : c.fan } };
      if (it.on === c.on) return { state, reply: r(`The AC is already ${it.on ? 'on' : 'off'}.`, `AC pehle se ${it.on ? 'chalu' : 'band'} hai.`) };
      return { state, reply: it.on
        ? r('AC is on.', 'AC chalu kar diya.', { icon: 'climate', label: 'AC', value: 'On' })
        : r('AC turned off.', 'AC band kar diya.', { icon: 'climate', label: 'AC', value: 'Off' }) };
    }
    case 'climate.fan': {
      const v = clamp(it.value ?? c.fan + (it.delta ?? 0), 0, FAN_MAX);
      if (v === 0) return applyIntent(s, { type: 'climate.power', on: false });
      return {
        state: { ...s, climate: { ...c, on: true, auto: false, fan: v } },
        reply: r(`Fan speed ${v}.`, `Fan speed ${v} kar di.`, { icon: 'fan', label: 'Fan speed', value: `${v} / ${FAN_MAX}` }),
      };
    }
    case 'climate.auto':
      return {
        state: { ...s, climate: { ...c, on: true, auto: true, fan: 4 } },
        reply: r('Climate set to Auto.', 'AC auto mode pe kar diya.', { icon: 'climate', label: 'Climate', value: 'AUTO' }),
      };

    case 'media.play': {
      const genre = it.genre ?? s.media.genre;
      const changed = genre !== s.media.genre;
      const media = { ...s.media, playing: true, muted: false, radio: !!it.radio,
        freq: it.freq ?? s.media.freq, genre, track: changed ? 0 : s.media.track };
      const state = { ...s, media, screen: 'media' as const };
      if (media.radio) {
        return { state, reply: r(`Tuning to FM ${media.freq.toFixed(1)}.`, `FM ${media.freq.toFixed(1)} laga diya.`) };
      }
      const t = currentTrack(media);
      const g = GENRE_LABEL[genre];
      return { state, reply: it.genre
        ? r(`Playing ${g.en} music: ${t.title}.`, `${g.hi} gaane chala raha hoon: ${t.title}.`)
        : r(`Playing ${t.title}.`, `Gaana chalu: ${t.title}.`) };
    }
    case 'media.pause':
      return {
        state: { ...s, media: { ...s.media, playing: false } },
        reply: s.media.playing ? r('Music paused.', 'Music band kar diya.') : r('Nothing is playing right now.', 'Abhi koi gaana nahi chal raha.'),
      };
    case 'media.skip': {
      const media = { ...s.media, playing: true, radio: false, track: s.media.track + it.dir };
      const t = currentTrack(media);
      return {
        state: { ...s, media, screen: 'media' },
        reply: it.dir > 0 ? r(`Next track: ${t.title}.`, `Agla gaana: ${t.title}.`) : r(`Previous track: ${t.title}.`, `Pichla gaana: ${t.title}.`),
      };
    }
    case 'media.volume': {
      if (it.mute !== undefined) {
        return {
          state: { ...s, media: { ...s.media, muted: it.mute } },
          reply: it.mute
            ? r('Muted.', 'Awaaz mute kar di.', { icon: 'volume', label: 'Volume', value: 'Muted' })
            : r(`Unmuted. Volume ${s.media.volume}.`, `Awaaz wapas chalu. Volume ${s.media.volume}.`, { icon: 'volume', label: 'Volume', value: `${s.media.volume}` }),
        };
      }
      const v = clamp(it.value ?? s.media.volume + (it.delta ?? 0), 0, VOLUME_MAX);
      return {
        state: { ...s, media: { ...s.media, volume: v, muted: false } },
        reply: r(`Volume ${v}.`, `Volume ${v} kar diya.`, { icon: 'volume', label: 'Volume', value: `${v}` }),
      };
    }

    case 'ambient.color': {
      const l = COLOR_LABEL[it.color];
      return {
        state: { ...s, ambient: { ...s.ambient, on: true, color: it.color, party: false } },
        reply: r(`Ambient lighting set to ${l.en}.`, `Ambient light ${l.hi} kar di.`, { icon: 'light', label: 'Ambient light', value: l.en }),
      };
    }
    case 'ambient.power':
      return {
        state: { ...s, ambient: { ...s.ambient, on: it.on, party: false } },
        reply: it.on
          ? r('Ambient lighting on.', 'Ambient light chalu kar di.', { icon: 'light', label: 'Ambient light', value: 'On' })
          : r('Ambient lighting off.', 'Ambient light band kar di.', { icon: 'light', label: 'Ambient light', value: 'Off' }),
      };
    case 'ambient.brightness': {
      const b = clamp(Math.round((s.ambient.brightness + it.delta) * 10) / 10, 0.3, 1.5);
      return {
        state: { ...s, ambient: { ...s.ambient, on: true, brightness: b } },
        reply: r(`Ambient brightness ${Math.round(b * 100 / 1.5)}%.`, `Roshni ${it.delta > 0 ? 'badha' : 'kam kar'} di.`, { icon: 'light', label: 'Brightness', value: `${Math.round(b * 100 / 1.5)}%` }),
      };
    }

    case 'mood': {
      if (it.mood === 'party') {
        return {
          state: { ...s, ambient: { ...s.ambient, on: true, party: true, brightness: 1.3 },
            media: { ...s.media, playing: true, radio: false, muted: false, genre: 'party', track: 0, volume: Math.max(s.media.volume, 18) },
            screen: 'media' },
          reply: r('Party mode! Lights cycling and the music is up.', 'Party mode on! Lights aur music dono set.'),
        };
      }
      if (it.mood === 'relax') {
        return {
          state: { ...s, ambient: { on: true, color: 'blue', brightness: 0.6, party: false },
            media: { ...s.media, playing: true, radio: false, muted: false, genre: 'lofi', track: 0, volume: Math.min(s.media.volume, 10) },
            climate: { ...c, on: true, temp: 23, fan: 2, auto: false },
            seats: { driver: Math.max(1, s.seats.driver), passenger: s.seats.passenger } },
          reply: r('Relax mode: soft blue light, calm music, 23°C and a cool seat.', 'Aaram se. Halki neeli roshni, shaant music, 23°C aur seat thandi.'),
        };
      }
      if (it.mood === 'romantic') {
        return {
          state: { ...s, ambient: { on: true, color: 'pink', brightness: 0.8, party: false },
            media: { ...s.media, playing: true, radio: false, muted: false, genre: 'romantic', track: 0 } },
          reply: r('Romantic mode: a warm pink glow and soft songs.', 'Romantic mood set: gulabi roshni aur romantic gaane.'),
        };
      }
      return {
        state: { ...s, ambient: { on: true, color: 'white', brightness: 0.7, party: false },
          media: { ...s.media, playing: false }, climate: { ...c, on: true, temp: 22 } },
        reply: r('Focus mode: music off, clean white light, 22°C.', 'Focus mode: music band, safed roshni, 22°C.'),
      };
    }

    case 'wipers': {
      const state = { ...s, wipers: it.mode };
      if (it.mode === 'off') return { state, reply: r('Wipers off.', 'Wiper band kar diye.', { icon: 'wiper', label: 'Wipers', value: 'Off' }) };
      if (it.rain) return { state, reply: r('Looks like rain. Wipers on.', 'Baarish hai, toh wiper chalu kar diye.', { icon: 'wiper', label: 'Wipers', value: it.mode === 'fast' ? 'High' : 'Low' }) };
      return { state, reply: it.mode === 'fast'
        ? r('Wipers on high.', 'Wiper tez kar diye.', { icon: 'wiper', label: 'Wipers', value: 'High' })
        : r('Wipers on.', 'Wiper chalu kar diye.', { icon: 'wiper', label: 'Wipers', value: 'Low' }) };
    }
    case 'window': {
      const windows = {
        driver: it.target === 'passenger' ? s.windows.driver : it.open,
        passenger: it.target === 'driver' ? s.windows.passenger : it.open,
      };
      const who = it.target === 'both' ? 'all windows' : `the ${it.target} window`;
      const whoHi = it.target === 'both' ? 'saari windows' : `${it.target} window`;
      const verb = it.open === 0 ? ['Closing', 'band kar di'] : it.open < 100 ? ['Opening a little:', 'thodi khol di'] : ['Opening', 'khol di'];
      return {
        state: { ...s, windows },
        reply: r(`${verb[0]} ${who}.`, `${whoHi[0].toUpperCase()}${whoHi.slice(1)} ${verb[1]}.`,
          { icon: 'window', label: it.target === 'both' ? 'Windows' : `${it.target[0].toUpperCase()}${it.target.slice(1)} window`, value: it.open === 0 ? 'Closed' : `${it.open}% open` }),
      };
    }
    case 'sunroof':
      return {
        state: { ...s, sunroof: it.open },
        reply: it.open
          ? it.fresh
            ? r('Letting in some fresh air. Sunroof open.', 'Taazi hawa ke liye sunroof khol diya.', { icon: 'window', label: 'Sunroof', value: 'Open' })
            : r('Opening the sunroof.', 'Sunroof khol diya.', { icon: 'window', label: 'Sunroof', value: 'Open' })
          : r('Closing the sunroof.', 'Sunroof band kar diya.', { icon: 'window', label: 'Sunroof', value: 'Closed' }),
      };
    case 'seat.vent': {
      const set = (cur: number) => clamp(it.level ?? cur + (it.delta ?? 0), 0, 3);
      const seats = {
        driver: it.target === 'passenger' ? s.seats.driver : set(s.seats.driver),
        passenger: it.target === 'driver' ? s.seats.passenger : set(s.seats.passenger),
      };
      const lvl = it.target === 'passenger' ? seats.passenger : seats.driver;
      const who = it.target === 'both' ? 'Front seat' : it.target === 'driver' ? 'Driver seat' : 'Passenger seat';
      return {
        state: { ...s, seats },
        reply: lvl === 0
          ? r(`${who} ventilation off.`, `${who} ki ventilation band.`, { icon: 'seat', label: who, value: 'Off' })
          : r(`${who} ventilation at level ${lvl}.`, `${who} ki ventilation level ${lvl} pe.`, { icon: 'seat', label: `${who} cooling`, value: `Level ${lvl}` }),
      };
    }

    case 'nav.start': {
      const h = hash(it.destination);
      const known: Record<string, [number, number]> = { Home: [24, 11.2], Office: [32, 15.8], Airport: [46, 27.4] };
      const [minutes, km] = known[it.destination] ?? [8 + (h % 40), Math.round((3 + (h % 250) / 10) * 10) / 10];
      return {
        state: { ...s, nav: { destination: it.destination, minutes, km, startedAt: Date.now() }, screen: 'nav' },
        reply: r(`Starting navigation to ${it.destination}. About ${minutes} minutes.`, `${it.destination} ke liye navigation shuru. Lagbhag ${minutes} minute lagenge.`),
      };
    }
    case 'nav.stop':
      return {
        state: { ...s, nav: null, screen: s.screen === 'nav' ? 'home' : s.screen },
        reply: r('Navigation ended.', 'Navigation band kar diya.'),
      };
    case 'phone.call':
      return {
        state: { ...s, phone: { contact: it.contact, startedAt: Date.now() }, screen: 'phone' },
        reply: r(`Calling ${it.contact}.`, `${it.contact} ko call kar raha hoon.`),
      };
    case 'phone.end':
      return {
        state: { ...s, phone: null, screen: s.screen === 'phone' ? 'home' : s.screen },
        reply: s.phone ? r('Call ended.', 'Call kaat diya.') : r('There is no active call.', 'Abhi koi call nahi chal rahi.'),
      };

    case 'drive.mode': {
      const label = { eco: ['Eco', 'Eco mode on. Petrol bachega.', 'Eco mode on. Saving fuel.'], normal: ['Normal', 'Normal mode on.', 'Normal mode on.'], sport: ['Sport', 'Sport mode on. Enjoy the drive!', 'Sport mode on. Enjoy the drive!'] }[it.mode];
      return {
        state: { ...s, driveMode: it.mode },
        reply: r(label[2], label[1], { icon: 'drive', label: 'Drive mode', value: label[0] }),
      };
    }
    case 'lights.head':
      return {
        state: { ...s, headlights: it.on },
        reply: it.on ? r('Headlights on.', 'Headlights jala di.') : r('Headlights off.', 'Headlights band kar di.'),
      };
    case 'lights.hazard':
      return {
        state: { ...s, hazard: it.on },
        reply: it.on ? r('Hazard lights on.', 'Hazard lights chalu.') : r('Hazard lights off.', 'Hazard lights band.'),
      };
    case 'scene':
      return {
        state: { ...s, scene: it.scene },
        reply: it.scene === 'night' ? r('Switching to the night view.', 'Night view on.') : r('Switching to the day view.', 'Day view on.'),
      };
    case 'screen': {
      const name = { home: 'Home', nav: 'Navigation', media: 'Media', climate: 'Climate', phone: 'Phone', vehicle: 'Vehicle' }[it.page];
      return { state: { ...s, screen: it.page }, reply: r(`Opening ${name}.`, `${name} screen khol di.`) };
    }

    case 'query': {
      if (it.topic === 'temp') {
        return { state: s, reply: c.on
          ? r(`The cabin is set to ${fmt(c.temp)}, fan speed ${c.fan}.`, `AC abhi ${fmt(c.temp)} pe hai, fan speed ${c.fan}.`)
          : r('The AC is off right now.', 'AC abhi band hai.') };
      }
      if (it.topic === 'fuel') {
        return { state: s, reply: r(`Fuel is at ${s.fuel}%, about ${s.range} km of range.`, `Petrol ${s.fuel}% hai, lagbhag ${s.range} km chal jayegi.`) };
      }
      if (it.topic === 'music') {
        const t = currentTrack(s.media);
        return { state: s, reply: s.media.playing
          ? r(`Now playing ${t.title} by ${t.artist}.`, `Abhi ${t.title} chal raha hai.`)
          : r('Nothing is playing right now.', 'Abhi koi gaana nahi chal raha.') };
      }
      const time = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
      return { state: s, reply: r(`It's ${time}.`, `Abhi ${time} ho rahe hain.`) };
    }
    case 'greet':
      return { state: s, reply: r('Hello! Ask me for the AC, music, lights, navigation or calls.', 'Namaste! Boliye, kya karun? AC, music, lights, navigation, sab kuch.') };
    case 'help':
      return { state: s, reply: r(
        'Try: "set AC to 22", "I\'m feeling hot", "play romantic songs", "ambient light red", "take me home" or "open the sunroof".',
        'Boliye: "AC 22 pe karo", "garmi lag rahi hai", "romantic gaane chalao", "light laal kar do", "ghar le chalo" ya "sunroof kholo".') };
    case 'thanks':
      return { state: s, reply: r('Anytime!', 'Koi baat nahi!') };
  }
}

export function runIntents(state: CarState, intents: Intent[], lang: Lang) {
  let s = state;
  const replies: Reply[] = [];
  for (const it of intents) {
    const out = applyIntent(s, it);
    s = out.state;
    replies.push(out.reply);
  }
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const text = replies.length
    ? replies.map((rep) => cap(rep[lang])).join(' ')
    : lang === 'hi'
      ? 'Maaf kijiye, samajh nahi aaya. Boliye "AC 22 pe karo" ya "gaana chalao".'
      : 'Sorry, I didn\'t catch that. Try "set AC to 22" or "play some music".';
  const toast = [...replies].reverse().find((rep) => rep.toast)?.toast;
  return { state: s, text, toast: toast as Omit<Toast, 'id'> | undefined, understood: replies.length > 0 };
}
