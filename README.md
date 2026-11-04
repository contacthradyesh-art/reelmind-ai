# ReelMind AI

**Imagine It. Create It. Reel It.**

ReelMind AI is a browser-based vertical video editor built with Next.js App Router, React, TypeScript, Tailwind CSS and Canvas.

## Features
- Classic editor at `/editor`: text layers, image upload, animations, scene timeline, music and browser export.
- Anime Story Studio at `/anime-studio`: five configurable character slots, reference image uploads, fixed outfit/personality/voice-ID fields, scene-by-scene Hinglish dialogue, background image uploads, per-scene ElevenLabs audio attachment, moonlight and gentle-wind canvas atmosphere, captions, IndexedDB autosave, project JSON backup and WebM draft export.
- Create voices in ElevenLabs, download dialogue audio and attach it to the matching scene. Voice IDs are stored as project notes; the app does not call ElevenLabs or store API keys.
- Anime Story Studio renders a motion-treated canvas from uploaded still references/backgrounds. It does not create new AI anime footage or true character lip-sync; those require an external video-generation model/provider.

## Requirements
- Node.js 20.9 or newer
- npm
- Current Chrome or Edge recommended

## Getting started
```bash
npm install
npm run dev
```
Open `http://localhost:3000`, `/editor`, or `/anime-studio`.

## Scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run build` | Create a production build |

## Architecture
- `app/page.tsx`: landing page and studio links
- `app/editor/page.tsx`: general-purpose editor
- `app/anime-studio/page.tsx`: character-driven anime storyboard and video draft studio
- `components/editor/InteractiveCanvasOverlay.tsx`: canvas interaction overlay
- `lib/editor/project-storage.ts`: classic editor persistence
- `app/globals.css`: global styles

## Export notes
Classic editor exports MP4 using ffmpeg.wasm. Anime Story Studio exports WebM using browser MediaRecorder; use CapCut to finish timing, captions and MP4 export. Mobile memory limits can affect long or high-resolution exports.

## Testing checklist
1. Open `/anime-studio` on Android Chrome.
2. Edit the five character profiles and upload reference art.
3. Change scene speakers and Hinglish dialogue.
4. Attach ElevenLabs audio to the matching scene.
5. Upload a scene background.
6. Confirm autosave after refresh.
7. Export a short WebM test and play it outside the browser.
8. Use only owned or licensed art, voice and music.
