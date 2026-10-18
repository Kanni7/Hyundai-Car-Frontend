// Generative in-car audio: royalty-free music synthesised live with Web Audio,
// plus horn and UI chimes. No audio files needed.

import type { Genre } from '../types';

interface Preset {
  bpm: number;
  chords: number[][];
  pad: OscillatorType;
  lead: OscillatorType;
  cutoff: number;
  kick: 'four' | 'half' | 'none';
  hats: boolean;
  snare: boolean;
  /** Chord-tone index per eighth note, -1 = rest. */
  arp: number[];
  leadDecay: number;
}

const PRESETS: Record<Genre, Preset> = {
  lofi: { bpm: 74, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], pad: 'triangle', lead: 'sine', cutoff: 1100, kick: 'half', hats: true, snare: true, arp: [0, -1, 2, -1, 3, -1, 1, -1], leadDecay: 0.5 },
  romantic: { bpm: 66, chords: [[48, 52, 55, 60], [45, 48, 52, 57], [41, 45, 48, 53], [43, 47, 50, 55]], pad: 'sawtooth', lead: 'triangle', cutoff: 900, kick: 'none', hats: false, snare: false, arp: [0, 1, 2, 3, 2, 1, 0, 1], leadDecay: 0.7 },
  party: { bpm: 122, chords: [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]], pad: 'sawtooth', lead: 'square', cutoff: 2400, kick: 'four', hats: true, snare: true, arp: [0, 0, 1, 0, 2, 0, 1, 2], leadDecay: 0.18 },
  devotional: { bpm: 60, chords: [[50, 57, 62], [50, 57, 62], [48, 55, 60], [50, 57, 62]], pad: 'triangle', lead: 'sine', cutoff: 800, kick: 'none', hats: false, snare: false, arp: [2, -1, -1, 1, -1, -1, 0, -1], leadDecay: 1.6 },
  retro: { bpm: 98, chords: [[48, 52, 55], [52, 55, 59], [53, 57, 60], [55, 59, 62]], pad: 'square', lead: 'square', cutoff: 1400, kick: 'half', hats: true, snare: true, arp: [0, 1, 2, 1, 0, 1, 2, 1], leadDecay: 0.25 },
};

const midi = (m: number) => 440 * 2 ** ((m - 69) / 12);

class CarAudio {
  private ctx?: AudioContext;
  private master!: GainNode;
  private music!: GainNode;
  private tone!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private hiss?: AudioBufferSourceNode;
  analyser?: AnalyserNode;

  private timer?: number;
  private step = 0;
  private nextTime = 0;
  private preset: Preset = PRESETS.lofi;
  private transpose = 0;
  private volume = 0.4;
  private ducked = false;

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 18000;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.78;
    this.music.connect(this.tone).connect(this.analyser).connect(this.master);
    this.master.connect(comp).connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    return ctx;
  }

  /** Must run inside a user gesture once so browsers allow sound. */
  unlock() {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  play(genre: Genre, track: number, radio: boolean) {
    const ctx = this.ensure();
    this.preset = PRESETS[genre];
    this.transpose = [0, 2, -3, 5][((track % 4) + 4) % 4];
    this.tone.frequency.setTargetAtTime(radio ? 3200 : 18000, ctx.currentTime, 0.05);
    this.setHiss(radio);
    if (this.timer === undefined) {
      this.step = 0;
      this.nextTime = ctx.currentTime + 0.08;
      this.timer = window.setInterval(() => this.schedule(), 25);
    }
    this.applyGain();
  }

  stop() {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
    this.setHiss(false);
    if (this.ctx) this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
  }

  setVolume(v: number) {
    this.volume = v;
    this.applyGain();
  }

  duck(on: boolean) {
    this.ducked = on;
    this.applyGain();
  }

  private applyGain() {
    if (!this.ctx || this.timer === undefined) return;
    const g = this.volume ** 1.6 * 0.9 * (this.ducked ? 0.35 : 1);
    this.music.gain.setTargetAtTime(g, this.ctx.currentTime, 0.12);
  }

  private setHiss(on: boolean) {
    if (!this.ctx) return;
    if (on && !this.hiss) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 0.018;
      src.connect(g).connect(this.music);
      src.start();
      this.hiss = src;
    } else if (!on && this.hiss) {
      this.hiss.stop();
      this.hiss = undefined;
    }
  }

  private schedule() {
    const ctx = this.ctx!;
    const p = this.preset;
    const stepDur = 60 / p.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const pos = this.step % 8;
      const bar = Math.floor(this.step / 8);
      const chord = p.chords[bar % p.chords.length].map((n) => n + this.transpose);
      const t = this.nextTime;
      if (pos === 0) this.pad(chord, t, stepDur * 8);
      if (pos === 0 || pos === 4) this.voice(midi(chord[0] - 12), t, stepDur * 3, 'sine', 0.32, 0.01);
      const idx = p.arp[pos];
      if (idx >= 0) this.voice(midi(chord[idx % chord.length] + 12), t, p.leadDecay, p.lead, p.lead === 'square' ? 0.05 : 0.11, 0.005);
      if (p.kick === 'four' ? pos % 2 === 0 : p.kick === 'half' && (pos === 0 || pos === 4)) this.kick(t);
      if (p.snare && (pos === 2 || pos === 6)) this.hit(t, 1400, 0.24, 0.16);
      if (p.hats) this.hit(t, 7500, pos % 2 ? 0.05 : 0.09, 0.04);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private pad(chord: number[], t: number, dur: number) {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = this.preset.cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.35);
    g.gain.setValueAtTime(0.06, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.4);
    f.connect(g).connect(this.music);
    for (const n of chord) {
      for (const detune of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = this.preset.pad;
        o.frequency.value = midi(n);
        o.detune.value = detune;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.5);
      }
    }
  }

  private voice(freq: number, t: number, dur: number, type: OscillatorType, gain: number, attack: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.85, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.35);
  }

  private hit(t: number, hp: number, gain: number, dur: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.music);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  horn() {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.02);
    g.gain.setValueAtTime(0.32, t + 0.38);
    g.gain.linearRampToValueAtTime(0, t + 0.46);
    f.connect(g).connect(this.master);
    for (const hz of [415, 523]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz;
      o.connect(f);
      o.start(t);
      o.stop(t + 0.5);
    }
  }

  chime(kind: 'listen' | 'ok' | 'error') {
    const ctx = this.ensure();
    const notes = { listen: [660, 990], ok: [880, 1320], error: [392, 294] }[kind];
    notes.forEach((hz, i) => {
      const t = ctx.currentTime + i * 0.09;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.4);
    });
  }
}

export const carAudio = new CarAudio();
