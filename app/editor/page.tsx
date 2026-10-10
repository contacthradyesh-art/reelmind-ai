"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChangeEvent, CSSProperties, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type AnimationName = "fade" | "slide" | "pop";
type AspectRatio = "9:16" | "1:1" | "16:9";
type TextLayer = { id: string; text: string; color: string; fontFamily: string; fontSize: number; x: number; y: number; animation: AnimationName };
type Scene = { id: string; name: string; background: string; duration: number; layers: TextLayer[]; photoUrl?: string; photoName?: string; photoSide?: "left" | "right" };
type ProjectState = { scenes: Scene[]; activeSceneId: string; activeLayerId: string; aspect: AspectRatio };

const makeLayer = (id: string, text: string, color: string, fontFamily: string, fontSize: number, x: number, y: number, animation: AnimationName = "pop"): TextLayer => ({ id, text, color, fontFamily, fontSize, x, y, animation });
const starterScenes: Scene[] = [
  { id: "scene-1", name: "Hey guys", background: "linear-gradient(135deg, #650d27, #8f123b)", duration: 3, photoSide: "right", layers: [makeLayer("hey", "HEY", "#ffdf35", "Anton", 94, 36, 27), makeLayer("guys", "Guys", "#fff7f5", "Bebas Neue", 64, 39, 39)] },
  { id: "scene-2", name: "Sahi kaha", background: "linear-gradient(135deg, #ffe7d9, #f7d4c7)", duration: 3, photoSide: "left", layers: [makeLayer("sahi", "Sahi Kaha", "#8e1232", "Poppins", 42, 64, 40, "fade"), makeLayer("bilkul", "BILKUL", "#c51232", "Anton", 91, 66, 51)] },
  { id: "scene-3", name: "Yaar", background: "linear-gradient(135deg, #b7cf91, #a6c27b)", duration: 3, photoSide: "left", layers: [makeLayer("yaar", "yaar", "#25351d", "Dancing Script", 90, 37, 42, "slide")] }
];

const ratioDimensions: Record<AspectRatio, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 }
};
const iconByPanel: Record<string, string> = { Templates: "▦", Text: "T", Media: "▧", Audio: "♫", Scenes: "▤" };
const fonts = ["Anton", "Poppins", "Bebas Neue", "Dancing Script", "Caveat", "Arial", "Georgia"];

export default function EditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const animationRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dragSceneId = useRef<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>(starterScenes);
  const [activeSceneId, setActiveSceneId] = useState(starterScenes[0].id);
  const [activeLayerId, setActiveLayerId] = useState(starterScenes[0].layers[0].id);
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [panel, setPanel] = useState("Scenes");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicName, setMusicName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [status, setStatus] = useState("All changes are saved in this session");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [history, setHistory] = useState<ProjectState[]>([]);
  const [future, setFuture] = useState<ProjectState[]>([]);

  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];
  const activeLayer = activeScene.layers.find((layer) => layer.id === activeLayerId) ?? activeScene.layers[0];
  const totalDuration = useMemo(() => scenes.reduce((sum, scene) => sum + scene.duration, 0), [scenes]);
  const dimensions = ratioDimensions[aspect];

  const remember = () => {
    setHistory((items) => [...items.slice(-39), { scenes, activeSceneId, activeLayerId, aspect }]);
    setFuture([]);
    setDownloadUrl("");
  };
  const patchScene = (patch: Partial<Scene>) => { remember(); setScenes((items) => items.map((scene) => scene.id === activeSceneId ? { ...scene, ...patch } : scene)); };
  const patchLayer = (patch: Partial<TextLayer>) => {
    remember();
    setScenes((items) => items.map((scene) => scene.id === activeSceneId ? { ...scene, layers: scene.layers.map((layer) => layer.id === activeLayerId ? { ...layer, ...patch } : layer) } : scene));
  };
  const applyTemplate = (template: Scene[]) => {
    remember();
    const baseId = Date.now();
    const nextScenes = template.map((scene, index) => ({
      ...scene,
      id: `scene-${baseId}-${index}`,
      layers: scene.layers.map((layer, layerIndex) => ({ ...layer, id: `layer-${baseId}-${index}-${layerIndex}` }))
    }));
    setScenes(nextScenes);
    setActiveSceneId(nextScenes[0]?.id ?? "");
    setActiveLayerId(nextScenes[0]?.layers[0]?.id ?? "");
    setPanel("Scenes");
    setMobilePanelOpen(false);
  };
  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture((items) => [...items, { scenes, activeSceneId, activeLayerId, aspect }]);
    setHistory((items) => items.slice(0, -1));
    setScenes(previous.scenes); setActiveSceneId(previous.activeSceneId); setActiveLayerId(previous.activeLayerId); setAspect(previous.aspect);
    setDownloadUrl("");
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[future.length - 1];
    setHistory((items) => [...items, { scenes, activeSceneId, activeLayerId, aspect }]);
    setFuture((items) => items.slice(0, -1));
    setScenes(next.scenes); setActiveSceneId(next.activeSceneId); setActiveLayerId(next.activeLayerId); setAspect(next.aspect);
    setDownloadUrl("");
  };

  const loadPhoto = useCallback((scene: Scene) => {
    if (!scene.photoUrl) return null;
    const existing = photoCache.current.get(scene.photoUrl);
    if (existing) return existing;
    const image = new Image();
    image.onload = () => photoCache.current.set(scene.photoUrl!, image);
    image.src = scene.photoUrl;
    photoCache.current.set(scene.photoUrl, image);
    return image;
  }, []);

  const colorFromGradient = (value: string) => value.match(/#[0-9a-fA-F]{3,8}/g) ?? ["#32124a", "#9d174d"];
  const fillBackground = useCallback((ctx: CanvasRenderingContext2D, scene: Scene, width: number, height: number) => {
    const colors = colorFromGradient(scene.background);
    if (scene.background.startsWith("linear-gradient")) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, colors[0]); gradient.addColorStop(1, colors[1] ?? colors[0]);
      ctx.fillStyle = gradient;
    } else ctx.fillStyle = scene.background;
    ctx.fillRect(0, 0, width, height);
  }, []);

  const drawScene = useCallback((scene: Scene, elapsed: number, ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    fillBackground(ctx, scene, width, height);
    const image = loadPhoto(scene);
    if (image?.complete && image.naturalWidth) {
      const maxWidth = width * 0.54;
      const maxHeight = height * 0.72;
      const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const imageWidth = image.naturalWidth * scale;
      const imageHeight = image.naturalHeight * scale;
      const imageX = scene.photoSide === "left" ? width * 0.04 : width * 0.96 - imageWidth;
      ctx.save(); ctx.globalAlpha = 0.96;
      ctx.drawImage(image, imageX, (height - imageHeight) / 2, imageWidth, imageHeight);
      ctx.restore();
    } else if (!scene.photoUrl) {
      // Empty image slot: subtle dashed frame signals where the creator can place a photo.
      const slotWidth = width * 0.34;
      const slotHeight = height * 0.36;
      const x = scene.photoSide === "left" ? width * 0.06 : width * 0.94 - slotWidth;
      const y = height * 0.47 - slotHeight / 2;
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.32)"; ctx.lineWidth = Math.max(2, width / 500);
      ctx.setLineDash([width / 90, width / 70]); ctx.strokeRect(x, y, slotWidth, slotHeight);
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `500 ${Math.max(18, width / 42)}px Arial`; ctx.textAlign = "center";
      ctx.fillText("ADD PHOTO", x + slotWidth / 2, y + slotHeight / 2); ctx.restore();
    }
    scene.layers.forEach((layer) => {
      const enter = Math.min(1, Math.max(0, elapsed / 0.65));
      let alpha = 1; let offsetY = 0; let scale = 1;
      if (layer.animation === "fade") alpha = enter;
      if (layer.animation === "slide") offsetY = (1 - enter) * height * 0.055;
      if (layer.animation === "pop") scale = 0.72 + 0.28 * enter;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(width * layer.x / 100, height * layer.y / 100 + offsetY);
      ctx.scale(scale, scale); ctx.fillStyle = layer.color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const size = layer.fontSize * (width / 1080);
      ctx.font = `900 ${size}px "${layer.fontFamily}"`;
      ctx.shadowColor = "rgba(0,0,0,.24)"; ctx.shadowBlur = width / 70;
      const lines = layer.text.split("\n"); const lineHeight = size * 1.08;
      lines.forEach((line, index) => ctx.fillText(line, 0, (index - (lines.length - 1) / 2) * lineHeight, width * 0.88));
      ctx.restore();
    });
  }, [fillBackground, loadPhoto]);

  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || isPlaying || isExporting) return;
    drawScene(activeScene, 1, ctx, canvas.width, canvas.height);
  }, [activeScene, aspect, drawScene, isExporting, isPlaying]);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Poppins:wght@400;700;800;900&display=swap";
    link.rel = "stylesheet"; document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const addScene = () => {
    const id = `scene-${Date.now()}`; const layerId = `layer-${Date.now()}`;
    remember();
    setScenes((items) => [...items, { id, name: `Scene ${items.length + 1}`, background: "linear-gradient(135deg, #251044, #831843)", duration: 3, photoSide: "right", layers: [makeLayer(layerId, "Your text", "#ffffff", "Poppins", 70, 50, 50)] }]);
    setActiveSceneId(id); setActiveLayerId(layerId); setPanel("Scenes");
  };
  const deleteScene = (id: string) => {
    if (scenes.length <= 1) return;
    remember();
    const remaining = scenes.filter((scene) => scene.id !== id);
    setScenes(remaining);
    if (activeSceneId === id) { setActiveSceneId(remaining[0].id); setActiveLayerId(remaining[0].layers[0]?.id ?? ""); }
  };
  const addText = () => {
    const id = `layer-${Date.now()}`; remember();
    setScenes((items) => items.map((scene) => scene.id === activeSceneId ? { ...scene, layers: [...scene.layers, makeLayer(id, "New text", "#ffffff", "Poppins", 58, 50, 60, "fade")] } : scene));
    setActiveLayerId(id); setPanel("Text");
  };
  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file); const image = new Image();
    image.onload = () => photoCache.current.set(url, image); image.src = url;
    patchScene({ photoUrl: url, photoName: file.name });
  };
  const handleMusic = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    setMusicUrl(URL.createObjectURL(file)); setMusicName(file.name); setDownloadUrl("");
  };
  const reorderScene = (event: DragEvent<HTMLButtonElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = dragSceneId.current; dragSceneId.current = null;
    if (!sourceId || sourceId === targetId) return;
    remember();
    setScenes((items) => {
      const copy = [...items]; const sourceIndex = copy.findIndex((scene) => scene.id === sourceId); const targetIndex = copy.findIndex((scene) => scene.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return items;
      const [moved] = copy.splice(sourceIndex, 1); copy.splice(targetIndex, 0, moved); return copy;
    });
  };

  const stopPlayback = () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    setIsPlaying(false);
  };
  const playPreview = () => {
    if (isPlaying) { stopPlayback(); return; }
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    setIsPlaying(true); const started = performance.now();
    const frame = (now: number) => {
      const elapsed = (now - started) / 1000;
      if (elapsed >= totalDuration) { setPlayhead(0); stopPlayback(); return; }
      setPlayhead(elapsed);
      let remaining = elapsed; let scene = scenes[0];
      for (const item of scenes) { scene = item; if (remaining < item.duration) break; remaining -= item.duration; }
      drawScene(scene, remaining, ctx, canvas.width, canvas.height);
      animationRef.current = requestAnimationFrame(frame);
    };
    animationRef.current = requestAnimationFrame(frame);
  };

  const generateVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isExporting || isPlaying) return;
    if (!("MediaRecorder" in window) || !canvas.captureStream) { setStatus("Is browser mein canvas recording support nahi hai. Latest Chrome/Edge try karein."); return; }
    setIsExporting(true); setProgress(0); setDownloadUrl(""); setStatus("Browser mein video record ho raha hai…");
    try {
      const stream = canvas.captureStream(30);
      let audioContext: AudioContext | undefined; let audioSource: MediaElementAudioSourceNode | undefined; let musicElement: HTMLAudioElement | undefined;
      if (musicUrl) {
        audioContext = new AudioContext(); musicElement = new Audio(musicUrl); musicElement.loop = true;
        audioSource = audioContext.createMediaElementSource(musicElement);
        const destination = audioContext.createMediaStreamDestination();
        audioSource.connect(destination); audioSource.connect(audioContext.destination);
        destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
        await audioContext.resume();
      }
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType }); recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      const recorded = new Promise<Blob>((resolve, reject) => { recorder.onerror = () => reject(new Error("Browser recording failed.")); recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "video/webm" })); });
      await musicElement?.play().catch(() => setStatus("Music autoplay block hua; export bina music ke ho sakta hai."));
      recorder.start(250);
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas context unavailable.");
      const started = performance.now();
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          const elapsed = (now - started) / 1000;
          setProgress(Math.min(60, Math.round(elapsed / totalDuration * 60))); setPlayhead(Math.min(elapsed, totalDuration));
          if (elapsed >= totalDuration) { resolve(); return; }
          let remaining = elapsed; let scene = scenes[0];
          for (const item of scenes) { scene = item; if (remaining < item.duration) break; remaining -= item.duration; }
          drawScene(scene, remaining, ctx, canvas.width, canvas.height);
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      recorder.stop(); const webmBlob = await recorded;
      stream.getTracks().forEach((track) => track.stop()); musicElement?.pause(); audioSource?.disconnect(); await audioContext?.close();
      setStatus("WebM ko MP4 mein convert kar rahe hain…");
      let ffmpeg = ffmpegRef.current;
      if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        ffmpeg.on("progress", ({ progress: value }) => setProgress(60 + Math.min(39, Math.round(value * 39))));
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
        await ffmpeg.load({ coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"), wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm") });
        ffmpegRef.current = ffmpeg;
      }
      await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));
      await ffmpeg.exec(["-i", "input.webm", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "output.mp4"]);
      const data = await ffmpeg.readFile("output.mp4");
      setDownloadUrl(URL.createObjectURL(new Blob([data as BlobPart], { type: "video/mp4" })));
      setProgress(100); setStatus("MP4 ready hai — download kar sakte ho.");
      await ffmpeg.deleteFile("input.webm").catch(() => undefined); await ffmpeg.deleteFile("output.mp4").catch(() => undefined);
    } catch (error) {
      console.error(error); setStatus(`Export error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally { setIsExporting(false); }
  };

  const canvasStyle: CSSProperties = { aspectRatio: aspect.replace(":", " / ") };
  const openPanel = (name: string) => { setPanel(name); setMobilePanelOpen(true); };

  return (
    <main className="editor-shell min-h-screen text-white">
      <header className="editor-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Back to home" className="editor-logo">R</Link>
          <div className="min-w-0"><div className="truncate text-sm font-extrabold tracking-tight">ReelMind <span className="text-fuchsia-300">AI</span></div><div className="hidden text-[10px] text-zinc-500 sm:block">Untitled project · Draft</div></div>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="aspectRatio">Canvas ratio</label>
          <select id="aspectRatio" value={aspect} onChange={(e) => { remember(); setAspect(e.target.value as AspectRatio); }} className="editor-select hidden sm:block"><option>9:16</option><option>1:1</option><option>16:9</option></select>
          <button title="Undo" onClick={undo} disabled={!history.length} className="editor-tool-btn">↶</button>
          <button title="Redo" onClick={redo} disabled={!future.length} className="editor-tool-btn">↷</button>
          <button onClick={generateVideo} disabled={isExporting || isPlaying} className="editor-export">{isExporting ? "Exporting…" : "↥ Export"}</button>
        </div>
      </header>

      <div className="editor-workspace">
        <aside className="editor-left">
          <nav className="editor-rail" aria-label="Editor tools">
            {Object.keys(iconByPanel).map((name) => <button key={name} onClick={() => openPanel(name)} className={`editor-rail-btn ${panel === name ? "active" : ""}`}><span>{iconByPanel[name]}</span><small>{name}</small></button>)}
          </nav>
          <div className={`editor-content-panel ${mobilePanelOpen ? "mobile-open" : ""}`}>
            <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-fuchsia-300">Workspace</p><h2 className="mt-1 text-base font-bold">{panel}</h2></div><button className="editor-close sm:hidden" onClick={() => setMobilePanelOpen(false)}>✕</button></div>
            {panel === "Templates" && <div className="space-y-3">
              <button onClick={() => applyTemplate(starterScenes)} className="template-tile"><span className="template-swatch bg-gradient-to-br from-rose-950 via-rose-800 to-orange-100">HEY<br />Guys</span><span><b>Classic reaction</b><small>3 scenes · text + photo slots</small></span></button>
              <button onClick={() => applyTemplate([{ ...starterScenes[2], name: "Soft quote" }])} className="template-tile"><span className="template-swatch bg-gradient-to-br from-lime-200 to-green-700 font-serif italic">yaar</span><span><b>Soft quote</b><small>1 scene · handwritten</small></span></button>
              <p className="text-xs leading-5 text-zinc-500">Templates use editable layouts only. Add your own photos and licensed audio.</p>
            </div>}
            {panel === "Text" && <div className="space-y-3"><button onClick={addText} className="editor-secondary w-full">＋ Add text layer</button>{activeScene.layers.map((layer) => <button key={layer.id} onClick={() => setActiveLayerId(layer.id)} className={`layer-list-item ${activeLayerId === layer.id ? "selected" : ""}`}><span className="font-bold">T</span><span className="truncate text-left">{layer.text.replaceAll("\n", " ") || "Text layer"}</span></button>)}</div>}
            {panel === "Media" && <div className="space-y-4"><p className="text-xs leading-5 text-zinc-400">Selected scene mein apni image add karo. Template ke empty photo slot mein image fit hogi.</p><label className="upload-box"><span className="text-2xl">＋</span><b>Upload photo</b><small>PNG, JPG, WEBP</small><input type="file" accept="image/*" onChange={handlePhoto} className="sr-only" /></label>{activeScene.photoName && <div className="rounded-xl bg-white/5 p-3 text-xs text-zinc-300">{activeScene.photoName}<button onClick={() => patchScene({ photoUrl: undefined, photoName: undefined })} className="float-right text-rose-300">Remove</button></div>}<label className="label mt-4">Photo placement</label><select className="editor-select w-full" value={activeScene.photoSide ?? "right"} onChange={(e) => patchScene({ photoSide: e.target.value as Scene["photoSide"] })}><option value="left">Left side</option><option value="right">Right side</option></select></div>}
            {panel === "Audio" && <div className="space-y-4"><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="mb-2 flex items-center gap-2"><span className="text-xl text-fuchsia-300">♫</span><div><b className="block text-sm">Music track</b><small className="text-xs text-zinc-500">Local audio file</small></div></div><label className="upload-box"><span className="text-2xl">＋</span><b>Upload audio</b><small>MP3, WAV, M4A (browser support varies)</small><input type="file" accept="audio/*" onChange={handleMusic} className="sr-only" /></label>{musicName && <p className="mt-3 break-all text-xs text-zinc-300">{musicName}</p>}</div><p className="text-xs leading-5 text-zinc-500">Sirf apna ya royalty-free music use karein. Audio export browser aur codec support par depend karta hai.</p></div>}
            {panel === "Scenes" && <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-xs text-zinc-500">{scenes.length} frames</span><button onClick={addScene} className="editor-secondary">＋ Add scene</button></div>
              {scenes.map((scene, index) => <motion.div layout key={scene.id} className={`scene-card ${scene.id === activeSceneId ? "selected" : ""}`}>
                <button draggable onDragStart={() => { dragSceneId.current = scene.id; }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => reorderScene(e, scene.id)} onClick={() => { setActiveSceneId(scene.id); setActiveLayerId(scene.layers[0]?.id ?? ""); }} className="w-full text-left">
                  <div className="flex items-center gap-3"><span className="drag-handle">⠿</span><span className="scene-number">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 truncate text-xs font-bold">{scene.name}</span><span className="text-[10px] text-zinc-500">{scene.duration}s</span></div>
                  <div className="scene-mini-preview mt-3" style={{ background: scene.background }}>{scene.photoUrl && <span className="absolute inset-y-0 left-0 w-1/3 bg-white/20" />}{scene.layers.map((layer) => <span key={layer.id} style={{ color: layer.color, fontFamily: layer.fontFamily }} className="relative z-10 block truncate text-center font-black">{layer.text.replaceAll("\n", " ")}</span>)}</div>
                </button>
                <div className="mt-3 flex items-center gap-2"><label className="text-[10px] text-zinc-500">Duration</label><input aria-label={`Scene ${index + 1} duration`} type="number" min="1" max="30" value={scene.duration} onChange={(e) => { const value = Math.min(30, Math.max(1, Number(e.target.value) || 1)); remember(); setScenes((items) => items.map((item) => item.id === scene.id ? { ...item, duration: value } : item)); }} className="editor-duration" /><span className="text-[10px] text-zinc-500">sec</span><button aria-label="Delete scene" onClick={() => deleteScene(scene.id)} disabled={scenes.length === 1} className="ml-auto text-xs text-zinc-500 hover:text-rose-300 disabled:opacity-20">Delete ×</button></div>
                <div className="mt-3"><label className="sr-only" htmlFor={`scene-name-${scene.id}`}>Scene title</label><input id={`scene-name-${scene.id}`} className="editor-input" value={scene.name} onChange={(e) => { const name = e.target.value; setScenes((items) => items.map((item) => item.id === scene.id ? { ...item, name } : item)); }} placeholder="Scene name" /></div>
              </motion.div>)}
            </div>}
          </div>
        </aside>

        <section className="editor-stage">
          <div className="stage-toolbar"><div><span className="text-xs font-bold text-zinc-300">Preview</span><span className="ml-2 text-[10px] text-zinc-600">{dimensions.width} × {dimensions.height}</span></div><div className="flex items-center gap-2"><select aria-label="Canvas ratio" value={aspect} onChange={(e) => { remember(); setAspect(e.target.value as AspectRatio); }} className="editor-select sm:hidden"><option>9:16</option><option>1:1</option><option>16:9</option></select><span className="hidden rounded-md bg-white/5 px-2 py-1 text-[10px] text-zinc-500 sm:inline">{aspect}</span><button onClick={playPreview} disabled={isExporting} className="editor-play">{isPlaying ? "Ⅱ Pause" : "▶ Play"}</button></div></div>
          <div className="stage-canvas-area"><div className="stage-glow" /><div className="stage-canvas-wrap" style={canvasStyle}><canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="h-full w-full rounded-lg object-contain" aria-label="Video canvas preview" /></div></div>
          <div className="stage-footnote"><span>◉ Browser preview</span><span>Drag scenes below to reorder</span></div>
        </section>

        <aside className="editor-properties">
          <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-fuchsia-300">Inspector</p><h2 className="mt-1 text-base font-bold">Properties</h2></div>
          <div className="space-y-5">
            <div><label className="label">Selected layer</label><select className="editor-select w-full" value={activeLayer.id} onChange={(e) => setActiveLayerId(e.target.value)}>{activeScene.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.text || "Text layer"}</option>)}</select></div>
            <div><label className="label" htmlFor="layerText">Text content</label><textarea id="layerText" className="editor-input min-h-20 resize-y" value={activeLayer.text} onChange={(e) => patchLayer({ text: e.target.value })} /></div>
            <div><label className="label" htmlFor="layerFont">Font family</label><select id="layerFont" className="editor-select w-full" value={activeLayer.fontFamily} onChange={(e) => patchLayer({ fontFamily: e.target.value })}>{fonts.map((font) => <option key={font}>{font}</option>)}</select></div>
            <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="layerSize">Font size</label><span className="text-xs text-zinc-400">{activeLayer.fontSize}px</span></div><input id="layerSize" className="editor-range" type="range" min="24" max="140" value={activeLayer.fontSize} onChange={(e) => patchLayer({ fontSize: Number(e.target.value) })} /></div>
            <div><label className="label" htmlFor="layerColor">Text colour</label><div className="flex items-center gap-3"><input id="layerColor" type="color" value={activeLayer.color} onChange={(e) => patchLayer({ color: e.target.value })} className="h-9 w-11 rounded-lg border-0 bg-transparent" /><span className="text-xs text-zinc-400">{activeLayer.color}</span></div></div>
            <div><label className="label" htmlFor="layerAnimation">Animation</label><select id="layerAnimation" className="editor-select w-full" value={activeLayer.animation} onChange={(e) => patchLayer({ animation: e.target.value as AnimationName })}><option value="fade">Fade in</option><option value="slide">Slide up</option><option value="pop">Pop</option></select></div>
            <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="layerX">Horizontal position</label><span className="text-xs text-zinc-400">{activeLayer.x}%</span></div><input id="layerX" className="editor-range" type="range" min="5" max="95" value={activeLayer.x} onChange={(e) => patchLayer({ x: Number(e.target.value) })} /></div>
            <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="layerY">Vertical position</label><span className="text-xs text-zinc-400">{activeLayer.y}%</span></div><input id="layerY" className="editor-range" type="range" min="5" max="95" value={activeLayer.y} onChange={(e) => patchLayer({ y: Number(e.target.value) })} /></div>
            <button onClick={() => { remember(); setScenes((items) => items.map((scene) => scene.id === activeSceneId ? { ...scene, layers: scene.layers.filter((layer) => layer.id !== activeLayerId) } : scene)); const nextLayer = activeScene.layers.find((layer) => layer.id !== activeLayerId); setActiveLayerId(nextLayer?.id ?? ""); }} disabled={activeScene.layers.length <= 1} className="w-full rounded-xl border border-rose-300/20 px-3 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-300/5 disabled:opacity-30">Delete selected text layer</button>
          </div>
        </aside>
      </div>

      <section className="editor-timeline">
        <div className="timeline-head"><div><h2 className="text-sm font-bold">Timeline</h2><p className="mt-1 text-[10px] text-zinc-500">{totalDuration}s total · {scenes.length} scenes</p></div><div className="flex items-center gap-2"><button onClick={addScene} className="editor-secondary">＋ Scene</button><button onClick={playPreview} className="editor-tool-btn">{isPlaying ? "Ⅱ" : "▶"}</button></div></div>
        <div className="timeline-ruler"><span>00:00</span><span>{Math.floor(totalDuration / 2)}s</span><span>{totalDuration}s</span></div>
        <div className="timeline-track-wrap">
          <div className="timeline-track">
            {scenes.map((scene, index) => <button draggable key={scene.id} onDragStart={() => { dragSceneId.current = scene.id; }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => reorderScene(e, scene.id)} onClick={() => { setActiveSceneId(scene.id); setActiveLayerId(scene.layers[0]?.id ?? ""); let before = 0; for (let i = 0; i < index; i++) before += scenes[i].duration; setPlayhead(before); }} style={{ flex: `${scene.duration} 1 0%`, background: scene.background }} className={`timeline-scene ${scene.id === activeSceneId ? "active" : ""}`}><span className="timeline-scene-number">{index + 1}</span><span className="timeline-scene-text">{scene.layers.map((layer) => layer.text).join(" · ")}</span><span className="timeline-scene-duration">{scene.duration}s</span></button>)}
            <div className="playhead" style={{ left: `${Math.min(100, playhead / Math.max(totalDuration, 1) * 100)}%` }}><span /></div>
          </div>
          <div className="audio-track"><span className="audio-track-label">♫ {musicName || "Music track — upload audio"}</span>{musicUrl && <span className="audio-wave">▂▅▃▇▅▂▆▃▅▇▂▅▃▆▅▂▇▃▅▂▆▃▅▇▂▅▃▆▅▂▇▃▅▂▆▃▅▇</span>}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-600"><span>{status}</span>{isExporting && <span>{progress}%</span>}{downloadUrl && <a href={downloadUrl} download="reelmind-reel.mp4" className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200">↓ Download MP4</a>}</div>
        {isExporting && <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all" style={{ width: `${progress}%` }} /></div>}
      </section>
      <nav className="mobile-bottom-nav">{Object.keys(iconByPanel).map((name) => <button key={name} onClick={() => openPanel(name)} className={panel === name ? "active" : ""}><span>{iconByPanel[name]}</span><small>{name}</small></button>)}</nav>
      <AnimatePresence>{mobilePanelOpen && <motion.button aria-label="Close tools panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobilePanelOpen(false)} className="mobile-scrim" />}</AnimatePresence>
    </main>
  );
}
