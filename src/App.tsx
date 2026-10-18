import { useCallback, useEffect, useRef, useState } from 'react';
import { Layers, Maximize, MessageSquareText, Play, Square, ZoomIn, ZoomOut } from 'lucide-react';
import type { CarState, ChatMessage, Intent, Toast } from './types';
import { SCENES } from './scenes';
import { initialCar, runIntents } from './state/car';
import { parseCommand, type NluContext } from './nlu/parser';
import { carAudio } from './lib/audio';
import { engine } from './lib/engine';
import { speak, useSpeechRecognition } from './lib/speech';
import { Cockpit } from './components/Cockpit';
import type { VoicePhase } from './components/Infotainment';
import { VoiceDock } from './components/VoiceDock';
import { Transcript } from './components/Transcript';

const DOCK_HEIGHT = 128;
const THINK_MS = 420;

const NEXT_SCENE = { live: 'night', night: 'day', day: 'live' } as const;
const SCENE_LABEL = { live: 'Live view', night: 'Night photo', day: 'Day photo' } as const;

const DEMO_SCRIPT = [
  'Namaste Verna',
  'Gaadi start karo',
  'AC 20 pe kar do',
  'Garmi lag rahi hai',
  'Romantic gaane chalao',
  'Light gulabi kar do',
  'Light ko music ke saath sync karo',
  'Volume thoda badhao',
  'Baarish ho rahi hai',
  'Ghar le chalo',
  'Gear D mein daalo aur right indicator do',
  'Sport mode on karo',
  'Cruise 60 pe set karo',
  'Tyre pressure kitna hai?',
  'Wiper band karo aur music band kar do',
  'Cruise band karo',
];

let nextId = 1;

export default function App() {
  const [car, setCar] = useState<CarState>(initialCar);
  const carRef = useRef(car);
  const nlu = useRef<NluContext>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId++, role: 'car', text: 'Namaste! I am your Verna. Speak or type in English, Hindi or Hinglish.' },
  ]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [reply, setReply] = useState<{ text: string; intents: Intent[]; understood: boolean } | null>(null);
  const [speechLang, setSpeechLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [tts, setTts] = useState(true);
  const [showLog, setShowLog] = useState(() => window.innerWidth > 1100);
  const [demo, setDemo] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const ttsRef = useRef(tts);
  useEffect(() => { ttsRef.current = tts; }, [tts]);

  const commit = useCallback((next: CarState) => {
    carRef.current = next;
    setCar(next);
  }, []);

  const handleCommand = useCallback((text: string, via: ChatMessage['via']) => {
    carAudio.unlock();
    setMessages((m) => [...m, { id: nextId++, role: 'user', text, via }]);
    setPhase('thinking');
    window.setTimeout(() => {
      const parsed = parseCommand(text, nlu.current);
      nlu.current = parsed.context;
      const out = runIntents(carRef.current, parsed.intents, parsed.lang, { speed: engine.speed });
      commit(out.state);
      if (out.state.ignition === 'on' && parsed.intents.some((i) => i.type === 'rev')) engine.blip(1300);
      if (out.toast) setToast({ ...out.toast, id: nextId++ });
      setMessages((m) => [...m, { id: nextId++, role: 'car', text: out.text, intents: parsed.intents }]);
      setReply({ text: out.text, intents: parsed.intents, understood: out.understood });
      carAudio.chime(out.understood ? 'ok' : 'error');
      if (ttsRef.current) {
        speak(out.text,
          () => { setPhase('speaking'); carAudio.duck(true); },
          () => { setPhase('idle'); carAudio.duck(false); });
        // Some browsers never fire onstart without voices; don't get stuck.
        window.setTimeout(() => setPhase((p) => (p === 'thinking' ? 'idle' : p)), 1500);
      } else {
        setPhase('idle');
      }
    }, THINK_MS);
  }, [commit]);

  // Touch controls on the virtual screen and dashboard skip the voice round-trip.
  const handleIntent = useCallback((intent: Intent) => {
    carAudio.unlock();
    const out = runIntents(carRef.current, [intent], 'en', { speed: engine.speed });
    commit(out.state);
    if (out.toast && intent.type !== 'screen') setToast({ ...out.toast, id: nextId++ });
  }, [commit]);

  const speech = useSpeechRecognition((text) => handleCommand(text, 'voice'));
  const toggleMic = useCallback(() => {
    carAudio.unlock();
    if (speech.listening) { speech.stop(); return; }
    window.speechSynthesis?.cancel();
    carAudio.chime('listen');
    speech.start(speechLang);
  }, [speech, speechLang]);

  // Engine and vehicle model follow the ignition, gear selector, drive mode, cruise and Auto Hold
  useEffect(() => { engine.setIgnition(car.ignition, car.driveMode === 'sport'); }, [car.ignition, car.driveMode]);
  useEffect(() => { engine.setDrive(car.gear, car.driveMode); }, [car.gear, car.driveMode]);
  useEffect(() => { engine.setCruise(car.adas.cruise); }, [car.adas.cruise]);
  useEffect(() => { engine.autoHold = car.autoHold; }, [car.autoHold]);
  // Touching the brake cancels Smart Cruise, as in the real car.
  useEffect(() => {
    engine.onCruiseCancel = () => handleIntent({ type: 'cruise', on: false });
    return () => { engine.onCruiseCancel = undefined; };
  }, [handleIntent]);

  // Hold ↑ or W to accelerate, ↓ or S to brake (when not typing)
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    const isThrottle = (e: KeyboardEvent) => (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && !typing(e);
    const isBrake = (e: KeyboardEvent) => (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') && !typing(e);
    const down = (e: KeyboardEvent) => {
      if (e.repeat || !(isThrottle(e) || isBrake(e))) return;
      e.preventDefault();
      carAudio.unlock();
      if (isBrake(e)) engine.setBrake(true);
      else engine.press();
    };
    const up = (e: KeyboardEvent) => {
      if (isThrottle(e)) engine.release();
      if (isBrake(e)) engine.setBrake(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Music engine follows the media state
  const m = car.media;
  useEffect(() => {
    if (m.playing) carAudio.play(m.genre, m.track, m.radio);
    else carAudio.stop();
  }, [m.playing, m.genre, m.track, m.radio]);
  useEffect(() => { carAudio.setVolume(m.muted ? 0 : m.volume / 30); }, [m.volume, m.muted]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Space = push to talk (when not typing)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.code === 'Space' && !typing && speech.supported) { e.preventDefault(); toggleMic(); }
      if (e.key.toLowerCase() === 'z' && !typing) setFocused((f) => !f);
      if (e.key === '/' && !typing) { e.preventDefault(); document.querySelector<HTMLInputElement>('.bar input')?.focus(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [toggleMic, speech.supported]);

  // Guided demo: feed the next scripted line once the car has finished answering
  useEffect(() => {
    if (demo === null || phase !== 'idle') return;
    const done = demo >= DEMO_SCRIPT.length;
    const t = window.setTimeout(() => {
      if (done) { setDemo(null); return; }
      handleCommand(DEMO_SCRIPT[demo], 'chip');
      setDemo(demo + 1);
    }, done ? 0 : demo === 0 ? 300 : 1600);
    return () => window.clearTimeout(t);
  }, [demo, phase, handleCommand]);

  const scene = SCENES[car.scene];
  const livePhase: VoicePhase = speech.listening ? 'listening' : phase;

  return (
    <div className={`app scene-${scene.id}`}>
      <Cockpit car={car} scene={scene} toast={toast} onIntent={handleIntent} reserveBottom={DOCK_HEIGHT}
        focused={focused} onToggleFocus={() => setFocused((f) => !f)} onMic={toggleMic}
        voice={{ phase: livePhase, interim: speech.interim, reply: reply?.text ?? '' }} />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">VERNA</span>
          <span className="brand-sub">Smart Cockpit <i>·</i> Voice AI</span>
        </div>
        <div className="top-actions">
          <span className="badge">Offline NLU · English · हिन्दी · Hinglish</span>
          <button className={demo !== null ? 'on' : ''} onClick={() => { carAudio.unlock(); setDemo(demo === null ? 0 : null); }}
            title="Run a guided demo">{demo !== null ? <Square /> : <Play />}<span>{demo !== null ? 'Stop demo' : 'Demo'}</span></button>
          <button onClick={() => handleIntent({ type: 'scene', scene: NEXT_SCENE[car.scene] })}
            title="Switch view: live drawn cockpit, night photo, day photo"><Layers /><span>{SCENE_LABEL[car.scene]}</span></button>
          <button className={focused ? 'on' : ''} onClick={() => setFocused(!focused)} title="Lean in to the screen (Z)">
            {focused ? <ZoomOut /> : <ZoomIn />}<span>{focused ? 'Cabin' : 'Screen'}</span></button>
          <button className={showLog ? 'on' : ''} onClick={() => setShowLog(!showLog)} title="Conversation log"><MessageSquareText /></button>
          <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())} title="Full screen"><Maximize /></button>
        </div>
      </header>

      {showLog && <Transcript messages={messages} onClose={() => setShowLog(false)} onClear={() => setMessages([])} />}

      <VoiceDock phase={livePhase} interim={speech.interim} reply={reply} supported={speech.supported} error={speech.error}
        speechLang={speechLang} tts={tts} onLang={setSpeechLang} onTts={(v) => { setTts(v); if (!v) window.speechSynthesis?.cancel(); }}
        onMic={toggleMic} onSend={handleCommand} />
    </div>
  );
}
