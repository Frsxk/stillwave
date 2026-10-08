# Stillwave

A local-first ambient soundscape studio and focus timer. Procedural Web Audio synthesis, interactive vector landscapes, and SQLite persistence running on an Elysia backend.

Zero audio samples, zero external streams, zero cloud accounts. Everything generates and persists on your machine.

---

## Overview

Stillwave combines real-time sound synthesis with a local studio interface:

- **6-Channel Procedural Audio Engine:** Web Audio synthesizers generate rain, ocean swell, wind drift, fire crackle, birdsong, and harmonic pads in real time without audio files or streaming bandwidth.
- **Living Landscapes:** Vector artwork (Golden Hour Coast, Evergreen Trail, Midnight Orbit, Fireside Cabin) rendered in responsive SVG with CSS keyframe motion.
- **Persistent Mixes:** Custom channel blends saved to a local SQLite database.
- **Session Tracking:** Server-validated focus timers with start/finish timestamps, duration limits, and local daily statistics.
- **Immersive Mode:** Full-viewport visual focus mode with keyboard navigation.

---

## Architecture

```
stillwave/
├── src/
│   ├── shared.ts                # Shared TypeScript contracts, presets, and types
│   ├── index.ts                 # Server entry point & graceful shutdown hooks
│   ├── server/                  # Elysia application
│   │   ├── app.ts               # App factory with OpenAPI, error handlers & plugins
│   │   ├── db.ts                # bun:sqlite wrapper (WAL mode, schema, presets)
│   │   ├── cors.ts              # Origin & DNS-rebinding host validation guard
│   │   ├── models.ts            # TypeBox validation schemas & DTO models
│   │   ├── static.ts            # Path-traversal safe static file & SPA server
│   │   ├── studio.test.ts       # Backend & security regression suite
│   │   ├── scenes/              # Scene controller & service
│   │   └── sessions/            # Focus session controller & service
│   └── client/                  # React 19 frontend
│       ├── main.tsx             # Application bootstrap & self-hosted fonts
│       ├── App.tsx              # Studio workspace, mixer, dialogs, shortcuts
│       ├── audio.ts             # Web Audio graph & procedural synthesis engine
│       ├── Landscape.tsx        # Vector artwork with unique scoped SVG IDs
│       ├── api.ts               # Typed REST API client
│       └── styles.css           # Responsive studio styling & keyframes
├── public/                      # Static assets (brand SVG favicon)
├── package.json                 # Project configuration
├── tsconfig.json                # Strict TypeScript configuration
└── vite.config.ts               # Vite build config with React plugin
```

---

## Procedural Audio Engine

All sound is synthesized on-the-fly using the Web Audio API:

| Channel | Synthesis Method |
|---|---|
| **Rain** | Pink noise (Paul Kellet 6-pole filter) through bandpass (1100 Hz) + highpass (420 Hz), plus droplet shimmer at 5200 Hz. |
| **Ocean** | Leaky integrator brown noise shaped by an infrasonic (0.09 Hz) swell LFO and a highpass foam layer (2600 Hz). |
| **Wind** | Low-frequency body band (320 Hz) paired with a drifting resonant bandpass filter (700 Hz ± 380 Hz at 0.07 Hz). |
| **Fire** | Continuous low roar (brown noise through 480 Hz lowpass) with scheduled stereo crackle impulses (exponential decay envelopes). |
| **Birdsong** | Scheduled pentatonic frequency sweeps (1800–3200 Hz) with exponential attack/decay gains and stereo panning. |
| **Drift** | D-minor chord stack (D3, F3, A3, C4) using detuned sine/triangle oscillators with voice amplitude LFOs. |

Calling `pause()` fades master gain over 120 ms and suspends the `AudioContext` without tearing down the audio node graph, enabling instantaneous resumption.

---

## API Surface

Elysia serves interactive documentation via OpenAPI / Scalar at `/api/docs`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (`{ status: "ok", time }`) |
| `GET` | `/api/scenes` | List built-in presets and user-saved mixes |
| `POST` | `/api/scenes` | Create a new user scene (`name`, `description`, `landscape`, `mix`) |
| `DELETE` | `/api/scenes/:id` | Delete a custom scene (built-in presets are protected) |
| `GET` | `/api/sessions` | Fetch focus history, active session, and aggregated stats |
| `POST` | `/api/sessions` | Start a focus session (`sceneName`, `plannedSeconds`) |
| `POST` | `/api/sessions/:id/finish` | Finish session (`completed` requires planned duration; or `cancelled`) |

### Security & Guards

- **Host Validation:** Requests are rejected if the `Host` header does not match approved local interfaces (`localhost`, `127.0.0.1`, `[::1]`, or configured `HOST`), defending against DNS rebinding.
- **Origin Guard:** Mutating methods (`POST`, `DELETE`, `PUT`, `PATCH`) require same-origin headers when an `Origin` header is present.
- **Static Guard:** Static file resolution validates canonical paths against the `dist/` directory root to block directory traversal attempts.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.3+ recommended)

### Installation

```bash
bun install
```

### Development

Run the frontend build and watch the Elysia backend:

```bash
bun run dev
```

### Production Build & Run

```bash
bun run build
bun run start
```

Open `http://127.0.0.1:3000` in your browser.

### Test & Typecheck

```bash
bun run check     # Typecheck with TypeScript
bun test          # Run SQLite, API, and security regression tests
```

---

## Keyboard Shortcuts

- <kbd>Space</kbd> — Play / pause audio
- <kbd>F</kbd> — Toggle full-screen immersive landscape
- <kbd>Esc</kbd> — Exit immersive mode or close active modal
- <kbd>?</kbd> — Open keyboard shortcuts guide
