# Verna Smart Cockpit

Hackathon prototype for the Hyundai Center of Excellence. It shows a Hyundai Verna interior that you control by talking to it in English, Hindi or Hinglish.

> "AC 20 pe kar do" · "Garmi lag rahi hai" · "Music band kar do" · "Light gulabi kar do" · "Ghar le chalo"

Everything runs locally in the browser. You need no backend, API key or internet connection.

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
| **Day / Night** | Switches between the real Verna showroom photo and the night-drive cabin. |
| Speaker icon | Turns spoken replies on or off. |
| Dashboard hotspots | Click the hazard button or the horn. Scroll on or click the climate temperatures. |

## What the car responds to

| Area | Example commands |
| --- | --- |
| Climate | `AC 20 pe kar do`, `garmi lag rahi hai`, `thand lag rahi hai`, `AC tez karo`, `fan speed 5`, `AC band karo`, `एसी बाईस पर कर दो` (single-zone: one cabin temperature) |
| Music | `romantic gaane chalao`, `bhajan lagao`, `agla gaana`, `volume thoda badhao`, `mute`, `FM 98.3 lagao`, `music band kar do` |
| Ambient light | `light laal kar do`, `ambient purple`, `light dim karo`, `lights off` |
| Moods | `party mode on`, `thak gaya hoon` (relax), `romantic mood`, `focus mode` |
| Comfort | `seat thandi karo`, `sunroof kholo`, `taazi hawa chahiye`, `windows neeche karo` |
| Driving | `sport mode on karo`, `petrol bachao` (eco), `headlights on`, `hazard lights on`, `baarish ho rahi hai` (wipers) |
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
- **`src/scenes.ts`** holds the per-photo calibration. Every overlay is placed in the photo's own pixel coordinates.
- **Cockpit visuals** (`src/components/`):
  - The infotainment UI is real HTML. A homography (`lib/homography.ts`) maps it onto the photographed screen, so it stays clickable.
  - The ambient lighting is an SVG filter. It finds the blue LED strips in the photo and relights them in any colour.
  - There are animated airflow, rain and wiper effects, plus overlays for the climate LCD, the instrument cluster, the hazard light and headlights.
- **`src/lib/audio.ts`** synthesises royalty-free music live with Web Audio, so no audio files are needed. It also plays the horn and UI chimes.

## Images

- `public/images/verna-interior-dashboard.avif` is the Verna showroom interior (day view).
- `public/images/verna-night.webp` is the night-drive cabin (from `verna int.png`), which is the default view.

To use a different photo, add an entry to `src/scenes.ts` and calibrate it: the screen corners, vents, windshield outline and LED clip region, all in image pixels.
