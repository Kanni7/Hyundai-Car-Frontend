import { carAudio } from './audio';
import type { Ignition } from '../types';

type Listener = (rpm: number, throttle: number) => void;

/**
 * Tiny engine model: RPM (in thousands) chases a target set by the throttle,
 * with inertia, a rev limiter, a starter-motor crank and a wind-down on
 * shutdown. It runs outside React so the tachometer and engine sound can
 * update every frame.
 */
class EngineSim {
  rpm = 0;
  throttle = 0;
  /** True while the driver holds the brake pedal (lets START go straight to ON). */
  brakeHeld = false;
  private running = false;
  private cranking = false;
  private idle = 0.8;
  private readonly redline = 6.5;
  private limiterUntil = 0;
  private raf = 0;
  private last = 0;
  private crankTimer = 0;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.rpm, this.throttle);
    return () => { this.listeners.delete(fn); };
  }

  setIgnition(mode: Ignition, sport: boolean) {
    this.idle = sport ? 0.78 : 0.65;
    const wantRun = mode === 'on';
    if (wantRun && !this.running && !this.cranking) {
      // Starter motor turns the engine over, then it catches and flares.
      this.cranking = true;
      carAudio.engineStart();
      window.clearTimeout(this.crankTimer);
      this.crankTimer = window.setTimeout(() => {
        this.cranking = false;
        this.running = true;
        this.blip(380, 0.3);
      }, 620);
    } else if (!wantRun) {
      window.clearTimeout(this.crankTimer);
      this.cranking = false;
      this.running = false;
      this.throttle = 0;
    }
    this.kick();
  }

  get isRunning() { return this.running; }

  press(amount = 1) {
    if (!this.running) return false;
    this.throttle = amount;
    this.kick();
    return true;
  }

  release() {
    if (this.throttle > 0.5 && this.rpm > 3.5) carAudio.overrun(Math.min(1, (this.rpm - 3) / 3.5));
    this.throttle = 0;
    this.kick();
  }

  /** A short stab of throttle, e.g. for "rev karo". */
  blip(ms = 700, amount = 1) {
    if (!this.press(amount)) return false;
    window.setTimeout(() => this.release(), ms);
    return true;
  }

  private kick() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.step);
  }

  private step = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    let target: number;
    if (this.cranking) target = 0.18 + Math.sin(now / 34) * 0.06; // compression strokes
    else if (this.running) target = this.idle + this.throttle * (this.redline + 0.3 - this.idle);
    else target = 0;

    if (target > this.rpm) {
      // Climbs quickly low down, more slowly as revs build.
      this.rpm += (target - this.rpm) * dt * (this.cranking ? 8 : 3 - this.rpm * 0.24);
    } else {
      this.rpm += (target - this.rpm) * dt * (this.running ? 2.4 : this.cranking ? 9 : 1.4);
    }
    // Rev limiter: fuel cut, bounce off the redline.
    let cut = false;
    if (this.rpm >= this.redline) {
      this.rpm = this.redline - 0.35;
      this.limiterUntil = now + 90;
    }
    if (now < this.limiterUntil) {
      this.rpm = Math.min(this.rpm, this.redline - 0.2);
      cut = true;
    }
    // A healthy idle is never perfectly steady.
    const shown = this.running && this.throttle === 0 ? this.rpm + Math.sin(now / 150) * 0.012 : this.rpm;
    this.rpm = Math.max(0, this.rpm);

    carAudio.engine({ rpm: shown, throttle: this.throttle, idle: this.idle, running: this.running || this.cranking, cut });
    for (const fn of this.listeners) fn(shown, this.throttle);

    const settled = !this.cranking && Math.abs(target - this.rpm) < 0.004 && this.throttle === 0;
    if (settled) {
      this.rpm = target;
      carAudio.engine({ rpm: this.rpm, throttle: 0, idle: this.idle, running: this.running, cut: false });
      for (const fn of this.listeners) fn(this.rpm, 0);
      this.raf = 0;
      return;
    }
    this.raf = requestAnimationFrame(this.step);
  };
}

export const engine = new EngineSim();
