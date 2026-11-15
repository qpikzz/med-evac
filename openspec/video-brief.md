# ORBITA — demo video brief (hand-off for a new chat)

Read this file only; do not re-read the whole repo. Do **not** open binary files (.mp4/.mp3/.png).

## Hard requirements (NASA Space Apps)
- **Max 30 seconds.** Hosted at a **public link** (e.g. YouTube unlisted/public). Not uploaded to the Space Apps site.
- Must show **team name, team members, and the selected challenge** (title card, 2–3 s; can repeat on the end card).
- **SI rules:** visible watermark on the whole video (e.g. `SI-assisted video · SI-generated voice-over`); voice-over acknowledged in the video description **and** file metadata. No NASA logos, flags, mission identifiers. "NASA Space Apps Challenge" may be named as the event.
- Music: SI-generated (then disclose like the voice) or a licence that allows use (YouTube Audio Library / CC0) — add it to `SOURCE.md`.
- Language: English voice + English burned-in subtitles.

## What the product is (one paragraph for the narrator)
ORBITA — Onboard Remote Biometric & Integrated Telemetry Assistant. Offline desktop app for crew health in Mars transit (demo: Day 40, fictional astronaut, synthetic data). Daily check-up of 10 indicators; a deterministic rules engine (52 rules from NASA/PubMed sources) compares them with the astronaut's own baselines → Green/Yellow/Red + who to contact. Layered body map, trend charts, animated alerts. Local AI (IBM Granite via Ollama) explains but never decides. Red status → a draft for the flight surgeon over a ~20-min delayed Earth link (×60 in the demo). No internet needed.

## Shot list (record 1920×1080, Wi-Fi off, calm cursor, 1–2 s pause on each result)
| # | Screen action (as in `openspec/demo-checklist.md`) | Key frame to keep | Target length |
|---|---|---|---|
| 0 | Title card (made in the editor, not the app) | "ORBITA · Team <NAME> · <members> · Challenge: <TITLE>" | 2.5 s |
| 1 | Login: Cmdr. Alex Vance, PIN 111111 | ORBITA gate, stars, shooting star | 2 s |
| 2 | Check-up: "Load Day-40 demo values", type heart rate **920** | red "Looks like a measurement error" | 3 s |
| 3 | Fix to **80**, Submit | big yellow heart alert with the beating-heart animation | 4 s |
| 4 | Body map → Organs | heart + brain "Watch", others OK | 3 s |
| 5 | Click the heart | card: "Your normal 62 bpm, today 80 (+18)", whole-mission chart, "Tell your crew medical officer" | 4 s |
| 6 | Edit check-up → "Irregular or skipping heartbeat" → Submit | heart **red**, banner "A message for the flight surgeon is ready" | 3.5 s |
| 7 | Review draft → Send to Earth | "Transmitting (×60 demo)…" (cut the wait) → "Received — under review" | 4 s |
| 8 | End card | "Offline · Explainable · Synthetic data" + team name | 2 s |

Total ≈ 28–30 s. Prefer **cuts** over speed-ups; never speed a readable screen more than 1.5–2×.

## Voice-over (≈ 65 words, ~27 s at a calm pace) — edit freely
> On the way to Mars, a doctor is twenty minutes away. ORBITA is an offline health assistant for astronauts.
> A daily check-up catches impossible values,
> then compares each vital with the astronaut's own normal — here, heart rate eighteen beats above baseline.
> Every alert shows what to do and its sources.
> When it turns red, ORBITA drafts a message for the flight surgeon on Earth.
> Transparent rules decide. AI only explains.

## Production pipeline (local Mac, near-zero tokens)
1. Files in one folder: `raw_screen.mp4`, timecodes written by hand (start–end per shot above).
2. Voice + subtitles (internet needed once): `pip install edge-tts` →
   `edge-tts --voice en-US-ChristopherNeural --text "<script>" --write-media voice.mp3 --write-subtitles subs.vtt`
   (female: `en-US-AriaNeural`). The voice is SI-generated → disclose.
3. `brew install ffmpeg` (includes libass for burned subtitles).
4. One Python script with `subprocess` + `ffmpeg -loglevel error`: cut the shots by timecode, scale/pad to 1920×1080@30, concat, add title/end cards (`drawtext` or images), drop original audio, add `voice.mp3` (+ music at −20 dB), burn `subs.vtt` (white, ~24 px, dark box), 0.5 s fade in/out, **watermark** (`drawtext`, bottom-right, whole duration), **metadata** (`-metadata comment="Voice-over generated with SI (edge-tts, Microsoft neural voice). Video edited with SI assistance. Synthetic data."`). Output `orbita_demo.mp4`; check duration ≤ 30.0 s with `ffprobe`.
5. Upload (public), paste the link into the submission; put the same SI note + music credit in the video description.

## Facts you may quote (all true in the app)
10 daily indicators · 52 rules · 16 verified symptom combinations · 6 extra indicators as AI reference · 42 symptom tags · personal baselines (preflight / 7-day) · NASA career radiation limit 600 mSv, MSL/RAD ≈ 1.8 mSv/day · ~20-min one-way Earth link · IBM Granite 3.3 8B via Ollama, local · Tauri + React + TypeScript · 182 automated tests · fully offline · synthetic data.
Do **not** claim: real patient data, medical certification, diagnosis, NASA endorsement.
