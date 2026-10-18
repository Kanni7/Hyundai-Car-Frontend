# Verna Smart Cockpit

Hackathon prototype for the Hyundai Center of Excellence. It shows a Hyundai Verna interior that you control by talking to it in English, Hindi or Hinglish.

> "AC 20 pe kar do" · "Garmi lag rahi hai" · "Music band kar do" · "Light gulabi kar do" · "Ghar le chalo"

If a command needs power while the car is OFF (music, AC, navigation and so on), the car wakes into ACC first.

Everything runs locally in the browser. You need no backend, API key or internet connection.

The default **Live view** is a cockpit drawn entirely in code (SVG), traced from the night photo. Every switch, knob and lever in it works. The photo only shows through the glass, as the scenery outside. Two photo views are kept for comparison.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Use Chrome or Edge for voice input, because they support the Web Speech API. Other browsers still accept typed commands.

## Using it

| Control | What it does |
| --- | --- |
| Mic button or <kbd>Space</kbd> | Push to talk. `EN` / `हिं` picks the speech recogniser language. |
| Text box or <kbd>/</kbd> | Type any command, in Hindi script or in Roman letters. |
| Suggestion chips | One-click sample commands. |
| **Demo** | Plays a scripted conversation, which is useful on stage. |
| **Screen** or <kbd>Z</kbd> (or double-click the display) | Moves the camera closer to the infotainment screen. |
| **View** (layers icon) | Cycles through Live view (drawn cockpit), Night photo and Day photo. |
| Speaker icon | Turns spoken replies on or off. |
| Dashboard hotspots | Click the hazard button or the horn. Scroll on or click the climate temperatures. |

### Physical controls in the Live view

| Control | Where | What it does |
| --- | --- | --- |
| Steering wheel | Drag the rim | Steers (it springs back when released). Click the centre pad (with the Hyundai badge) for the horn. |
| Accelerator | Driver footwell, or hold <kbd>↑</kbd> / <kbd>W</kbd> | Hold to rev: the pedal travels, the tachometer needle climbs to the rev limiter and the engine note rises. Lift off at high revs for exhaust pops. Release and it falls back to idle. Needs the ignition in ON. |
| Left spoke keys | Steering wheel | Play/pause, mute, volume, previous/next track. |
| Right spoke keys | Steering wheel | Voice assistant (starts the mic), phone, temperature up/down, screen pages. |
| Left stalk | Behind the wheel | Wipers: off, low, high. |
| Right stalk | Behind the wheel | Indicators: top half for right, bottom half for left. |
| ENGINE START STOP | Right of the wheel | Cycles the ignition **OFF → ACC → ON**. ACC powers the screen, music, lights and climate with the engine off; ON cranks and starts the engine. Hold the brake pedal while pressing to start the engine straight away. OFF darkens everything. |
| Climate panel | Below the vents | AUTO, A/C, front and rear defrost, recirculation, fan, OFF. Click or scroll the temperature and fan displays. |
| Hazard switch | Between the vents | Hazard lights (the switch and cluster arrows blink). |
| Gear lever | Centre console | Drag up or down through P-R-N-D, click to toggle P/D, or click a letter in the lit column. |
| Console button strip | Left of the gear lever | Drive mode, Auto Hold, hazard, parking sensors, door lock. |
| Door switches | Passenger armrest | Passenger window (the glass slides down), driver window, all windows, door lock. |
| Roof console | Under the mirror | Cabin light. |

## What the car responds to

| Area | Example commands |
| --- | --- |
| Climate | `AC 20 pe kar do`, `garmi lag rahi hai`, `thand lag rahi hai`, `AC tez karo`, `fan speed 5`, `AC band karo`, `एसी बाईस पर कर दो` (single-zone: one cabin temperature) |
| Music | `romantic gaane chalao`, `bhajan lagao`, `agla gaana`, `volume thoda badhao`, `mute`, `FM 98.3 lagao`, `music band kar do` |
| Ambient light | `light laal kar do`, `ambient purple`, `light dim karo`, `lights off` |
| Moods | `party mode on`, `thak gaya hoon` (relax), `romantic mood`, `focus mode` |
| Comfort | `seat thandi karo`, `sunroof kholo`, `taazi hawa chahiye`, `windows neeche karo` |
| Driving | `sport mode on karo`, `petrol bachao` (eco), `headlights on`, `hazard lights on`, `baarish ho rahi hai` (wipers) |
| Car controls | `gaadi start karo`, `engine band karo` (ACC), `gaadi band karo` (OFF), `acc mode`, `rev karo`, `gear D mein daalo`, `reverse lagao`, `park karo`, `left indicator do`, `right turn lena hai`, `darwaze lock karo`, `andar ki light on karo`, `sheesha saaf karo` (defrost), `bahar dhool hai` (recirculation), `auto hold on` |
| Views | `night mode` (live view), `day mode`, `photo view` |
| Navigation and phone | `ghar le chalo`, `take me to the airport`, `India Gate ka rasta dikhao`, `mummy ko call karo`, `call kaat do` |
| Questions | `AC kitne pe hai?`, `kitna petrol hai?`, `konsa gaana chal raha hai?` |

The parser also handles these cases:

- **Compound commands:** `AC band karo aur music chalao` produces two intents.
- **Follow-ups:** after `garmi lag rahi hai`, saying `aur thoda` cools the cabin further.
- **Local usage:** `AC tez karo` means more cooling, not a higher temperature.

## How it works

```
speech (Web Speech API) ─┐
typed text ──────────────┴─▶ parseCommand()  ──▶ Intent[] ──▶ applyIntent() ──▶ CarState ──▶ cockpit visuals
                              src/nlu/parser.ts               src/state/car.ts                 + spoken reply
```

- **`src/nlu/parser.ts`** is the offline rule-based parser for English, Devanagari and romanised Hinglish. It covers spelling variants, Hindi number words, clause splitting and conversation context. To use an LLM or a hosted NLU service later, replace `parseCommand`. The `Intent` contract in `src/types.ts` stays the same.
- **`src/state/car.ts`** is the pure state machine. It applies each intent and writes a reply in both English and Hinglish.
- **`src/scenes.ts`** holds the per-view calibration. Every overlay is placed in the photo's own pixel coordinates. The drawn Live view reuses the night photo's coordinates.
- **Drawn cockpit** (`src/drawn/`): the static body (`CabinBase`) is drawn once. Each moving part (cluster, climate panel, vents, gear lever, wheel, door glass, switches) is its own small SVG, so animating one part never repaints the rest. Ambient light pipes are a separate layer recoloured through CSS. Add `?compare=split`, `?compare=overlay` or `?compare=photo` to the URL to lay the source photo over the drawing.
- **Shared visuals** (`src/components/`):
  - The infotainment UI is real HTML. A homography (`lib/homography.ts`) maps it onto the photographed screen, so it stays clickable.
  - In the photo views, the ambient lighting is an SVG filter. It finds the blue LED strips in the photo and relights them in any colour.
  - There are animated airflow, rain and wiper effects, plus overlays for the climate LCD, the instrument cluster, the hazard light and headlights.
- **`src/lib/audio.ts`** synthesises royalty-free music live with Web Audio, so no audio files are needed. It also plays the horn and UI chimes. The engine note is a cross-plane V8 model: each camshaft cycle is built from eight exhaust pulses in firing order 1-8-7-2-6-5-4-3, whose uneven bank pattern gives the V8 burble. It adds combustion jitter, a load filter that opens with throttle, deep exhaust resonances, intake roar, overrun pops and a starter crank.
- **`src/lib/engine.ts`** is a small engine model (throttle, inertia, rev limiter, idle). It runs outside React and drives the tachometer and engine sound every frame.

## Images

- `public/images/verna-interior-dashboard.avif` is the Verna showroom interior (day view).
- `public/images/hyundai-logo.webp` is the badge on the steering wheel (trimmed from `hyundai logo.png`).
- `public/images/verna-night.webp` is the night-drive cabin (from `verna int.png`). It is the Night photo view, and the Live view uses it for the scenery outside the glass.

To use a different photo, add an entry to `src/scenes.ts` and calibrate it: the screen corners, vents, windshield outline and LED clip region, all in image pixels.
