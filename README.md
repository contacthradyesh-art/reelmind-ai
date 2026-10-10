# ReelMind AI

**Imagine It. Create It. Reel It.**

ReelMind AI is a browser-first creative suite built with Next.js 15, React 19, TypeScript, Tailwind CSS 4, HTML Canvas, MediaRecorder and ffmpeg.wasm. Video rendering remains client-side; API routes only proxy configured AI providers.

## Workspaces

- **Reel Maker** — responsive 9:16 / 1:1 / 16:9 canvas, text/emoji layers, direct move/scale/rotate handles, scenes, local photo/video/audio import, video trim points, word-timed caption overlay and WebM → MP4 export attempt.
- **Meme Maker** — 10 original JSON-driven templates and PNG export.
- **AI Prompt-to-Reel** — Gemini-generated three-scene Hook / Main Content / Outro CTA script.
- **AI Character Studio** — provider-backed original image generation.
- **Cloud projects** — Google sign-in and user-scoped Firestore save/load/clone/delete.

## Local setup

Requires Node.js 20.9+.

    cp .env.example .env.local
    npm install
    npm run dev

Open http://localhost:3000. Main editor: /editor.

## Configure AI providers

Set these server-side environment variables in .env.local and in your deployment provider's environment settings:

- GEMINI_API_KEY — Gemini script generation and text-to-speech.
- OPENAI_API_KEY — Whisper transcription and image generation.

API keys are never placed in browser code. Calls may incur provider charges. If keys are absent, endpoints return a configuration error instead of silently faking AI output.

## Configure Firebase cloud projects

1. Create a Firebase project and register a Web App.
2. Enable Authentication → Google and set the correct authorized domains (including localhost for development).
3. Create a Cloud Firestore database.
4. Copy the web app config values into the NEXT_PUBLIC_FIREBASE_* variables in .env.local.
5. Publish firestore.rules in the Firestore Rules console. Rules restrict project documents to the authenticated owner.
6. Restart the dev server after changing environment variables.

Firebase web config values are designed to be public; Firestore Security Rules are the access-control boundary. Never add service-account JSON/private keys to the browser or NEXT_PUBLIC_* variables.

## Cloud persistence limitations

Project scene data is stored in Firestore under each user's UID. Browser blob: URLs for locally uploaded photos, videos and audio are session-only and are not durable cloud media assets. After opening a saved project in a fresh browser session, re-upload local media. Durable media persistence needs Firebase Storage (or another object store), upload rules and stable asset URLs; this repository does not claim that binary media uploads are implemented.

## Video / export notes

- Video rendering and export remain in the browser using Canvas + MediaRecorder + ffmpeg.wasm; there is no server-side FFmpeg or Remotion rendering.
- Imported video preview is canvas-based. Browser codecs and seeking behavior vary; test with the target Chrome/Edge version.
- Current scene trim points and video track are an initial editing layer, not a fully frame-accurate professional NLE timeline.
- The MP4 path records a WebM intermediate then attempts ffmpeg.wasm H.264/AAC conversion. First export downloads FFmpeg assets and can use significant memory. Keep projects short.
- Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers are set in next.config.ts; check them and FFmpeg asset requests if export fails after deployment.
- Word-timed captions depend on the configured transcription provider and timestamps. TTS/image generation also depend on provider access, quota and current model availability.

## Quality checks

GitHub Actions runs npm install, npx tsc --noEmit and npm run build. A green build does not replace manual browser tests for Google OAuth, Firestore rules, file codec compatibility, audio synchronization or MP4 playback.

## Media rights

Use original content or media you own or are licensed to use. Templates are original text/layouts; no third-party copyrighted template assets are bundled.
