import { useRef, useState, type FormEvent } from 'react';
import { Mic, Send, Square, Volume2, VolumeX } from 'lucide-react';
import type { Intent } from '../types';
import { describeIntent, SUGGESTIONS } from '../lib/intents';
import type { VoicePhase } from './Infotainment';

interface Props {
  phase: VoicePhase;
  interim: string;
  reply: { text: string; intents: Intent[]; understood: boolean } | null;
  supported: boolean;
  error: string | null;
  speechLang: 'en-IN' | 'hi-IN';
  tts: boolean;
  onLang: (l: 'en-IN' | 'hi-IN') => void;
  onTts: (v: boolean) => void;
  onMic: () => void;
  onSend: (text: string, via: 'text' | 'chip') => void;
}

export function VoiceDock({ phase, interim, reply, supported, error, speechLang, tts, onLang, onTts, onMic, onSend }: Props) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim(), 'text');
    setText('');
  };
  const listening = phase === 'listening';

  return (
    <div className="dock">
      {(reply || listening || error) && (
        <div className={`reply ${reply && !reply.understood ? 'miss' : ''}`} key={listening ? 'l' : reply?.text}>
          {listening ? (
            <p className="interim">{interim || (speechLang === 'hi-IN' ? 'बोलिए…' : 'Listening… speak in English, Hindi or Hinglish')}</p>
          ) : error ? (
            <p className="interim">{error}</p>
          ) : reply && (
            <>
              <p>{reply.text}</p>
              {reply.intents.length > 0 && (
                <div className="intents">{reply.intents.map((i, k) => <code key={k}>{describeIntent(i)}</code>)}</div>
              )}
            </>
          )}
        </div>
      )}

      <div className="suggest" role="list">
        {SUGGESTIONS.map((s) => (
          <button key={s} role="listitem" onClick={() => onSend(s, 'chip')}>{s}</button>
        ))}
      </div>

      <form className="bar" onSubmit={submit}>
        <button type="button" className={`mic ${listening ? 'live' : ''} ${phase}`} onClick={onMic} disabled={!supported}
          title={supported ? 'Speak (Space)' : 'Voice input needs Chrome or Edge. Type instead.'} aria-label="Speak">
          {listening ? <Square /> : <Mic />}
          {listening && <><i /><i /></>}
        </button>
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={supported ? 'Bolo ya likho… "AC 20 pe kar do", "garmi lag rahi hai"' : 'Type a command… "AC 20 pe kar do"'} aria-label="Command" />
        <div className="lang" role="radiogroup" aria-label="Speech language">
          <button type="button" className={speechLang === 'en-IN' ? 'on' : ''} onClick={() => onLang('en-IN')}>EN</button>
          <button type="button" className={speechLang === 'hi-IN' ? 'on' : ''} onClick={() => onLang('hi-IN')}>हिं</button>
        </div>
        <button type="button" className="icon" onClick={() => onTts(!tts)} title={tts ? 'Voice replies on' : 'Voice replies off'} aria-label="Toggle voice replies">
          {tts ? <Volume2 /> : <VolumeX />}
        </button>
        <button type="submit" className="send" aria-label="Send" disabled={!text.trim()}><Send /></button>
      </form>
    </div>
  );
}
