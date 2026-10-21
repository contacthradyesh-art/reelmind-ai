# ReelMind AI

**Imagine It. Create It. Reel It.**

ReelMind AI is a browser-based reel maker prototype built with Next.js App Router, React, TypeScript, Tailwind CSS and Canvas. The editor currently supports text layers, simple animations, image upload, scene timelines and a browser-based export flow.

## Requirements

- Node.js 20.9 or newer
- npm
- Current Chrome or Edge recommended for the editor and export workflow

Use the Node version declared in `.nvmrc`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page and [http://localhost:3000/editor](http://localhost:3000/editor) for the editor.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run build` | Create a production build |
| `npm run start` | Serve a production build locally |

## Environment variables

The current editor does not require a backend API key. Future server-side AI features may use the following variables; add them only when the AI API route is implemented.

- `GEMINI_API_KEY`: server-side Gemini API key; never expose it in client-side code.
- `GEMINI_MODEL`: model name selected by the project owner.

See `.env.example`. Never commit real `.env.local` values.

## Current architecture

- `app/page.tsx`: landing page
- `app/editor/page.tsx`: current editor UI, scene state, canvas rendering, playback and export orchestration
- `components/editor/InteractiveCanvasOverlay.tsx`: direct manipulation overlay
- `lib/editor/transform.ts`: transform helpers
- `app/globals.css`: global styles

The editor is still a prototype and the core page is due to be split into focused renderer, state, panel and timeline modules. Keep new changes small and validate them with lint, typecheck and build.

## Export notes

The current pipeline captures a canvas stream in real time, records WebM in the browser and converts it to MP4 using ffmpeg.wasm. The first export downloads FFmpeg assets and may use substantial memory; switch to a lower resolution or a short test clip when testing on mobile. A completed build does not by itself prove that every output is playable on every device.

## Media and licensing

Only use photos, audio, fonts, stickers and other media that you own or are licensed to use. Trending platform audio must not be repackaged in the app. Music licensing notes will live in `docs/MUSIC_LICENSES.md` as licensed tracks are added.

## Testing checklist

1. Open `/editor` and apply a template.
2. Edit a text layer and drag/resize it.
3. Add a second scene and reorder scenes.
4. Upload a test image and verify it appears in the preview.
5. Upload an audio file and check playback.
6. Export a short reel and play the downloaded file outside the browser.
7. Repeat on Android Chrome at a 360–412 px viewport.

## Status

This repo is being improved in phases. See the open pull requests and GitHub Actions checks for the currently reviewed work.
