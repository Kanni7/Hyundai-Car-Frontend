import { carAudio } from './audio';
import type { DriveMode, Gear, Ignition } from '../types';

/** Live numbers for the instrument cluster, published every frame alongside the RPM. */
export interface Telemetry {
  /** km/h, always positive (also in reverse). */
  speed: number;
  /** Gearbox ratio in use, 1-7 (0 when the selector is in P or N). */
  gear: number;
  selector: Gear;
  odo: number;
  trip: number;
  /** Litres burnt since the trip was reset. */
  fuelUsed: number;
  /** Instant consumption in km/l (null when standing still). */
  instant: number | null;
  cruise: number | null;
  /** Auto Hold is keeping the car stationary. */
  held: boolean;
  running: boolean;
}

type Listener = (rpm: number, throttle: number, t: Telemetry) => void;

// 7-speed DCT: engine speed (thousand rpm) per km/h in each gear, and peak pull (km/h per second).
const RATIO = [0, 0.105, 0.062, 0.043, 0.033, 0.027, 0.0225, 0.019];
const PULL = [0, 14, 9.6, 6.8, 5.0, 3.9, 3.0, 2.4];
const REVERSE_RATIO = 0.11;
const SHIFT = { eco: [1.9, 2.0], normal: [2.2, 3.4], sport: [2.9, 3.4] } as const;
const MODE_PULL = { eco: 0.82, normal: 1, sport: 1.12 } as const;

/**
 * Tiny engine and vehicle model: RPM (in thousands) chases a target set by the
 * throttle, with inertia, a rev limiter, a starter-motor crank and a wind-down on
 * shutdown. In D or R the engine drives the wheels through an automatic gearbox,
 * so speed, odometer and fuel use follow the pedals. It runs outside React so the
 * cluster and engine sound can update every frame.
 */
class EngineSim {
  rpm = 0;
  throttle = 0;
  /** True while the driver holds the brake pedal (lets START go straight to ON). */
  brakeHeld = false;
  speed = 0;
  odo = 12486.4;
  trip = 0;
  fuelUsed = 0;
  autoHold = false;
  /** Called when the driver brakes while Smart Cruise is active, which cancels it. */
  onCruiseCancel?: () => void;
  private selector: Gear = 'P';
  private mode: DriveMode = 'normal';
  private gear = 1;
  private shiftedAt = 0;
  private cruise: number | null = null;
  private held = false;
  private instant: number | null = null;
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
    fn(this.rpm, this.throttle, this.telemetry());
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
        if (this.selector === 'P' || this.selector === 'N') this.blip(380, 0.3);
      }, 620);
    } else if (!wantRun) {
      window.clearTimeout(this.crankTimer);
      this.cranking = false;
      this.running = false;
      this.throttle = 0;
    }
    this.kick();
  }

  setDrive(selector: Gear, mode: DriveMode) {
    if (selector !== this.selector) this.gear = 1;
    this.selector = selector;
    this.mode = mode;
    this.kick();
  }

  setCruise(kmh: number | null) {
    this.cruise = kmh;
    this.kick();
  }

  setBrake(on: boolean) {
    this.brakeHeld = on;
    if (on && this.cruise !== null) this.onCruiseCancel?.();
    this.kick();
  }

  resetTrip() {
    this.trip = 0;
    this.fuelUsed = 0;
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

  telemetry(): Telemetry {
    const inGear = this.selector === 'D' || this.selector === 'R';
    return {
      speed: this.speed, gear: inGear ? (this.selector === 'R' ? 1 : this.gear) : 0, selector: this.selector,
      odo: this.odo, trip: this.trip, fuelUsed: this.fuelUsed, instant: this.instant,
      cruise: this.cruise, held: this.held, running: this.running,
    };
  }

  private kick() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.step);
  }

  /** Throttle the cruise controller asks for to hold its set speed (the driver can still press harder). */
  private cruiseThrottle() {
    if (this.cruise === null || this.selector !== 'D' || !this.running) return 0;
    return Math.max(0, Math.min(0.85, (this.cruise - this.speed) * 0.08 + 0.12 + this.speed * 0.0016));
  }

  private step = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const drive = this.selector === 'D' || this.selector === 'R';
    const throttle = Math.max(this.throttle, this.cruiseThrottle());

    // Auto Hold: brake to a stop and the car stays put until the accelerator is pressed.
    if (this.autoHold && drive && this.brakeHeld && this.speed < 0.5) this.held = true;
    if (!this.autoHold || throttle > 0.05 || !drive) this.held = false;

    let target: number;
    let cut = false;
    let accel = -0.35 - 0.00006 * this.speed * this.speed; // rolling resistance + drag, km/h per second
    if (this.cranking) {
      target = 0.18 + Math.sin(now / 34) * 0.06; // compression strokes
    } else if (this.running && drive) {
      const ratio = this.selector === 'R' ? REVERSE_RATIO : RATIO[this.gear];
      const wheelRpm = this.speed * ratio;
      if (this.selector === 'D') this.shift(wheelRpm, throttle, now);
      // Clutch slip lets the engine rev above road speed when pulling away.
      const slip = this.gear === 1 && this.speed < 25 ? this.idle + throttle * 2.6 * (1 - this.speed / 25) : 0;
      target = Math.max(this.idle, wheelRpm, slip);
      const torque = Math.max(0.4, Math.min(1.05, 0.55 + 0.25 * this.rpm - 0.03 * this.rpm * this.rpm));
      const pull = this.selector === 'R' ? 7 : PULL[this.gear];
      if (wheelRpm >= this.redline - 0.1) cut = true; // in-gear limiter
      else accel += throttle * pull * torque * MODE_PULL[this.mode];
      // Engine braking off throttle, and creep in D when the brake is released.
      if (throttle === 0) accel -= 0.25 * Math.min(3, wheelRpm);
      if (throttle === 0 && !this.brakeHeld && this.speed < 7) accel += 1.6;
      if (this.selector === 'R' && this.speed > 28) accel = Math.min(accel, 0);
    } else if (this.running) {
      target = this.idle + throttle * (this.redline + 0.3 - this.idle);
    } else {
      target = 0;
    }
    if (this.brakeHeld) accel -= 28;
    if (this.selector === 'P') accel -= 40;
    if (this.held) accel = -1e3;
    this.speed = Math.max(0, this.speed + accel * dt);

    if (drive && this.running && !this.cranking) {
      // Coupled to the wheels: follow the road speed closely (smoothed through shifts).
      this.rpm += (target - this.rpm) * Math.min(1, dt * 14);
    } else if (target > this.rpm) {
      // Climbs quickly low down, more slowly as revs build.
      this.rpm += (target - this.rpm) * dt * (this.cranking ? 8 : 3 - this.rpm * 0.24);
    } else {
      this.rpm += (target - this.rpm) * dt * (this.running ? 2.4 : this.cranking ? 9 : 1.4);
    }
    // Rev limiter: fuel cut, bounce off the redline.
    if (this.rpm >= this.redline) {
      this.rpm = this.redline - 0.35;
      this.limiterUntil = now + 90;
    }
    if (now < this.limiterUntil) {
      this.rpm = Math.min(this.rpm, this.redline - 0.2);
      cut = true;
    }
    // A healthy idle is never perfectly steady.
    const shown = this.running && throttle === 0 && this.speed < 1 ? this.rpm + Math.sin(now / 150) * 0.012 : this.rpm;
    this.rpm = Math.max(0, this.rpm);

    // Trip computer: distance and fuel burnt (litres per hour from load, revs and road speed).
    const km = (this.speed * dt) / 3600;
    this.odo += km;
    this.trip += km;
    const lph = this.running ? (0.9 + throttle * this.rpm * 3 + this.speed * 0.03) * (this.mode === 'eco' ? 0.9 : 1) : 0;
    this.fuelUsed += (lph * dt) / 3600;
    this.instant = this.speed > 3 && lph > 0 ? Math.min(99.9, this.speed / lph) : null;

    carAudio.engine({ rpm: shown, throttle, idle: this.idle, running: this.running || this.cranking, cut });
    const tele = this.telemetry();
    for (const fn of this.listeners) fn(shown, this.throttle, tele);

    const settled = !this.cranking && Math.abs(target - this.rpm) < 0.004 && throttle === 0 && this.speed === 0;
    if (settled) {
      this.rpm = target;
      carAudio.engine({ rpm: this.rpm, throttle: 0, idle: this.idle, running: this.running, cut: false });
      for (const fn of this.listeners) fn(this.rpm, 0, this.telemetry());
      this.raf = 0;
      return;
    }
    this.raf = requestAnimationFrame(this.step);
  };

  /** Automatic upshifts and downshifts (with kickdown), sooner in Eco and later in Sport. */
  private shift(wheelRpm: number, throttle: number, now: number) {
    if (now - this.shiftedAt < 280) return;
    const [base, span] = SHIFT[this.mode];
    const up = Math.min(6.2, base + throttle * span);
    const down = Math.max(1, up * 0.5 - 0.1);
    if (this.gear < 7 && wheelRpm > up) { this.gear++; this.shiftedAt = now; }
    else if (this.gear > 1 && wheelRpm < down) { this.gear--; this.shiftedAt = now; }
  }
}

export const engine = new EngineSim();
