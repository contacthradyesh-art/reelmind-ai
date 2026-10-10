# ReelMind AI

Imagine It. Create It. Reel It.

Phase 1: browser-based vertical video maker with Next.js, Canvas, MediaRecorder and ffmpeg.wasm.

## Run locally

Requires Node.js 20.9 or newer.

    npm install
    npm run dev

Open localhost port 3000. Editor: /editor.

## Export notes

The browser records a WebM intermediate and converts it to MP4 using ffmpeg.wasm. First export downloads FFmpeg assets and may take time or use significant memory. Keep clips short. The app sets Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers for browser isolation. If export fails after deployment, check these response headers and the FFmpeg JavaScript/WASM requests in DevTools Network. Use a current Chrome or Edge browser.

Only use images and music that you own or are licensed to use.