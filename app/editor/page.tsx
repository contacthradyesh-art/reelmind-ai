"use client";

import Link from "next/link";
import { ChangeEvent, CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type Scene = {
  id: number;
  text: string;
  background: string;
  textColor: string;
  fontSize: number;
  x: number;
  y: number;
  duration: number;
  animation: "fade" | "slide" | "pop";
  photoUrl?: string;
};

const initialScene: Scene = { id: 1, text: "YOUR STORY\nSTARTS HERE", background: "linear-gradient(145deg, #3b0764, #831843)", textColor: "#ffffff", fontSize: 64, x: 50, y: 50, duration: 4, animation: "pop" };
const fonts = ["Arial", "Georgia", "Impact", "Verdana", "Trebuchet MS"];

export default function EditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([initialScene]);
  const [activeId, setActiveId] = useState(1);
  const [font, setFont] = useState("Arial");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicName, setMusicName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState("Ready to create");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [photoName, setPhotoName] = useState("");

  const activeScene = scenes.find((scene) => scene.id === activeId) ?? scenes[0];

  const updateScene = (patch: Partial<Scene>) => setScenes((current) => current.map((scene) => scene.id === activeId ? { ...scene, ...patch } : scene));

  const parseGradient = (value: string, ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const colors = value.match(/#[0-9a-fA-F]{3,8}/g);
    if (value.startsWith("linear-gradient") && colors && colors.length >= 2) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      return gradient;
    }
    return value;
  };

  const drawScene = useCallback((scene: Scene, elapsed: number, ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = parseGradient(scene.background, ctx, width, height);
    ctx.fillRect(0, 0, width, height);

    if (photoRef.current?.complete && photoRef.current.naturalWidth > 0) {
      const img = photoRef.current;
      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      ctx.restore();
      ctx.fillStyle = "rgba(10,5,20,.32)";
      ctx.fillRect(0, 0, width, height);
    }

    const enter = Math.min(1, Math.max(0, elapsed / 0.65));
    let alpha = 1;
    let offsetY = 0;
    let scale = 1;
    if (scene.animation === "fade") alpha = enter;
    if (scene.animation === "slide") offsetY = (1 - enter) * 120;
    if (scene.animation === "pop") scale = 0.72 + 0.28 * enter;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(width * scene.x / 100, height * scene.y / 100 + offsetY);
    ctx.scale(scale, scale);
    ctx.fillStyle = scene.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${scene.fontSize}px ${font}`;
    ctx.shadowColor = "rgba(0,0,0,.28)";
    ctx.shadowBlur = 16;
    const lines = scene.text.split("\n");
    const lineHeight = scene.fontSize * 1.2;
    lines.forEach((line, index) => ctx.fillText(line, 0, (index - (lines.length - 1) / 2) * lineHeight, width * 0.82));
    ctx.restore();
  }, [font]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || isPlaying || isExporting) return;
    drawScene(activeScene, 1, ctx, canvas.width, canvas.height);
  }, [activeScene, drawScene, isPlaying, isExporting]);

  const addScene = () => {
    const id = Math.max(...scenes.map((scene) => scene.id)) + 1;
    setScenes((current) => [...current, { ...initialScene, id, text: `SCENE ${id}` }]);
    setActiveId(id);
    setDownloadUrl("");
  };

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { photoRef.current = image; };
    image.src = url;
    setPhotoName(file.name);
    updateScene({ photoUrl: url });
    setDownloadUrl("");
  };

  const onMusic = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    const url = URL.createObjectURL(file);
    setMusicUrl(url);
    setMusicName(file.name);
    setDownloadUrl("");
  };

  const stopPlayback = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false);
  };

  const playPreview = () => {
    if (isPlaying) { stopPlayback(); return; }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setIsPlaying(true);
    if (musicUrl) {
      audioRef.current = new Audio(musicUrl);
      audioRef.current.loop = true;
      void audioRef.current.play().catch(() => setStatus("Preview audio blocked by browser; press play again."));
    }
    const started = performance.now();
    const frame = (now: number) => {
      const elapsed = (now - started) / 1000;
      const total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
      if (elapsed >= total) { stopPlayback(); return; }
      let remaining = elapsed;
      let scene = scenes[0];
      for (const item of scenes) {
        scene = item;
        if (remaining < item.duration) break;
        remaining -= item.duration;
      }
      if (scene.photoUrl && photoRef.current?.src !== scene.photoUrl) {
        const img = new Image();
        img.onload = () => { photoRef.current = img; };
        img.src = scene.photoUrl;
      }
      drawScene(scene, remaining, ctx, canvas.width, canvas.height);
      animationRef.current = requestAnimationFrame(frame);
    };
    animationRef.current = requestAnimationFrame(frame);
  };

  const generateVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isExporting) return;
    if (!("MediaRecorder" in window) || !canvas.captureStream) {
      setStatus("Your browser does not support canvas recording. Try the latest Chrome or Edge.");
      return;
    }
    setIsExporting(true);
    setProgress(0);
    setDownloadUrl("");
    setStatus("Recording scenes in your browser…");
    if (isPlaying) stopPlayback();

    try {
      const stream = canvas.captureStream(30);
      let audioContext: AudioContext | undefined;
      let audioSource: MediaElementAudioSourceNode | undefined;
      let musicElement: HTMLAudioElement | undefined;
      if (musicUrl) {
        audioContext = new AudioContext();
        musicElement = new Audio(musicUrl);
        musicElement.loop = true;
        musicElement.crossOrigin = "anonymous";
        audioSource = audioContext.createMediaElementSource(musicElement);
        const destination = audioContext.createMediaStreamDestination();
        audioSource.connect(destination);
        audioSource.connect(audioContext.destination);
        destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
        await audioContext.resume();
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      const finished = new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error("Browser recording failed."));
        recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "video/webm" }));
      });

      if (musicElement) await musicElement.play().catch(() => setStatus("Music could not autoplay; exporting without guaranteed audio."));
      recorder.start(250);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable.");
      const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          const elapsed = (now - start) / 1000;
          setProgress(Math.min(65, Math.round((elapsed / totalDuration) * 65)));
          if (elapsed >= totalDuration) { resolve(); return; }
          let remaining = elapsed;
          let scene = scenes[0];
          for (const item of scenes) {
            scene = item;
            if (remaining < item.duration) break;
            remaining -= item.duration;
          }
          if (scene.photoUrl && photoRef.current?.src !== scene.photoUrl) {
            const img = new Image();
            img.onload = () => { photoRef.current = img; };
            img.src = scene.photoUrl;
          } else if (!scene.photoUrl) photoRef.current = null;
          drawScene(scene, remaining, ctx, canvas.width, canvas.height);
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      recorder.stop();
      const webmBlob = await finished;
      stream.getTracks().forEach((track) => track.stop());
      musicElement?.pause();
      audioSource?.disconnect();
      await audioContext?.close();

      setStatus("Converting to MP4 locally…");
      let ffmpeg = ffmpegRef.current;
      if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        ffmpeg.on("progress", ({ progress: ffmpegProgress }) => setProgress(65 + Math.min(34, Math.round(ffmpegProgress * 34))));
        ffmpeg.on("log", ({ message }) => console.info("[ffmpeg.wasm]", message));
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
        });
        ffmpegRef.current = ffmpeg;
      }
      await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));
      await ffmpeg.exec(["-i", "input.webm", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "output.mp4"]);
      const data = await ffmpeg.readFile("output.mp4");
      const mp4Blob = new Blob([data as BlobPart], { type: "video/mp4" });
      const url = URL.createObjectURL(mp4Blob);
      setDownloadUrl(url);
      setDownloadName("reelmind-reel.mp4");
      setProgress(100);
      setStatus("Your MP4 is ready to download!");
      await ffmpeg.deleteFile("input.webm").catch(() => undefined);
      await ffmpeg.deleteFile("output.mp4").catch(() => undefined);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? `Export failed: ${error.message}` : "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const previewStyle: CSSProperties = { aspectRatio: "9 / 16" };

  return (
    <main className="site-bg min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090711]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl gradient-button">R</span><span>ReelMind <span className="gradient-text">AI</span></span></Link>
          <div className="hidden text-xs text-zinc-500 sm:block">PHASE 1 · BROWSER VIDEO EDITOR</div>
          <Link href="/" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5">← Home</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-fuchsia-300">Creator studio</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Make your <span className="gradient-text">next reel.</span></h1><p className="mt-2 text-sm text-zinc-400">Edit locally, preview in 9:16 and export an MP4.</p></div>
          <div className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200">● Project stays in this session</div>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
          <section className="glass rounded-3xl p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Live preview</h2><p className="mt-1 text-xs text-zinc-500">1080 × 1920 · Vertical 9:16</p></div><button onClick={playPreview} disabled={isExporting} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/5 disabled:opacity-50">{isPlaying ? "■ Stop preview" : "▶ Preview"}</button></div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-black/30 p-3">
                <div ref={previewRef} style={previewStyle} className="relative w-full max-w-[280px] overflow-hidden rounded-xl shadow-2xl sm:max-w-[320px]">
                  <canvas ref={canvasRef} width={1080} height={1920} className="h-full w-full object-contain" aria-label="Vertical video preview" />
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Scenes</h3><button onClick={addScene} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15">＋ Add scene</button></div>
                <div className="space-y-2">
                  {scenes.map((scene, index) => <button key={scene.id} onClick={() => setActiveId(scene.id)} className={`w-full rounded-xl border p-3 text-left transition ${scene.id === activeId ? "border-fuchsia-400/60 bg-fuchsia-500/10" : "border-white/10 bg-black/10 hover:bg-white/5"}`}>
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-zinc-400">SCENE {index + 1}</span><span className="text-xs text-zinc-500">{scene.duration}s</span></div><p className="mt-2 truncate text-sm font-semibold">{scene.text.replaceAll("\n", " ") || "Untitled scene"}</p>
                  </button>)}
                </div>
                {scenes.length > 1 && <button onClick={() => { const next = scenes.filter((scene) => scene.id !== activeId); setScenes(next); setActiveId(next[0].id); }} className="mt-3 text-xs text-rose-300 hover:text-rose-200">Delete selected scene</button>}
                <div className="mt-5 rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-xs leading-5 text-zinc-400">Tip: use short text and high contrast. Upload only media you have permission to use.</p></div>
              </div>
            </div>
          </section>

          <aside className="glass rounded-3xl p-4 sm:p-5">
            <h2 className="mb-5 text-lg font-bold">Scene settings</h2>
            <div className="space-y-4">
              <div><label className="label" htmlFor="sceneText">TEXT (new line = next line)</label><textarea id="sceneText" className="field min-h-24 resize-y" value={activeScene.text} onChange={(e) => { updateScene({ text: e.target.value }); setDownloadUrl(""); }} /></div>
              <div><label className="label" htmlFor="font">FONT</label><select id="font" className="field" value={font} onChange={(e) => setFont(e.target.value)}>{fonts.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="fontSize">FONT SIZE</label><span className="text-xs text-zinc-400">{activeScene.fontSize}px</span></div><input id="fontSize" className="range" type="range" min="28" max="110" value={activeScene.fontSize} onChange={(e) => updateScene({ fontSize: Number(e.target.value) })} /></div>
              <div><label className="label" htmlFor="textColor">TEXT COLOR</label><div className="flex items-center gap-3"><input id="textColor" type="color" value={activeScene.textColor} onChange={(e) => updateScene({ textColor: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent" /><span className="text-sm text-zinc-400">{activeScene.textColor}</span></div></div>
              <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="posX">HORIZONTAL POSITION</label><span className="text-xs text-zinc-400">{activeScene.x}%</span></div><input id="posX" className="range" type="range" min="10" max="90" value={activeScene.x} onChange={(e) => updateScene({ x: Number(e.target.value) })} /></div>
              <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="posY">VERTICAL POSITION</label><span className="text-xs text-zinc-400">{activeScene.y}%</span></div><input id="posY" className="range" type="range" min="10" max="90" value={activeScene.y} onChange={(e) => updateScene({ y: Number(e.target.value) })} /></div>
              <div><label className="label" htmlFor="background">BACKGROUND COLOR / GRADIENT</label><input id="background" className="field" value={activeScene.background} onChange={(e) => updateScene({ background: e.target.value })} placeholder="#3b0764 or linear-gradient(...)" /><div className="mt-2 flex gap-2">{["linear-gradient(145deg, #3b0764, #831843)","linear-gradient(145deg, #082f49, #0f766e)","#111827","#7f1d1d"].map((bg) => <button key={bg} aria-label={bg} title={bg} onClick={() => updateScene({ background: bg })} className="h-7 flex-1 rounded-lg border border-white/15" style={{ background: bg }} />)}</div></div>
              <div><label className="label" htmlFor="animation">TEXT ANIMATION</label><select id="animation" className="field" value={activeScene.animation} onChange={(e) => updateScene({ animation: e.target.value as Scene["animation"] })}><option value="fade">Fade in</option><option value="slide">Slide up</option><option value="pop">Pop</option></select></div>
              <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="duration">SCENE DURATION</label><span className="text-xs text-zinc-400">{activeScene.duration}s</span></div><input id="duration" className="range" type="range" min="2" max="12" value={activeScene.duration} onChange={(e) => updateScene({ duration: Number(e.target.value) })} /></div>
              <div><label className="label" htmlFor="photo">ADD PHOTO (OPTIONAL)</label><input id="photo" className="field text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-fuchsia-500/20 file:px-3 file:py-2 file:text-xs file:text-fuchsia-100" type="file" accept="image/*" onChange={onPhoto} /><p className="mt-1 truncate text-xs text-zinc-500">{photoName || "No photo selected"}</p></div>
              <div><label className="label" htmlFor="music">BACKGROUND MUSIC (OPTIONAL)</label><input id="music" className="field text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-fuchsia-500/20 file:px-3 file:py-2 file:text-xs file:text-fuchsia-100" type="file" accept="audio/*" onChange={onMusic} /><p className="mt-1 truncate text-xs text-zinc-500">{musicName || "Use music you own or may use"}</p></div>
            </div>
            <div className="mt-6 border-t border-white/10 pt-5">
              <button onClick={generateVideo} disabled={isExporting || isPlaying} className="gradient-button w-full rounded-xl px-4 py-3.5 font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{isExporting ? "Generating video…" : "✦ Generate MP4"}</button>
              <p className="mt-3 text-xs leading-5 text-zinc-500">Video recording and conversion run in your browser. First export downloads FFmpeg files and can take a while.</p>
              {(isExporting || status !== "Ready to create") && <div className="mt-4"><div className="mb-2 flex justify-between gap-2 text-xs"><span className="text-zinc-300">{status}</span><span className="text-zinc-400">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${progress}%` }} /></div></div>}
              {downloadUrl && <a href={downloadUrl} download={downloadName} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 font-bold text-emerald-100 hover:bg-emerald-300/15">↓ Download MP4</a>}
            </div>
          </aside>
        </div>
        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">ReelMind AI Phase 1 · Browser rendering · No account required · Use only media you have rights to.</p>
      </div>
    </main>
  );
}