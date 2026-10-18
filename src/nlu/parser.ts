// Rule-based understanding for English, Hindi (Devanagari) and romanised Hinglish.
// Runs fully offline. Swap `parseCommand` for an LLM call later; the Intent
// contract in types.ts stays the same.

import type { AmbientColor, Genre, Intent, Lang, Mood, Page, Zone } from '../types';

type Domain = 'climate' | 'fan' | 'volume' | 'media' | 'ambient' | 'seat';

export interface NluContext {
  domain?: Domain;
  lastAdjust?: Intent;
}

export interface ParseResult {
  intents: Intent[];
  lang: Lang;
  context: NluContext;
}

// ---------------------------------------------------------------- vocab
// Entries containing a space match as phrases; entries ending in '*' match as prefixes.

const W = {
  climate: ['ac', 'aircon', 'air conditioner', 'air conditioning', 'climate', 'temperature', 'temp', 'temprature', 'tapman', 'cooling', 'heater', 'heating', 'degree', 'degrees', 'एसी', 'तापमान', 'टेम्परेचर', 'क्लाइमेट', 'कूलिंग', 'डिग्री'],
  tempWord: ['temperature', 'temp', 'temprature', 'tapman', 'degree', 'degrees', 'तापमान', 'टेम्परेचर', 'डिग्री'],
  fan: ['fan', 'blower', 'pankha', 'pankhe', 'hawa', 'airflow', 'air flow', 'फैन', 'पंखा', 'हवा', 'ब्लोअर'],
  feelHot: ['garmi', 'garmee', 'sweating', 'pasina', 'paseena', 'ubal', 'गर्मी', 'गरमी', 'पसीना', 'उबल'],
  feelCold: ['thand', 'thandi lag', 'sardi', 'freezing', 'chilly', 'kaanp', 'ठंड', 'ठण्ड', 'सर्दी', 'ठंडी लग'],
  makeCool: ['thanda', 'thandaa', 'cool', 'cooler', 'colder', 'chill', 'ठंडा', 'ठंडक', 'thandak'],
  makeWarm: ['garam', 'garm', 'warmer', 'warm', 'heat', 'गरम', 'गर्म'],
  cold: ['cold'],
  causative: ['make', 'set', 'karo', 'kar', 'kardo', 'kar do', 'kijiye', 'karna', 'want', 'chahiye', 'करो', 'कर', 'कीजिए', 'blow', 'air'],
  feeling: ['lag', 'lagi', 'laga', 'lagra', 'lagraha', 'lagrahi', 'feel', 'feeling', 'its', 'im', 'i am', 'is', 'too', 'very', 'bahut', 'hai', 'लग', 'है'],
  on: ['on', 'start', 'chalu', 'chaalu', 'chalao', 'chala', 'chalaao', 'chalado', 'laga', 'lagao', 'jalao', 'jala', 'shuru', 'enable', 'activate', 'turn on', 'switch on', 'play', 'bajao', 'baja', 'चालू', 'चलाओ', 'चला', 'शुरू', 'लगाओ', 'जलाओ', 'बजाओ', 'ऑन', 'resume'],
  off: ['off', 'band', 'bandh', 'bnd', 'stop', 'roko', 'rok', 'ruko', 'bujhao', 'bujha', 'disable', 'deactivate', 'turn off', 'switch off', 'hatao', 'hata', 'बंद', 'रोको', 'बुझाओ', 'ऑफ', 'हटाओ', 'pause'],
  up: ['increase', 'up', 'raise', 'badh*', 'zyada', 'jyada', 'zada', 'tez', 'tej', 'louder', 'more', 'high', 'higher', 'upar', 'max', 'maximum', 'full', 'बढ़*', 'बढ*', 'ज़्यादा', 'ज्यादा', 'तेज़', 'तेज', 'ऊपर', 'brighter'],
  down: ['decrease', 'down', 'lower', 'reduce', 'kam', 'kum', 'ghata*', 'less', 'low', 'dheere', 'dheema', 'dheemi', 'slow', 'slower', 'quieter', 'soft', 'neeche', 'min', 'minimum', 'dim', 'कम', 'घटा*', 'धीमा', 'धीमी', 'धीरे', 'नीचे'],
  open: ['open', 'khol*', 'खोल*'],
  close: ['close', 'shut', 'band', 'bandh', 'बंद', 'chadha*'],
  small: ['thoda', 'thodi', 'thora', 'little', 'bit', 'slightly', 'zara', 'jara', 'थोड़ा', 'थोड़ी', 'थोडा', 'ज़रा'],
  big: ['bahut', 'bohot', 'bahot', 'very', 'much', 'kaafi', 'lot', 'बहुत', 'काफी', 'extremely'],
  media: ['music', 'song', 'songs', 'gaana', 'gana', 'gaane', 'gane', 'geet', 'sangeet', 'track', 'playlist', 'radio', 'fm', 'media', 'audio', 'गाना', 'गाने', 'संगीत', 'म्यूज़िक', 'म्यूजिक', 'रेडियो', 'गीत'],
  radio: ['radio', 'fm', 'रेडियो'],
  volume: ['volume', 'awaaz', 'awaz', 'aawaz', 'aawaaz', 'sound', 'आवाज़', 'आवाज', 'वॉल्यूम'],
  mute: ['mute', 'chup', 'silent', 'silence', 'म्यूट', 'चुप'],
  unmute: ['unmute', 'अनम्यूट'],
  next: ['next', 'agla', 'agle', 'skip', 'change', 'badlo', 'badal', 'doosra', 'dusra', 'अगला', 'बदलो', 'दूसरा'],
  prev: ['previous', 'prev', 'pichla', 'pichhla', 'pichle', 'last song', 'पिछला'],
  ambient: ['ambient', 'ambience', 'mood light', 'mood lighting', 'light', 'lights', 'lighting', 'roshni', 'raushni', 'led', 'leds', 'रोशनी', 'लाइट', 'लाइटें', 'एंबिएंट'],
  wiper: ['wiper', 'wipers', 'वाइपर'],
  rain: ['baarish', 'barish', 'rain', 'raining', 'बारिश', 'paani gir'],
  heavy: ['tez', 'tej', 'fast', 'heavy', 'zor', 'zyada', 'high', 'तेज़', 'तेज'],
  window: ['window', 'windows', 'khidki', 'khidkiyan', 'sheesha', 'sheese', 'sheeshe', 'glass', 'खिड़की', 'खिडकी', 'शीशा', 'शीशे', 'विंडो'],
  sunroof: ['sunroof', 'sun roof', 'moonroof', 'roof', 'सनरूफ'],
  freshAir: ['fresh air', 'taazi hawa', 'tazi hawa', 'taaza hawa', 'taza hawa', 'ताज़ी हवा', 'ताजी हवा'],
  seat: ['seat', 'seats', 'सीट', 'ventilation', 'ventilated'],
  navTrigger: ['navigate', 'navigation', 'take me', 'le chalo', 'le chal', 'chalo', 'jaana hai', 'jana hai', 'route', 'rasta', 'raasta', 'directions', 'drive to', 'go to', 'how to reach', 'ले चलो', 'चलो', 'जाना है', 'रास्ता', 'नेविगेट', 'nearest', 'paas'],
  callTrigger: ['call', 'phone', 'dial', 'ring', 'फोन', 'कॉल', 'baat karao'],
  hangup: ['kaat*', 'kato', 'cut', 'end', 'hang', 'rakh', 'disconnect', 'काट*', 'रख'],
  drive: ['sport', 'sports', 'eco', 'normal', 'comfort', 'स्पोर्ट', 'इको', 'नॉर्मल', 'drive mode', 'driving mode'],
  saveFuel: ['mileage', 'fuel bachao', 'petrol bachao', 'save fuel', 'economy'],
  race: ['race', 'racing', 'speed chahiye', 'tez chalana'],
  head: ['headlight', 'headlights', 'head light', 'head lights', 'हेडलाइट', 'high beam', 'dipper'],
  dark: ['andhera', 'andhere', 'अंधेरा'],
  hazard: ['hazard', 'hazards', 'emergency light', 'emergency lights', 'parking light', 'parking lights', 'blinker', 'blinkers', 'हैज़र्ड', 'हैजर्ड'],
  night: ['night', 'raat', 'रात'],
  day: ['day', 'din', 'daylight', 'दिन'],
  viewWord: ['mode', 'view', 'scene', 'karo', 'kar', 'theme', 'मोड'],
  show: ['dikhao', 'dikha', 'show', 'screen', 'display', 'दिखाओ', 'दिखा'],
  question: ['kitna', 'kitne', 'kitni', 'what', 'whats', 'how much', 'kya hai', 'batao', 'tell me', 'konsa', 'kaunsa', 'kaun sa', 'which', 'कितना', 'कितने', 'कितनी', 'क्या है', 'बताओ', 'कौन सा'],
  fuel: ['fuel', 'petrol', 'diesel', 'tank', 'range', 'टंकी', 'पेट्रोल'],
  time: ['time', 'samay', 'baje', 'टाइम', 'समय', 'बजे'],
  greet: ['hello', 'hi', 'hey', 'hii', 'namaste', 'namaskar', 'नमस्ते', 'नमस्कार', 'good morning', 'good evening', 'good afternoon'],
  help: ['help', 'kya kar sakte', 'what can you do', 'madad', 'मदद', 'commands'],
  thanks: ['thanks', 'thank you', 'thank', 'shukriya', 'dhanyavaad', 'dhanyawad', 'धन्यवाद', 'शुक्रिया'],
  repeat: ['aur', 'more', 'again', 'phir se', 'fir se', 'ek baar aur', 'once more', 'और'],
  driver: ['driver', 'meri side', 'my side', 'mera', 'meri', 'my', 'ड्राइवर'],
  passenger: ['passenger', 'co-driver', 'codriver', 'saath wal*', 'bagal', 'left side', 'पैसेंजर'],
  both: ['dono', 'both', 'sab', 'saari', 'saare', 'sabhi', 'all', 'दोनों', 'सब', 'सारी'],
  auto: ['auto', 'automatic', 'ऑटो'],
  modeWord: ['mode', 'mood', 'vibe', 'maahol', 'mahaul', 'माहौल', 'मोड'],
} satisfies Record<string, string[]>;

const COLORS: Record<AmbientColor, string[]> = {
  red: ['red', 'laal', 'lal', 'लाल'],
  blue: ['blue', 'neela', 'neeli', 'nila', 'नीला', 'नीली'],
  green: ['green', 'hara', 'हरा', 'हरी'],
  purple: ['purple', 'violet', 'baingani', 'jamuni', 'बैंगनी', 'जामुनी'],
  pink: ['pink', 'gulabi', 'गुलाबी'],
  orange: ['orange', 'narangi', 'kesari', 'kesariya', 'saffron', 'नारंगी', 'केसरिया'],
  white: ['white', 'safed', 'safaid', 'सफ़ेद', 'सफेद'],
  yellow: ['yellow', 'peela', 'peeli', 'पीला', 'पीली'],
  cyan: ['cyan', 'teal', 'aqua', 'aasmani', 'आसमानी'],
  gold: ['gold', 'golden', 'sunehra', 'sunehri', 'सुनहरा'],
};

const GENRES: Record<Genre, string[]> = {
  romantic: ['romantic', 'romance', 'love', 'pyaar', 'pyar', 'ishq', 'arijit', 'रोमांटिक', 'प्यार'],
  party: ['party', 'dance', 'upbeat', 'dhamaka', 'energetic', 'punjabi', 'bhangra', 'badshah', 'diljit', 'पार्टी', 'डांस'],
  lofi: ['lofi', 'lo-fi', 'chill', 'relaxing', 'calm', 'sukoon', 'sukun', 'shaant', 'शांत', 'सुकून'],
  devotional: ['bhajan', 'devotional', 'bhakti', 'aarti', 'mantra', 'भजन', 'भक्ति', 'आरती'],
  retro: ['retro', 'old', 'purane', 'purana', 'classic', 'kishore', 'rafi', 'lata', 'पुराने', 'पुराना'],
};

const MOODS: Record<Mood, string[]> = {
  party: ['party', 'पार्टी'],
  relax: ['relax', 'relaxing', 'aaram', 'araam', 'calm', 'chill', 'आराम'],
  romantic: ['romantic', 'date', 'रोमांटिक'],
  focus: ['focus', 'concentrate', 'study', 'work', 'फोकस'],
};
const TIRED = ['thak', 'thaka', 'thaki', 'tired', 'stress', 'stressed', 'थक', 'थका', 'थकी'];

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  ek: 1, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, satra: 17,
  atharah: 18, athara: 18, unnis: 19, unees: 19, bees: 20, bis: 20, ikkis: 21, ikkees: 21,
  bais: 22, baais: 22, baees: 22, teis: 23, teyis: 23, tees: 30, chaubis: 24, chaubees: 24,
  pachis: 25, pachees: 25, chhabbis: 26, chhabbees: 26, sattais: 27, sattaees: 27,
  atthais: 28, attaees: 28, untis: 29, unatees: 29,
  'एक': 1, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20, 'इक्कीस': 21, 'बाईस': 22, 'तेईस': 23,
  'चौबीस': 24, 'पच्चीस': 25, 'छब्बीस': 26, 'सत्ताईस': 27, 'अट्ठाईस': 28, 'उनतीस': 29, 'तीस': 30,
};

const HINDI_MARKERS = new Set([
  'karo', 'kar', 'kardo', 'hai', 'hain', 'ho', 'rahi', 'raha', 'lag', 'chalao', 'chala', 'bajao', 'band',
  'kam', 'badhao', 'zyada', 'jyada', 'thoda', 'thodi', 'aur', 'mujhe', 'mera', 'meri', 'ko', 'pe', 'par',
  'ke', 'ki', 'ka', 'se', 'chalo', 'garmi', 'thand', 'thanda', 'gaana', 'gaane', 'awaaz', 'bahut', 'yaar',
  'bhai', 'kya', 'kitna', 'kitne', 'nahi', 'mat', 'dena', 'dijiye', 'kijiye', 'karna', 'chahiye', 'lagao',
  'kholo', 'khol', 'roko', 'hatao', 'agla', 'pichla', 'laal', 'neela', 'ghar', 'daftar', 'jaana', 'dikhao',
  'wala', 'wali', 'abhi', 'zara', 'namaste', 'baarish', 'chalu', 'jalao', 'sardi', 'tez', 'dheere',
]);

const PLACES: [string[], string][] = [
  [['ghar', 'home', 'घर'], 'Home'],
  [['office', 'daftar', 'dafter', 'ऑफिस', 'दफ्तर'], 'Office'],
  [['airport', 'एयरपोर्ट'], 'Airport'],
  [['petrol', 'fuel station', 'petrol pump', 'पेट्रोल'], 'Nearest petrol pump'],
  [['hospital', 'अस्पताल'], 'Nearest hospital'],
  [['ev charger', 'charging', 'charger'], 'Nearest EV charger'],
];

const CONTACTS: [string[], string][] = [
  [['mummy', 'mumma', 'mom', 'mother', 'maa', 'मम्मी', 'माँ', 'मां'], 'Mummy'],
  [['papa', 'dad', 'daddy', 'father', 'पापा'], 'Papa'],
  [['bhaiya', 'bhai', 'brother', 'भैया'], 'Bhaiya'],
  [['didi', 'sister', 'दीदी'], 'Didi'],
];

const FILLER = new Set([
  'mujhe', 'muje', 'me', 'mein', 'please', 'plz', 'pls', 'to', 'the', 'ke', 'ka', 'ki', 'ko', 'par', 'pe',
  'tak', 'liye', 'for', 'a', 'an', 'towards', 'taraf', 'my', 'jaldi', 'abhi', 'zara', 'yaar', 'bhai',
  'karo', 'kar', 'kardo', 'do', 'de', 'dena', 'dijiye', 'kijiye', 'hai', 'hain', 'can', 'you', 'i', 'want',
  'need', 'lagao', 'milao', 'laga', 'now', 'जल्दी', 'मुझे', 'को', 'पर', 'के', 'की', 'का', 'करो', 'कर', 'दो',
  'है', 'से', 'se', 'wahan', 'jana', 'jaana', 'chalna',
]);

// ---------------------------------------------------------------- helpers

// Strip the nukta so "बढ़ाओ" and "बढाओ" (and their many Unicode spellings) compare equal.
const fold = (s: string) => s.normalize('NFD').replace(/\u093C/g, '').normalize('NFC');

function normalize(raw: string): string {
  return fold(raw)
    .toLowerCase()
    .replace(/^\s*(hey|hi|hello|ok|okay)\s+(hyundai|verna)\b[\s,]*/, '')
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)))
    .replace(/a\s*[./]\s*c\b\.?/g, 'ac')
    .replace(/[’'`"]/g, '')
    .replace(/(\d)\s*°\s*c?/g, '$1 degree ')
    .replace(/(\d+(?:\.\d+)?)(?=[a-zऀ-ॿ])/g, '$1 ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/[?!।;:]+/g, ' ')
    .replace(/\s*,\s*/g, ' , ')
    .replace(/\s+/g, ' ')
    .trim();
}

class Clause {
  readonly text: string;
  readonly tokens: string[];
  constructor(text: string) {
    this.text = ` ${text.trim()} `;
    this.tokens = text.trim().split(' ').filter(Boolean);
  }
  has(list: readonly string[]): boolean {
    return list.some((w) => this.match(w));
  }
  match(raw: string): boolean {
    const w = fold(raw);
    if (w.endsWith('*')) {
      const stem = w.slice(0, -1);
      return this.tokens.some((t) => t.startsWith(stem));
    }
    return w.includes(' ') ? this.text.includes(` ${w} `) : this.tokens.includes(w);
  }
  find<K extends string>(map: Record<K, string[]>): K | undefined {
    return (Object.keys(map) as K[]).find((k) => this.has(map[k]));
  }
  number(min = 0, max = 200): number | undefined {
    const digits = this.text.match(/\d+(?:\.\d+)?/g);
    if (digits) {
      const n = digits.map(Number).find((v) => v >= min && v <= max);
      if (n !== undefined) return n;
    }
    for (let i = 0; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      let v = NUM_WORDS[t];
      if (v === undefined) continue;
      // "twenty two" / "twenty-two"
      if (v === 20 && NUM_WORDS[this.tokens[i + 1]] < 10) v += NUM_WORDS[this.tokens[i + 1]];
      if (v >= min && v <= max) return v;
    }
    const hyphen = this.text.match(/twenty-(one|two|three|four|five|six|seven|eight|nine)/);
    if (hyphen) return 20 + NUM_WORDS[hyphen[1]];
    return undefined;
  }
  magnitude(): 'small' | 'big' | 'normal' {
    if (this.has(W.small)) return 'small';
    if (this.has(W.big)) return 'big';
    return 'normal';
  }
  zone(fallback: Zone = 'both'): Zone {
    if (this.has(W.passenger)) return 'passenger';
    if (this.has(W.both)) return 'both';
    if (this.has(W.driver)) return 'driver';
    return fallback;
  }
}

const step = (c: Clause, small: number, normal: number, big: number) =>
  ({ small, normal, big })[c.magnitude()];

function titleCase(s: string) {
  return s.replace(/\b\p{L}/gu, (m) => m.toUpperCase());
}

function extractDestination(c: Clause): string | undefined {
  for (const [keys, label] of PLACES) if (c.has(keys)) return label;
  const trigger = new Set(W.navTrigger.flatMap((w) => w.split(' ')));
  const show = new Set(W.show);
  const words = c.tokens.filter((t) => !trigger.has(t) && !FILLER.has(t) && !show.has(t) && t !== ',');
  return words.length ? titleCase(words.join(' ')) : undefined;
}

function extractContact(c: Clause): string | undefined {
  for (const [keys, label] of CONTACTS) if (c.has(keys)) return label;
  const trigger = new Set([...W.callTrigger, 'karo', 'kar', 'lagao', 'milao', 'to', 'please', 'give', 'a']);
  const koAt = c.tokens.findIndex((t) => t === 'ko' || t === 'को');
  const pool = koAt > 0 ? c.tokens.slice(0, koAt) : c.tokens.slice(c.tokens.findIndex((t) => W.callTrigger.includes(t)) + 1);
  const words = pool.filter((t) => !trigger.has(t) && !FILLER.has(t));
  return words.length ? titleCase(words.join(' ')) : undefined;
}

function detectLang(text: string): Lang {
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  const tokens = normalize(text).split(' ');
  return tokens.some((t) => HINDI_MARKERS.has(t)) ? 'hi' : 'en';
}

// ---------------------------------------------------------------- clause parser

function parseClause(c: Clause, ctx: NluContext): { intents: Intent[]; domain?: Domain } {
  const on = c.has(W.on);
  const off = c.has(W.off);
  const up = c.has(W.up);
  const down = c.has(W.down);
  const isQuestion = c.has(W.question) && !c.has(['karo', 'kar', 'kardo', 'करो', 'set']);

  // Questions about the car
  if (isQuestion) {
    if (c.has(W.fuel)) return { intents: [{ type: 'query', topic: 'fuel' }] };
    if (c.has(W.media)) return { intents: [{ type: 'query', topic: 'music' }] };
    if (c.has(W.climate)) return { intents: [{ type: 'query', topic: 'temp' }] };
    if (c.has(W.time)) return { intents: [{ type: 'query', topic: 'time' }] };
  }

  // Mood presets
  const tired = c.has(TIRED);
  const mood = c.find(MOODS);
  if (tired || (mood && !c.has(W.media) && (c.has(W.modeWord) || (mood === 'party' && on)))) {
    return { intents: [{ type: 'mood', mood: tired ? 'relax' : mood! }] };
  }

  // Day / night view of the cabin
  if (c.has(W.viewWord) && !c.has(W.climate) && !c.has(W.drive)) {
    if (c.has(W.night)) return { intents: [{ type: 'scene', scene: 'night' }] };
    if (c.has(W.day)) return { intents: [{ type: 'scene', scene: 'day' }] };
  }

  // Phone
  if (c.has(W.callTrigger) && c.has(W.hangup)) return { intents: [{ type: 'phone.end' }] };
  if (c.has(['hang up', 'hangup'])) return { intents: [{ type: 'phone.end' }] };
  if (c.has(W.callTrigger) && !c.has(W.media) && !c.has(W.show)) {
    const contact = extractContact(c);
    if (contact) return { intents: [{ type: 'phone.call', contact }] };
  }

  // Navigation
  if (c.has(['navigation', 'navigate', 'route', 'नेविगेशन']) && off) return { intents: [{ type: 'nav.stop' }] };
  const place = PLACES.some(([keys]) => c.has(keys));
  const otherDomain = c.has([...W.media, ...W.climate, ...W.ambient, ...W.volume]);
  if ((c.has(W.navTrigger) && !otherDomain) || (place && c.has([...W.navTrigger, 'jana', 'jaana', 'chalna', 'jaana hai']))) {
    const dest = extractDestination(c);
    if (dest) return { intents: [{ type: 'nav.start', destination: dest }] };
  }

  // Jump to a screen ("climate dikhao", "show the map")
  if (c.has(W.show) && !on && !off && !up && !down) {
    const pages: [Page, string[]][] = [
      ['nav', ['map', 'navigation', 'नक्शा']],
      ['media', ['music', 'media', 'gaana', 'गाना']],
      ['climate', W.climate],
      ['phone', ['phone', 'contacts', 'फोन']],
      ['vehicle', ['car', 'vehicle', 'gaadi', 'gadi', 'settings', 'गाड़ी']],
      ['home', ['home', 'होम']],
    ];
    const hit = pages.find(([, keys]) => c.has(keys));
    if (hit) return { intents: [{ type: 'screen', page: hit[0] }] };
  }

  // Exterior lights
  if (c.has(W.hazard)) return { intents: [{ type: 'lights.hazard', on: !off }] };
  if (c.has(W.head)) return { intents: [{ type: 'lights.head', on: !off }] };
  if (c.has(W.dark) && !c.has(W.ambient)) return { intents: [{ type: 'lights.head', on: true }] };

  // Wipers
  if (c.has(W.wiper)) {
    if (off) return { intents: [{ type: 'wipers', mode: 'off' }] };
    return { intents: [{ type: 'wipers', mode: c.has(W.heavy) ? 'fast' : 'slow' }] };
  }
  if (c.has(W.rain)) {
    if (c.has(['ruk', 'rukh', 'ruki', 'stopped', 'band'])) return { intents: [{ type: 'wipers', mode: 'off', rain: true }] };
    return { intents: [{ type: 'wipers', mode: c.has(W.heavy) ? 'fast' : 'slow', rain: true }] };
  }

  // Sunroof
  if (c.has(W.freshAir)) return { intents: [{ type: 'sunroof', open: true, fresh: true }] };
  if (c.has(W.sunroof)) return { intents: [{ type: 'sunroof', open: !c.has(W.close) }] };

  // Windows ("down" opens a window, "up" closes it)
  if (c.has(W.window)) {
    const target: Zone = c.has(W.both) || c.has(['windows', 'khidkiyan', 'शीशे']) ? 'both' : c.zone('driver');
    const closing = c.has(W.close) || c.has(['up', 'upar', 'ऊपर']);
    const partial = c.has(W.small) || c.has(['half', 'aadha', 'aadhi', 'आधा']);
    return { intents: [{ type: 'window', target, open: closing ? 0 : partial ? 40 : 100 }] };
  }

  // Seat ventilation
  if (c.has(W.seat)) {
    const target = c.zone('driver');
    if (off) return { intents: [{ type: 'seat.vent', target, level: 0 }] };
    const n = c.number(0, 3);
    if (n !== undefined) return { intents: [{ type: 'seat.vent', target, level: n }] };
    if (down) return { intents: [{ type: 'seat.vent', target, delta: -1 }], domain: 'seat' };
    if (c.has(['max', 'full', 'tez', 'tej'])) return { intents: [{ type: 'seat.vent', target, level: 3 }] };
    if (on && !up) return { intents: [{ type: 'seat.vent', target, level: 2 }] };
    return { intents: [{ type: 'seat.vent', target, delta: 1 }], domain: 'seat' };
  }

  // Drive mode
  if (c.has(W.saveFuel)) return { intents: [{ type: 'drive.mode', mode: 'eco' }] };
  if (c.has(W.race)) return { intents: [{ type: 'drive.mode', mode: 'sport' }] };
  if (c.has(W.drive) && !c.has(W.media) && !c.has(W.climate)) {
    const mode = c.has(['sport', 'sports', 'स्पोर्ट']) ? 'sport' : c.has(['eco', 'इको']) ? 'eco' : 'normal';
    return { intents: [{ type: 'drive.mode', mode }] };
  }

  // Volume
  if (c.has(W.unmute)) return { intents: [{ type: 'media.volume', mute: false }], domain: 'volume' };
  if (c.has(W.mute)) return { intents: [{ type: 'media.volume', mute: true }], domain: 'volume' };
  if (c.has(W.volume)) {
    const n = c.number(0, 30);
    if (n !== undefined) return { intents: [{ type: 'media.volume', value: n }], domain: 'volume' };
    if (c.has(['full', 'max', 'maximum', 'poora', 'pura'])) return { intents: [{ type: 'media.volume', value: 30 }], domain: 'volume' };
    if (up || down) {
      const d = step(c, 2, 4, 8) * (down ? -1 : 1);
      return { intents: [{ type: 'media.volume', delta: d }], domain: 'volume' };
    }
    if (off) return { intents: [{ type: 'media.volume', mute: true }], domain: 'volume' };
    return { intents: [], domain: 'volume' };
  }

  // Media
  const genre = c.find(GENRES);
  const color = c.find(COLORS);
  const skipWord = (c.has(W.next) || c.has(W.prev)) && !color && !c.has(W.ambient);
  if (c.has(W.media) || (genre && on) || skipWord || c.has(['play', 'bajao', 'बजाओ', 'resume', 'pause'])) {
    if (skipWord && c.has(W.prev)) return { intents: [{ type: 'media.skip', dir: -1 }], domain: 'media' };
    if (skipWord) return { intents: [{ type: 'media.skip', dir: 1 }], domain: 'media' };
    if (off) return { intents: [{ type: 'media.pause' }], domain: 'media' };
    if (up || down) {
      const d = step(c, 2, 4, 8) * (down ? -1 : 1);
      return { intents: [{ type: 'media.volume', delta: d }], domain: 'volume' };
    }
    const radio = c.has(W.radio);
    const freq = radio ? c.number(87.5, 108) : undefined;
    return { intents: [{ type: 'media.play', genre, radio, freq }], domain: 'media' };
  }

  // Ambient lighting
  if (c.has(W.ambient) || color) {
    if (color && !off) return { intents: [{ type: 'ambient.color', color }], domain: 'ambient' };
    if (off) return { intents: [{ type: 'ambient.power', on: false }], domain: 'ambient' };
    if (up || down) {
      return { intents: [{ type: 'ambient.brightness', delta: step(c, 0.1, 0.2, 0.4) * (down ? -1 : 1) }], domain: 'ambient' };
    }
    return { intents: [{ type: 'ambient.power', on: true }], domain: 'ambient' };
  }

  // Fan / blower
  if (c.has(W.fan) && !c.has(W.tempWord)) {
    const n = c.number(1, 8);
    if (off && n === undefined) return { intents: [{ type: 'climate.fan', value: 0 }], domain: 'fan' };
    if (n !== undefined) return { intents: [{ type: 'climate.fan', value: n }], domain: 'fan' };
    if (c.has(['max', 'full', 'maximum'])) return { intents: [{ type: 'climate.fan', value: 8 }], domain: 'fan' };
    if (up || down) return { intents: [{ type: 'climate.fan', delta: step(c, 1, 1, 3) * (down ? -1 : 1) }], domain: 'fan' };
    return { intents: [], domain: 'fan' };
  }

  // Climate
  const hasClimate = c.has(W.climate);
  const temp = c.number(16, 32);
  const causative = c.has(W.causative);
  const hot = c.has(['hot']);
  const feelHot = c.has(W.feelHot) || (hot && !causative) || (c.has(W.makeWarm) && c.has(W.feeling) && !causative);
  const feelCold = c.has(W.feelCold) || (c.has(W.cold) && !causative);
  const makeCool = c.has(W.makeCool) || (c.has(W.cold) && causative);
  const makeWarm = (c.has(W.makeWarm) || (hot && causative)) && !feelHot;

  if (hasClimate || feelHot || feelCold || makeCool || makeWarm || (temp !== undefined && ctx.domain === 'climate')) {
    if (temp !== undefined) return { intents: [{ type: 'climate.setTemp', value: temp }], domain: 'climate' };
    if (c.has(W.auto)) return { intents: [{ type: 'climate.auto' }], domain: 'climate' };
    if (feelHot) return { intents: [{ type: 'climate.adjustTemp', delta: -step(c, 1, 2, 3), feeling: 'hot' }], domain: 'climate' };
    if (feelCold) return { intents: [{ type: 'climate.adjustTemp', delta: step(c, 1, 2, 3), feeling: 'cold' }], domain: 'climate' };
    if (makeCool) return { intents: [{ type: 'climate.adjustTemp', delta: -step(c, 1, 2, 3) }], domain: 'climate' };
    if (makeWarm) return { intents: [{ type: 'climate.adjustTemp', delta: step(c, 1, 2, 3) }], domain: 'climate' };
    if (off && !up) return { intents: [{ type: 'climate.power', on: false }], domain: 'climate' };
    if (up || down) {
      // Indian usage: "AC tez karo" / "AC badhao" means more cooling, not a higher number.
      const literal = c.has(W.tempWord);
      const raise = literal ? up : down;
      const d = step(c, 1, 2, 3) * (raise ? 1 : -1);
      return { intents: [{ type: 'climate.adjustTemp', delta: d }], domain: 'climate' };
    }
    if (on || hasClimate) return { intents: [{ type: 'climate.power', on: true }], domain: 'climate' };
  }

  // "driver side 20": the AC is single-zone, so any side sets the cabin temperature
  const n = c.number(0, 32);
  if (n !== undefined && n >= 16 && n <= 30 && c.has(['side', 'driver', 'passenger', 'ड्राइवर', 'पैसेंजर'])) {
    return { intents: [{ type: 'climate.setTemp', value: n }], domain: 'climate' };
  }

  // Bare number or bare action: inherit the domain from earlier in the conversation
  if (ctx.domain && (n !== undefined || up || down || on || off)) {
    const inherited = parseClause(new Clause(`${domainWord(ctx.domain)} ${c.text.trim()}`), { ...ctx, domain: undefined });
    if (inherited.intents.length) return inherited;
  }
  // A lone "22" most likely means the cabin temperature
  if (n !== undefined && n >= 16 && n <= 30 && c.tokens.length <= 6) {
    return { intents: [{ type: 'climate.setTemp', value: n }], domain: 'climate' };
  }

  // "aur" / "thoda aur" / "again" repeats the last adjustment
  if (ctx.lastAdjust && c.has([...W.repeat, ...W.small]) && c.tokens.length <= 4) {
    return { intents: [ctx.lastAdjust] };
  }

  if (c.has(W.thanks)) return { intents: [{ type: 'thanks' }] };
  if (c.has(W.help)) return { intents: [{ type: 'help' }] };
  if (c.has(W.greet)) return { intents: [{ type: 'greet' }] };
  return { intents: [] };
}

function domainWord(d: Domain): string {
  return { climate: 'ac', fan: 'fan', volume: 'volume', media: 'music', ambient: 'ambient', seat: 'seat' }[d];
}

const ADJUSTABLE = new Set<Intent['type']>(['climate.adjustTemp', 'climate.fan', 'media.volume', 'ambient.brightness', 'seat.vent']);

export function parseCommand(raw: string, ctx: NluContext = {}): ParseResult {
  const lang = detectLang(raw);
  const text = normalize(raw);
  const parts = text
    .split(/\s(?:aur|and|और|then|phir|fir|also|plus|तथा|फिर|saath hi)\s|\s,\s/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Re-attach a leading "aur" ("aur thanda karo") that the splitter would otherwise eat.
  if (/^(aur|और)\s/.test(text) && parts.length) parts[0] = parts[0].replace(/^(aur|और)\s/, '');

  const intents: Intent[] = [];
  const context: NluContext = { ...ctx };
  for (const part of parts.length ? parts : [text]) {
    const { intents: found, domain } = parseClause(new Clause(part), context);
    if (domain) context.domain = domain;
    for (const it of found) {
      intents.push(it);
      if (ADJUSTABLE.has(it.type) && 'delta' in it && it.delta !== undefined) {
        context.lastAdjust = it;
      }
      const d = intentDomain(it);
      if (d) context.domain = d;
    }
  }
  return { intents: tidy(intents, text), lang, context };
}

function tidy(intents: Intent[], text: string): Intent[] {
  if (!text) return [{ type: 'greet' }];
  let out = intents;
  // Any real command makes the greeting redundant.
  if (out.some((i) => !['greet', 'thanks'].includes(i.type))) out = out.filter((i) => i.type !== 'greet');
  // Adjusting the AC implies switching it on; don't announce both.
  if (out.some((i) => i.type === 'climate.setTemp' || i.type === 'climate.adjustTemp' || i.type === 'climate.fan')) {
    out = out.filter((i) => !(i.type === 'climate.power' && i.on));
  }
  return out;
}

function intentDomain(it: Intent): Domain | undefined {
  if (it.type.startsWith('climate.')) return it.type === 'climate.fan' ? 'fan' : 'climate';
  if (it.type === 'media.volume') return 'volume';
  if (it.type.startsWith('media.')) return 'media';
  if (it.type.startsWith('ambient.')) return 'ambient';
  if (it.type === 'seat.vent') return 'seat';
  return undefined;
}
