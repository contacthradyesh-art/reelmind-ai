"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChangeEvent, CSSProperties, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import InteractiveCanvasOverlay from "@/components/editor/InteractiveCanvasOverlay";
import { auth, googleProvider, saveCloudProject } from "@/lib/firebase/client";
import { signInWithPopup } from "firebase/auth";

type AnimationName = "fade" | "slide" | "pop" | "bounce" | "float" | "spin" | "shake" | "pulse";
type AspectRatio = "9:16" | "1:1" | "16:9";
type TextLayer = { id: string; text: string; color: string; fontFamily: string; fontSize: number; x: number; y: number; animation: AnimationName; scale: number; rotation?: number; outlineColor: string; outlineWidth: number; backgroundColor: string };
type CaptionWord = { text: string; start: number; end: number };
type Scene = { id: string; name: string; background: string; duration: number; layers: TextLayer[]; photoUrl?: string; photoName?: string; photoSide?: "left" | "right"; photoX?: number; photoY?: number; photoScale?: number; photoRotation?: number; videoUrl?: string; videoName?: string; trimStart?: number; trimEnd?: number; captions?: CaptionWord[] };
type ProjectState = { scenes: Scene[]; activeSceneId: string; activeLayerId: string; aspect: AspectRatio };

const makeLayer = (id: string, text: string, color: string, fontFamily: string, fontSize: number, x: number, y: number, animation: AnimationName = "pop"): TextLayer => ({ id, text, color, fontFamily, fontSize, x, y, animation, scale: 1, outlineColor: "#111111", outlineWidth: 0, backgroundColor: "transparent" });
const starterScenes: Scene[] = [
  { id: "scene-1", name: "Hey guys", background: "linear-gradient(135deg, #650d27, #8f123b)", duration: 3, photoSide: "right", layers: [makeLayer("hey", "HEY", "#ffdf35", "Anton", 94, 36, 27), makeLayer("guys", "Guys", "#fff7f5", "Bebas Neue", 64, 39, 39)] },
  { id: "scene-2", name: "Sahi kaha", background: "linear-gradient(135deg, #ffe7d9, #f7d4c7)", duration: 3, photoSide: "left", layers: [makeLayer("sahi", "Sahi Kaha", "#8e1232", "Poppins", 42, 64, 40, "fade"), makeLayer("bilkul", "BILKUL", "#c51232", "Anton", 91, 66, 51)] },
  { id: "scene-3", name: "Yaar", background: "linear-gradient(135deg, #b7cf91, #a6c27b)", duration: 3, photoSide: "left", layers: [makeLayer("yaar", "yaar", "#25351d", "Dancing Script", 90, 37, 42, "slide")] }
];

type ViralTemplate = { title: string; category: string; description: string; scene: Scene };
type ViralLayerRow = [text: string, color: string, fontFamily: string, fontSize: number, y: number, animation: AnimationName];

function buildFullReel(template: Scene): Scene[] {
  const base = template.layers;
  const title = base[0]?.text ?? template.name;
  const supporting = base[1]?.text ?? "YOUR STORY STARTS HERE";
  const clone = (name: string, idSuffix: string, duration: number, rows: Array<{ text: string; color: string; fontSize: number; y: number; animation: AnimationName }>): Scene => ({
    ...template, id: `${template.id}-${idSuffix}`, name, duration,
    layers: rows.map((row, index) => ({ ...makeLayer(`${template.id}-${idSuffix}-${index}`, row.text, row.color, base[index]?.fontFamily ?? "Anton", row.fontSize, 50, row.y, row.animation), scale: base[index]?.scale ?? 1 }))
  });
  return [
    clone("01 · Hook", "hook", 2.5, [{ text: title, color: base[0]?.color ?? "#ffffff", fontSize: base[0]?.fontSize ?? 72, y: 42, animation: "pop" }]),
    clone("02 · Main moment", "main", 4, [{ text: supporting, color: base[1]?.color ?? base[0]?.color ?? "#ffffff", fontSize: base[1]?.fontSize ?? 54, y: 42, animation: "bounce" }, { text: title, color: base[0]?.color ?? "#ffffff", fontSize: Math.max(28, (base[0]?.fontSize ?? 60) * 0.48), y: 65, animation: "fade" }]),
    clone("03 · Outro / CTA", "outro", 2.5, [{ text: "FOLLOW FOR MORE ✨", color: base[0]?.color ?? "#ffffff", fontSize: 48, y: 42, animation: "pop" }, { text: title, color: base[1]?.color ?? "#ffffff", fontSize: 34, y: 58, animation: "fade" }])
  ];
}
const viralTemplates: ViralTemplate[] = ([[ "Beat Drop Reveal","Trending","Bold intro + reveal","#09090b","#7c3aed",[["WAIT FOR IT","#ffffff","Anton",78,37,"pop"],["THE REVEAL 🔥","#facc15","Anton",54,58,"bounce"]]],["Photo Dump","Photo","Memories in a clean frame","#fce7f3","#c4b5fd",[["little moments","#3b0764","Dancing Script",76,22,"fade"],["BIG MEMORIES","#ffffff","Anton",54,77,"slide"]]],["Cinematic Intro","Cinematic","Dark movie-title look","#020617","#334155",[["YOUR STORY","#f8fafc","Georgia",68,43,"fade"],["A FILM BY YOU","#cbd5e1","Poppins",26,53,"slide"]]],["POV Story","Story","Relatable POV opener","#0f172a","#0e7490",[["POV:","#67e8f9","Anton",92,35,"pop"],["YOU FINALLY DID IT","#ffffff","Poppins",42,52,"slide"]]],["Glow Up","Transformation","Before / after reveal","#18181b","#be185d",[["BEFORE","#fda4af","Anton",72,34,"fade"],["AFTER ✨","#ffffff","Anton",82,58,"pop"]]],["Motivation","Quotes","High-contrast motivation","#111827","#374151",[["NO EXCUSES.","#facc15","Anton",78,39,"pop"],["JUST START.","#ffffff","Anton",66,57,"slide"]]],["Hindi Shayari","Hindi","Poetry / status card","#312e81","#9d174d",[["कुछ बातें","#fef3c7","Poppins",62,38,"fade"],["दिल में रहती हैं…","#ffffff","Poppins",54,54,"float"]]],["Sad Aesthetic","Mood","Soft melancholic mood","#111827","#475569",[["some nights","#e2e8f0","Dancing Script",82,42,"fade"],["feel heavier.","#cbd5e1","Georgia",52,56,"float"]]],["Funny Meme","Meme","Big reaction caption","#fef08a","#fb923c",[["ME: SLEEP EARLY","#18181b","Anton",52,36,"pop"],["ME AT 3 AM 😂","#7f1d1d","Anton",50,58,"shake"]]],["Podcast Clip","Creator","Quote card for talking clips","#18181b","#581c87",[["LET ME TELL YOU","#e879f9","Anton",56,31,"slide"],["ONE IMPORTANT THING…","#ffffff","Poppins",42,47,"fade"]]],["Mini Vlog","Vlog","Daily recap title","#fef3c7","#fdba74",[["a day with me","#7c2d12","Dancing Script",78,36,"pop"],["MINI VLOG ☀","#431407","Anton",48,54,"slide"]]],["Travel Postcard","Travel","Destination title","#0f766e","#bae6fd",[["TAKE ME","#ffffff","Anton",76,38,"pop"],["SOMEWHERE NEW","#083344","Poppins",40,54,"slide"]]],["Fashion Lookbook","Fashion","Editorial clean type","#f5f5f4","#a8a29e",[["YOUR STYLE","#1c1917","Anton",74,38,"fade"],["YOUR RULES","#7f1d1d","Georgia",44,54,"slide"]]],["Product Showcase","Business","Minimal product promo","#eff6ff","#c7d2fe",[["MEET YOUR","#1e1b4b","Poppins",46,34,"fade"],["NEW FAVOURITE","#4338ca","Anton",64,49,"pop"],["AVAILABLE NOW","#312e81","Poppins",26,63,"slide"]]],["Food Reel","Food","Tasty title card","#7f1d1d","#f97316",[["GOOD FOOD","#fff7ed","Anton",82,40,"pop"],["GOOD MOOD 😋","#ffedd5","Poppins",38,57,"bounce"]]],["Study With Me","Study","Study motivation aesthetic","#164e63","#a7f3d0",[["FOCUS MODE","#ecfeff","Anton",72,39,"pop"],["one page at a time.","#083344","Dancing Script",52,57,"float"]]],["Gaming Hype","Gaming","Neon gamer intro","#09090b","#14532d",[["GAME ON","#4ade80","Anton",90,39,"shake"],["LEVEL UP ⚡","#ffffff","Anton",54,58,"pulse"]]],["Event Countdown","Event","Launch / event teaser","#4c0519","#be123c",[["COMING SOON","#ffffff","Anton",76,40,"pop"],["GET READY ✨","#fda4af","Poppins",40,57,"pulse"]]],["Birthday Wishes","Celebration","Bright celebration card","#7e22ce","#ec4899",[["HAPPY BIRTHDAY 🎂","#ffffff","Anton",58,40,"bounce"],["MAKE A WISH","#fef08a","Poppins",40,57,"pop"]]],["Bestie Memories","Friends","Friendship photo story","#fce7f3","#f9a8d4",[["MY PEOPLE","#831843","Anton",68,35,"pop"],["my safe place ♡","#9d174d","Dancing Script",56,54,"float"]]],["Quote of the Day","Quotes","Minimal daily quote","#f5f5f4","#d6d3d1",[["REMEMBER","#292524","Anton",62,36,"fade"],["small steps count.","#7c2d12","Dancing Script",68,53,"slide"]]]] as Array<[string, string, string, string, string, ViralLayerRow[]]>).map(([title, category, description, color1, color2, layerRows], index) => ({
  title, category, description,
  scene: { id: `viral-${index}`, name: title, background: `linear-gradient(135deg, ${color1}, ${color2})`, duration: 3, photoSide: index % 2 ? "left" : "right",
    layers: (layerRows as ViralLayerRow[]).map((row: ViralLayerRow, layerIndex: number) => makeLayer(`viral-${index}-${layerIndex}`, row[0], row[1], row[2], row[3], 50, row[4], row[5]))
  }
});

const ratioDimensions: Record<AspectRatio, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 }
};
const iconByPanel: Record<string, string> = { Templates: "▦", Text: "T", Characters: "✦", Media: "▧", Audio: "♫", Scenes: "▤" };
const characterPacks = [
  { title: "People", items: ["🧑‍🎤", "🧑‍🚀", "🧑‍🍳", "🧑‍🎓", "🧑‍💻", "🦸", "🧙", "🧛"] },
  { title: "Cute & Animals", items: ["🐱", "🐶", "🐼", "🦊", "🐸", "🐵", "🐰", "🐻"] },
  { title: "Fantasy & Fun", items: ["🤖", "👽", "👻", "👾", "🦄", "🐉", "🧚", "🧞"] },
  { title: "Reactions", items: ["😂", "😍", "😎", "🥳", "😱", "😭", "🤔", "😈"] },
];
const fonts = ["Anton", "Poppins", "Bebas Neue", "Dancing Script", "Caveat", "Arial", "Georgia"];

function easeOutCubic(value: number) { return 1 - Math.pow(1 - value, 3); }
function easeOutBack(value: number) { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2); }

export default function EditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const photoCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const videoCache = useRef<Map<string, HTMLVideoElement>>(new Map());
  const mediaFiles = useRef<Map<string, File>>(new Map());
  const activeVideoSceneRef = useRef<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const animationRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dragSceneId = useRef<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>(starterScenes);
  const [activeSceneId, setActiveSceneId] = useState(starterScenes[0].id);
  const [activeLayerId, setActiveLayerId] = useState(starterScenes[0].layers[0].id);
  const [selectedTarget, setSelectedTarget] = useState<"layer" | "photo">("layer");
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [panel, setPanel] = useState("Scenes");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicName, setMusicName] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [audioTrimStart, setAudioTrimStart] = useState(0);
  const [audioTrimEnd, setAudioTrimEnd] = useState(0);
  const [audioFadeIn, setAudioFadeIn] = useState(1);
  const [audioFadeOut, setAudioFadeOut] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportQuality, setExportQuality] = useState<"720p" | "1080p">("1080p");
  const [exportFps, setExportFps] = useState<30 | 60>(30);
  const [playhead, setPlayhead] = useState(0);
  const [status, setStatus] = useState("All changes are saved in this session");
  const [projectName, setProjectName] = useState("Untitled Reel");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudProjectId, setCloudProjectId] = useState<string | undefined>(undefined);
  const [voiceoverText, setVoiceoverText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [history, setHistory] = useState<ProjectState[]>([]);
  const [future, setFuture] = useState<ProjectState[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("load") !== "cloud") return;
    try {
      const raw = sessionStorage.getItem("reelmind:pending-project");
      if (!raw) return;
      const saved = JSON.parse(raw) as { id?: string; title?: string; data?: { scenes?: Scene[]; aspect?: AspectRatio } };
      if (Array.isArray(saved.data?.scenes) && saved.data.scenes.length) {
        setScenes(saved.data.scenes); setActiveSceneId(saved.data.scenes[0].id); setActiveLayerId(saved.data.scenes[0].layers?.[0]?.id ?? "");
        if (saved.data.aspect && saved.data.aspect in ratioDimensions) setAspect(saved.data.aspect);
        setProjectName(saved.title ?? "Untitled Reel"); setCloudProjectId(saved.id); setStatus("Cloud project loaded. Local media URLs may need re-uploading.");
      }
      sessionStorage.removeItem("reelmind:pending-project");
      window.history.replaceState({}, "", "/editor");
    } catch { setStatus("Could not restore cloud project data."); }
  }, []);

  const saveToCloud = async () => {
    setCloudBusy(true);
    try {
      if (!auth) throw new Error("Firebase not configured. Set NEXT_PUBLIC_FIREBASE_* variables in .env.local.");
      if (!auth.currentUser) await signInWithPopup(auth, googleProvider);
      const savedId = await saveCloudProject(projectName, { scenes, aspect, formatVersion: 1 }, cloudProjectId);
      setCloudProjectId(savedId);
      setStatus("Project saved to your cloud workspace.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Cloud save failed."); }
    finally { setCloudBusy(false); }
  };

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

  const loadVideo = useCallback((scene: Scene) => {
    if (!scene.videoUrl) return null;
    const existing = videoCache.current.get(scene.videoUrl);
    if (existing) return existing;
    const video = document.createElement("video");
    video.src = scene.videoUrl; video.preload = "auto"; video.muted = true; video.playsInline = true;
    video.addEventListener("loadedmetadata", () => { if (scene.trimStart) video.currentTime = scene.trimStart; });
    videoCache.current.set(scene.videoUrl, video);
    return video;
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
    const video = loadVideo(scene);
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const start = scene.trimStart ?? 0;
      const end = scene.trimEnd ?? video.duration;
      const target = Math.min(Math.max(start + elapsed, start), Math.max(start, end - 0.04));
      if (Math.abs(video.currentTime - target) > 0.35 && video.paused) { try { video.currentTime = target; } catch { /* Metadata may still be loading. */ } }
      try { ctx.drawImage(video, 0, 0, width, height); } catch { /* Keep the scene background until a frame is ready. */ }
    }
    const image = loadPhoto(scene);
    if (image?.complete && image.naturalWidth) {
      const maxWidth = width * 0.54;
      const maxHeight = height * 0.72;
      const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const imageWidth = image.naturalWidth * scale;
      const imageHeight = image.naturalHeight * scale;
      const imageX = scene.photoSide === "left" ? width * 0.04 : width * 0.96 - imageWidth;
      const photoScale = scene.photoScale ?? 1;
      const photoCenterX = width * ((scene.photoX ?? (scene.photoSide === "left" ? 30 : 70)) / 100);
      const photoCenterY = height * ((scene.photoY ?? 50) / 100);
      ctx.save(); ctx.globalAlpha = 0.96;
      ctx.translate(photoCenterX, photoCenterY); ctx.rotate(((scene.photoRotation ?? 0) * Math.PI) / 180); ctx.scale(photoScale, photoScale);
      ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      ctx.restore();
    } else if (!scene.photoUrl && !scene.videoUrl) {
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
      // Animate relative to this scene time, for both preview and canvas export.
      const enter = Math.min(1, Math.max(0, elapsed / 0.8));
      let alpha = 1; let offsetY = 0; let scale = 1;
      if (layer.animation === "fade") alpha = easeOutCubic(enter);
      if (layer.animation === "slide") offsetY = (1 - easeOutCubic(enter)) * height * 0.12;
      let offsetX = 0; let rotation = 0;
      if (layer.animation === "pop") scale = 0.45 + 0.55 * easeOutBack(enter);
      if (layer.animation === "bounce") offsetY += -Math.abs(Math.sin(elapsed * 7)) * height * 0.035;
      if (layer.animation === "float") offsetY += Math.sin(elapsed * 2.6) * height * 0.025;
      if (layer.animation === "spin") rotation = elapsed * Math.PI * 2;
      if (layer.animation === "shake") offsetX = Math.sin(elapsed * 24) * width * 0.012;
      if (layer.animation === "pulse") scale *= 1 + Math.sin(elapsed * 5) * 0.1;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(width * layer.x / 100 + offsetX, height * layer.y / 100 + offsetY);
      ctx.rotate(rotation + (((layer.rotation ?? 0) * Math.PI) / 180)); ctx.scale(scale * (layer.scale ?? 1), scale * (layer.scale ?? 1)); ctx.fillStyle = layer.color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const size = layer.fontSize * (width / 1080);
      ctx.font = `900 ${size}px "${layer.fontFamily}"`;
      ctx.shadowColor = "rgba(0,0,0,.24)"; ctx.shadowBlur = width / 70;
      const lines = layer.text.split("\n"); const lineHeight = size * 1.08;
      lines.forEach((line, index) => { const lineY = (index - (lines.length - 1) / 2) * lineHeight; if (layer.backgroundColor && layer.backgroundColor !== "transparent") { const metrics = ctx.measureText(line); ctx.fillStyle = layer.backgroundColor; ctx.fillRect(-metrics.width / 2 - size * 0.16, lineY - lineHeight * 0.43, metrics.width + size * 0.32, lineHeight * 0.86); ctx.fillStyle = layer.color; } if (layer.outlineWidth > 0) { ctx.lineJoin = "round"; ctx.strokeStyle = layer.outlineColor; ctx.lineWidth = layer.outlineWidth * (width / 1080); ctx.strokeText(line, 0, lineY, width * 0.88); } ctx.fillText(line, 0, lineY, width * 0.88); });
      ctx.restore();
    });
    const activeWord = scene.captions?.find(word => elapsed >= word.start && elapsed <= word.end);
    if (activeWord) {
      ctx.save(); ctx.font = `900 ${Math.max(24, width * 0.055)}px Poppins, Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const caption = activeWord.text.trim(); const captionWidth = Math.min(width * 0.9, ctx.measureText(caption).width + width * 0.08);
      ctx.fillStyle = "rgba(0,0,0,.78)"; ctx.fillRect((width-captionWidth)/2, height*0.79, captionWidth, height*0.075);
      ctx.fillStyle = "#facc15"; ctx.fillText(caption, width/2, height*0.827, width*0.86); ctx.restore();
    }
  }, [fillBackground, loadPhoto, loadVideo]);

  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || isPlaying || isExporting) return;
    drawScene(activeScene, 1, ctx, canvas.width, canvas.height);
  }, [activeScene, aspect, drawScene, isExporting, isPlaying]);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    audio.volume = musicVolume;
    const syncAudio = () => {
      if (audioTrimEnd > audioTrimStart && audio.currentTime >= audioTrimEnd) audio.currentTime = audioTrimStart;
      const fadeUp = audioFadeIn > 0 ? Math.min(1, Math.max(0, (audio.currentTime - audioTrimStart) / audioFadeIn)) : 1;
      const fadeDown = audioFadeOut > 0 && audioTrimEnd > audioTrimStart ? Math.min(1, Math.max(0, (audioTrimEnd - audio.currentTime) / audioFadeOut)) : 1;
      audio.volume = musicVolume * Math.min(fadeUp, fadeDown);
    };
    audio.addEventListener("timeupdate", syncAudio);
    return () => audio.removeEventListener("timeupdate", syncAudio);
  }, [musicUrl, musicVolume, audioTrimStart, audioTrimEnd, audioFadeIn, audioFadeOut]);

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
  const addCharacter = (character: string, animation: AnimationName = "bounce") => {
    const id = `character-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    remember();
    setScenes((items) => items.map((scene) => scene.id === activeSceneId ? { ...scene, layers: [...scene.layers, makeLayer(id, character, "#ffffff", "Arial", 116, 50, 55, animation)] } : scene));
    setActiveLayerId(id);
    setPanel("Characters");
    setStatus(`${character} character added. Press Play to preview its animation.`);
  };
  const handleVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("video/") && !/\\.(mp4|mov|webm)$/i.test(file.name)) { setStatus("Choose an MP4, MOV or WebM video."); return; }
    if (file.size > 500 * 1024 * 1024) { setStatus("Video is over the 500 MB local import limit."); return; }
    const url = URL.createObjectURL(file);
    mediaFiles.current.set(activeSceneId, file);
    remember();
    setScenes(items => items.map(scene => scene.id === activeSceneId ? { ...scene, videoUrl: url, videoName: file.name, trimStart: 0, trimEnd: undefined } : scene));
    const video = document.createElement("video"); video.src = url; video.preload = "metadata"; video.onloadedmetadata = () => setScenes(items => items.map(scene => scene.id === activeSceneId ? { ...scene, duration: Math.max(0.5, Math.min(30, video.duration || 3)), trimEnd: video.duration } : scene)); videoCache.current.set(url, video);
    setStatus(`Video imported: ${file.name}. Set trim points in Media.`);
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file); const image = new Image();
    image.onload = () => {
      photoCache.current.set(url, image);
      setScenes((items) => items.map((scene) => scene.id === activeSceneId ? { ...scene } : scene));
    };
    image.onerror = () => setStatus("Photo load nahi hui. JPG, PNG ya WEBP file try karein.");
    image.src = url;
    patchScene({ photoUrl: url, photoName: file.name });
  };
  const generateCaptions = async () => {
    const file = mediaFiles.current.get(activeSceneId);
    if (!file) { setStatus("First import a video or upload an audio file for this scene."); return; }
    setAiBusy(true); setStatus("Generating word-timed captions…");
    try { const form = new FormData(); form.set("file", file); const response = await fetch("/api/captions", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Caption generation failed");
      const words = Array.isArray(data.words) ? data.words as CaptionWord[] : [];
      if (!words.length) throw new Error("No word timestamps returned. Try a clearer audio/video file.");
      remember(); setScenes(items => items.map(scene => scene.id === activeSceneId ? { ...scene, captions: words } : scene)); setStatus(`Generated ${words.length} timed words. Captions appear during preview and export.`);
    } catch(error) { setStatus(error instanceof Error ? error.message : "Caption generation failed."); }
    finally { setAiBusy(false); }
  };
  const generateVoiceover = async () => {
    if (!voiceoverText.trim()) { setStatus("Enter voiceover text first."); return; }
    setAiBusy(true); setStatus("Generating AI voiceover…");
    try { const response = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: voiceoverText }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "TTS failed");
      const binary = atob(data.audioBase64); const bytes = new Uint8Array(binary.length); for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: data.mimeType ?? "audio/wav" })); if(musicUrl) URL.revokeObjectURL(musicUrl); setMusicUrl(url); setMusicName("AI voiceover.wav"); setStatus("AI voiceover generated and loaded as the current audio track.");
    } catch(error) { setStatus(error instanceof Error ? error.message : "Voiceover generation failed."); }
    finally { setAiBusy(false); }
  };

  const handleMusic = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    mediaFiles.current.set(activeSceneId, file);
    const nextUrl = URL.createObjectURL(file);
    setMusicUrl(nextUrl); setMusicName(file.name); setDownloadUrl("");
    setStatus(`Music loaded: ${file.name}. Preview ke liye Play dabayein.`);
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

  const syncSceneVideo = (scene: Scene, elapsed: number) => {
    if (activeVideoSceneRef.current !== scene.id) {
      videoCache.current.forEach(video => video.pause());
      activeVideoSceneRef.current = scene.id;
      const video = loadVideo(scene);
      if (video) { const start = scene.trimStart ?? 0; try { video.currentTime = start; } catch { /* Wait for metadata. */ } void video.play().catch(() => setStatus("Browser could not play this video. Try a supported MP4 or WebM file.")); }
    }
    const video = loadVideo(scene);
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const trimEnd = scene.trimEnd ?? video.duration;
      if (trimEnd > 0 && video.currentTime >= trimEnd) { video.pause(); try { video.currentTime = Math.max(scene.trimStart ?? 0, trimEnd - 0.04); } catch { /* Ignore until metadata is ready. */ } }
      else if (video.paused) void video.play().catch(() => undefined);
    }
  };

  const stopPlayback = () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    videoCache.current.forEach(video => video.pause()); activeVideoSceneRef.current = null;
    const audio = previewAudioRef.current;
    if (audio) { audio.pause(); audio.currentTime = audioTrimStart; }
    setIsPlaying(false);
  };
  const playPreview = () => {
    if (isPlaying) { stopPlayback(); return; }
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    setIsPlaying(true);
    const audio = previewAudioRef.current;
    if (audio && musicUrl) { audio.volume = musicVolume; audio.currentTime = audioTrimStart; void audio.play().catch(() => setStatus("Browser ne music playback roka. Audio panel se Play dabakar allow karein.")); }
    const started = performance.now();
    const frame = (now: number) => {
      const elapsed = (now - started) / 1000;
      if (elapsed >= totalDuration) { setPlayhead(0); stopPlayback(); return; }
      setPlayhead(elapsed);
      let remaining = elapsed; let scene = scenes[0];
      for (const item of scenes) { scene = item; if (remaining < item.duration) break; remaining -= item.duration; }
      syncSceneVideo(scene, remaining);
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
    let stream: MediaStream | undefined;
    let renderCanvas: HTMLCanvasElement | undefined;
    let audioContext: AudioContext | undefined;
    let audioSource: MediaElementAudioSourceNode | undefined;
    let audioGain: GainNode | undefined;
    let musicElement: HTMLAudioElement | undefined;
    let recorder: MediaRecorder | undefined;
    try {
      const exportCanvas = document.createElement("canvas");
      renderCanvas = exportCanvas;
      const base = exportQuality === "720p" ? 720 : 1080;
      exportCanvas.width = aspect === "16:9" ? Math.round(base * 16 / 9) : base;
      exportCanvas.height = aspect === "9:16" ? Math.round(base * 16 / 9) : aspect === "16:9" ? base : base;
      stream = exportCanvas.captureStream(exportFps);
      if (!stream) throw new Error("Could not capture export canvas.");
      if (musicUrl) {
        audioContext = new AudioContext(); musicElement = new Audio(musicUrl); musicElement.loop = false; musicElement.currentTime = audioTrimStart;
        audioSource = audioContext.createMediaElementSource(musicElement); audioGain = audioContext.createGain(); audioGain.gain.value = 0;
        audioSource.connect(audioGain);
        const destination = audioContext.createMediaStreamDestination();
        audioGain.connect(destination); audioGain.connect(audioContext.destination);
        musicElement.ontimeupdate = () => { if (audioTrimEnd > audioTrimStart && musicElement && musicElement.currentTime >= audioTrimEnd) musicElement.currentTime = audioTrimStart; };
        destination.stream.getAudioTracks().forEach((track) => stream?.addTrack(track));
        await audioContext.resume();
      }
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      recorder = new MediaRecorder(stream, { mimeType }); recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      const activeRecorder = recorder;
      const recorded = new Promise<Blob>((resolve, reject) => { activeRecorder.onerror = () => reject(new Error("Browser recording failed.")); activeRecorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "video/webm" })); });
      await musicElement?.play().catch(() => setStatus("Music autoplay block hua; export bina music ke ho sakta hai."));
      recorder.start(250);
      const ctx = exportCanvas.getContext("2d"); if (!ctx) throw new Error("Export canvas context unavailable.");
      const started = performance.now();
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          const elapsed = (now - started) / 1000;
          if (audioGain) { const fadeUp = audioFadeIn > 0 ? Math.min(1, elapsed / audioFadeIn) : 1; const remaining = totalDuration - elapsed; const fadeDown = audioFadeOut > 0 ? Math.min(1, remaining / audioFadeOut) : 1; audioGain.gain.value = musicVolume * Math.max(0, Math.min(fadeUp, fadeDown)); }
          setProgress(Math.min(60, Math.round(elapsed / totalDuration * 60))); setPlayhead(Math.min(elapsed, totalDuration));
          if (elapsed >= totalDuration) { resolve(); return; }
          let remaining = elapsed; let scene = scenes[0];
          for (const item of scenes) { scene = item; if (remaining < item.duration) break; remaining -= item.duration; }
          syncSceneVideo(scene, remaining);
          drawScene(scene, remaining, ctx, exportCanvas.width, exportCanvas.height);
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      recorder.stop(); const webmBlob = await recorded;
      stream.getTracks().forEach((track) => track.stop()); stream = undefined;
      musicElement?.pause(); audioSource?.disconnect(); await audioContext?.close(); audioContext = undefined;
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
      console.error(error);
      setStatus(`Export error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream?.getTracks().forEach((track) => track.stop());
      musicElement?.pause();
      audioSource?.disconnect();
      if (audioContext && audioContext.state !== "closed") await audioContext.close().catch(() => undefined);
      recorderRef.current = null;
      setIsExporting(false);
    }
  };

  const canvasStyle: CSSProperties = { aspectRatio: aspect.replace(":", " / "), width: `min(100%, ${Math.round(560 * dimensions.width / dimensions.height)}px)`, height: `min(100%, 560px)` };
  const openPanel = (name: string) => { setPanel(name); setMobilePanelOpen(true); };

  return (
    <main className="editor-shell min-h-screen text-white">
      <header className="editor-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Back to home" className="editor-logo">R</Link>
          <div className="min-w-0"><div className="truncate text-sm font-extrabold tracking-tight">ReelMind <span className="text-fuchsia-300">AI</span></div><input aria-label="Project name" value={projectName} onChange={(e) => setProjectName(e.target.value.slice(0,120))} className="mt-1 w-36 bg-transparent text-[10px] text-zinc-400 outline-none sm:w-48" /></div>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="aspectRatio">Canvas ratio</label>
          <select id="aspectRatio" value={aspect} onChange={(e) => { remember(); setAspect(e.target.value as AspectRatio); }} className="editor-select hidden sm:block"><option>9:16</option><option>1:1</option><option>16:9</option></select>
          <button title="Undo" onClick={undo} disabled={!history.length} className="editor-tool-btn">↶</button>
          <button title="Redo" onClick={redo} disabled={!future.length} className="editor-tool-btn">↷</button>
          <Link href="/projects" className="hidden rounded-lg border border-white/10 px-3 py-2 text-xs sm:inline-flex">Projects</Link><button onClick={saveToCloud} disabled={cloudBusy} className="rounded-lg border border-fuchsia-300/20 px-3 py-2 text-xs text-fuchsia-100 disabled:opacity-50">{cloudBusy ? "Saving…" : "Save cloud"}</button><select aria-label="Export resolution" value={exportQuality} onChange={e=>setExportQuality(e.target.value as "720p"|"1080p")} className="editor-select hidden lg:block"><option value="720p">720p</option><option value="1080p">1080p</option></select><select aria-label="Export frame rate" value={exportFps} onChange={e=>setExportFps(Number(e.target.value) as 30|60)} className="editor-select hidden lg:block"><option value={30}>30 FPS</option><option value={60}>60 FPS</option></select><button onClick={generateVideo} disabled={isExporting || isPlaying} className="editor-export">{isExporting ? "Exporting…" : "↥ Export"}</button>
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
              <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-3"><b className="text-sm">20+ full-reel templates</b><p className="mt-1 text-xs leading-5 text-zinc-400">Har template mein Hook → Main moment → Outro/CTA scenes load honge. Apna text, character, photo aur music customize karo.</p></div>
              {viralTemplates.map((template, index) => <button key={template.title} onClick={() => applyTemplate(buildFullReel(template.scene))} className="template-tile w-full text-left">
                <span className="template-swatch flex items-center justify-center text-center text-[11px] font-black leading-tight" style={{ background: template.scene.background, color: template.scene.layers[0]?.color ?? "#fff" }}>{template.scene.layers.slice(0, 2).map((layer) => layer.text).join("\n")}</span>
                <span className="min-w-0"><b>{String(index + 1).padStart(2, "0")}. {template.title}</b><small>{template.category} · {template.description}</small></span>
              </button>)}
              <button onClick={() => applyTemplate(starterScenes)} className="template-tile w-full text-left"><span className="template-swatch bg-gradient-to-br from-rose-950 via-rose-800 to-orange-100">HEY<br />Guys</span><span><b>Classic reaction · 3 scenes</b><small>Original multi-scene starter project</small></span></button>
              <p className="text-xs leading-5 text-zinc-500">Trend-inspired original layouts, not a guarantee of virality. Use your own or licensed photos, clips and audio.</p>
            </div>}{panel === "Text" && <div className="space-y-3"><button onClick={addText} className="editor-secondary w-full">＋ Add text layer</button>{activeScene.layers.map((layer) => <button key={layer.id} onClick={() => setActiveLayerId(layer.id)} className={`layer-list-item ${activeLayerId === layer.id ? "selected" : ""}`}><span className="font-bold">T</span><span className="truncate text-left">{layer.text.replaceAll("\n", " ") || "Text layer"}</span></button>)}</div>}
            {panel === "Characters" && <div className="space-y-4"><div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-3"><b className="text-sm">Animated characters</b><p className="mt-1 text-xs leading-5 text-zinc-400">Choose a character to add it to the active scene. Select it, choose an animation, then press Play.</p></div>{characterPacks.map((pack) => <section key={pack.title}><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">{pack.title}</h3><div className="grid grid-cols-4 gap-2">{pack.items.map((character) => <button key={character} title={`Add ${character}`} onClick={() => addCharacter(character)} className="flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-2xl transition hover:border-fuchsia-400/60 hover:bg-fuchsia-400/10">{character}</button>)}</div></section>)}</div>}
            {panel === "Media" && <div className="space-y-4"><p className="text-xs leading-5 text-zinc-400">Add a video clip or photo to this scene. Local media remains in this browser session.</p><label className="upload-box"><span className="text-2xl">▶</span><b>Import video clip</b><small>MP4, MOV, WEBM · max 500 MB</small><input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={handleVideo} className="sr-only" /></label>{activeScene.videoName && <div className="rounded-xl border border-fuchsia-300/20 p-3 text-xs"><b className="block break-all">{activeScene.videoName}</b><div className="mt-3"><label className="label">Trim start · {(activeScene.trimStart ?? 0).toFixed(1)}s</label><input className="editor-range" type="range" min="0" max={Math.max(0.5, activeScene.trimEnd ?? activeScene.duration)} step="0.1" value={activeScene.trimStart ?? 0} onChange={e=>patchScene({trimStart:Math.min(Number(e.target.value),Math.max(0,(activeScene.trimEnd??activeScene.duration)-0.1))})}/></div><div className="mt-3"><label className="label">Trim end · {(activeScene.trimEnd ?? activeScene.duration).toFixed(1)}s</label><input className="editor-range" type="range" min={Math.max(0.1,activeScene.trimStart??0)+0.1} max={Math.max(0.5,videoCache.current.get(activeScene.videoUrl??"")?.duration??activeScene.duration)} step="0.1" value={activeScene.trimEnd ?? activeScene.duration} onChange={e=>patchScene({trimEnd:Math.max((activeScene.trimStart??0)+0.1,Number(e.target.value))})}/></div><button onClick={()=>{patchScene({videoUrl:undefined,videoName:undefined,trimStart:undefined,trimEnd:undefined});setStatus("Video removed.");}} className="mt-3 text-rose-300">Remove video</button></div>}<label className="upload-box"><span className="text-2xl">＋</span><b>Upload photo</b><small>PNG, JPG, WEBP</small><input type="file" accept="image/*" onChange={handlePhoto} className="sr-only" /></label>{activeScene.photoName && <div className="rounded-xl bg-white/5 p-3 text-xs text-zinc-300">{activeScene.photoName}<button onClick={() => patchScene({ photoUrl: undefined, photoName: undefined })} className="float-right text-rose-300">Remove</button></div>}<label className="label mt-4">Photo placement</label><select className="editor-select w-full" value={activeScene.photoSide ?? "right"} onChange={(e) => patchScene({ photoSide: e.target.value as Scene["photoSide"] })}><option value="left">Left side</option><option value="right">Right side</option></select></div>}
            {panel === "Audio" && <div className="space-y-4"><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="mb-2 flex items-center gap-2"><span className="text-xl text-fuchsia-300">♫</span><div><b className="block text-sm">Music track</b><small className="text-xs text-zinc-500">Local audio file</small></div></div><label className="upload-box"><span className="text-2xl">＋</span><b>Upload audio</b><small>MP3, WAV, M4A (browser support varies)</small><input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" onChange={handleMusic} className="sr-only" /></label>{musicName && <><p className="mt-3 break-all text-xs text-zinc-300">{musicName}</p><audio key={musicUrl} src={musicUrl} controls preload="metadata" className="mt-3 w-full" onLoadedMetadata={e=>{if(!audioTrimEnd) setAudioTrimEnd(e.currentTarget.duration||0);e.currentTarget.volume=musicVolume;}} onTimeUpdate={e=>{const a=e.currentTarget;if(audioTrimEnd>audioTrimStart&&a.currentTime>=audioTrimEnd)a.currentTime=audioTrimStart;const up=audioFadeIn>0?Math.min(1,Math.max(0,(a.currentTime-audioTrimStart)/audioFadeIn)):1;const down=audioFadeOut>0&&audioTrimEnd>audioTrimStart?Math.min(1,Math.max(0,(audioTrimEnd-a.currentTime)/audioFadeOut)):1;a.volume=musicVolume*Math.min(up,down);}} /></>}<div className="mt-4 space-y-3"><label className="label">Volume · {Math.round(musicVolume*100)}%</label><input className="editor-range" type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={e=>setMusicVolume(Number(e.target.value))}/><label className="label">Audio trim start · {audioTrimStart.toFixed(1)}s</label><input className="editor-range" type="range" min="0" max={Math.max(1,audioTrimEnd||60)} step="0.1" value={audioTrimStart} onChange={e=>setAudioTrimStart(Math.min(Number(e.target.value),Math.max(0,audioTrimEnd-0.1)))}/><label className="label">Audio trim end · {audioTrimEnd.toFixed(1)}s</label><input className="editor-range" type="range" min={Math.max(0.1,audioTrimStart+0.1)} max={Math.max(1,previewAudioRef.current?.duration||audioTrimEnd||60)} step="0.1" value={audioTrimEnd||1} onChange={e=>setAudioTrimEnd(Number(e.target.value))}/><div className="grid grid-cols-2 gap-3"><label className="label">Fade in · {audioFadeIn}s<input className="editor-range mt-2" type="range" min="0" max="5" step="0.5" value={audioFadeIn} onChange={e=>setAudioFadeIn(Number(e.target.value))}/></label><label className="label">Fade out · {audioFadeOut}s<input className="editor-range mt-2" type="range" min="0" max="5" step="0.5" value={audioFadeOut} onChange={e=>setAudioFadeOut(Number(e.target.value))}/></label></div></div><button onClick={generateCaptions} disabled={aiBusy} className="editor-secondary mt-4 w-full disabled:opacity-50">{aiBusy?"Processing…":"Generate word-timed captions"}</button><label className="label mt-4">AI voiceover text</label><textarea className="editor-input min-h-20" value={voiceoverText} onChange={e=>setVoiceoverText(e.target.value)} maxLength={4000} placeholder="Type the narration to speak…"/><button onClick={generateVoiceover} disabled={aiBusy||!voiceoverText.trim()} className="editor-secondary w-full disabled:opacity-50">Generate AI voiceover</button></div><p className="text-xs leading-5 text-zinc-500">AI services require configured provider keys and may incur usage charges. Use only media you own or are licensed to use.</p></div>}
            {panel === "Scenes" && <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-xs text-zinc-500">{scenes.length} frames</span><button onClick={addScene} className="editor-secondary">＋ Add scene</button></div>
              {scenes.map((scene, index) => <motion.div layout key={scene.id} className={`scene-card ${scene.id === activeSceneId ? "selected" : ""}`}>
                <button draggable onDragStart={() => { dragSceneId.current = scene.id; }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => reorderScene(e, scene.id)} onClick={() => { setActiveSceneId(scene.id); setActiveLayerId(scene.layers[0]?.id ?? ""); }} className="w-full text-left">
                  <div className="flex items-center gap-3"><span className="drag-handle">⠿</span><span className="scene-number">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 truncate text-xs font-bold">{scene.name}</span><span className="text-[10px] text-zinc-500">{scene.duration}s</span></div>
                  <div className="scene-mini-preview mt-3" style={{ background: scene.background }}>{scene.photoUrl && <span className="absolute inset-y-0 left-0 w-1/3 bg-white/20" />}{scene.layers.map((layer) => <span key={layer.id} style={{ color: layer.color, fontFamily: layer.fontFamily }} className="relative z-10 block truncate text-center font-black">{layer.text.replaceAll("\n", " ")}</span>)}</div>
                </button>
                <div className="mt-3 flex items-center gap-2"><label className="text-[10px] text-zinc-500">Trim / duration</label><input aria-label={`Scene ${index + 1} duration`} type="number" min="0.5" max="30" step="0.5" value={scene.duration} onChange={(e) => { const value = Math.min(30, Math.max(0.5, Number(e.target.value) || 0.5)); remember(); setScenes((items) => items.map((item) => item.id === scene.id ? { ...item, duration: value } : item)); }} className="editor-duration" /><span className="text-[10px] text-zinc-500">sec</span><button aria-label="Duplicate scene" onClick={() => { const copy = { ...scene, id: `scene-${Date.now()}`, name: `${scene.name} copy`, layers: scene.layers.map((layer) => ({ ...layer, id: `layer-${Date.now()}-${Math.random().toString(36).slice(2,6)}` })) }; remember(); setScenes((items) => [...items.slice(0, index + 1), copy, ...items.slice(index + 1)]); setStatus("Scene duplicated."); }} className="ml-auto text-xs text-violet-200 hover:text-white">Duplicate</button><button aria-label="Delete scene" onClick={() => deleteScene(scene.id)} disabled={scenes.length === 1} className="text-xs text-zinc-500 hover:text-rose-300 disabled:opacity-20">Delete ×</button></div>
                <div className="mt-3"><label className="sr-only" htmlFor={`scene-name-${scene.id}`}>Scene title</label><input id={`scene-name-${scene.id}`} className="editor-input" value={scene.name} onChange={(e) => { const name = e.target.value; setScenes((items) => items.map((item) => item.id === scene.id ? { ...item, name } : item)); }} placeholder="Scene name" /></div>
              </motion.div>)}
            </div>}
          </div>
        </aside>

        <section className="editor-stage">
          <div className="stage-toolbar"><div><span className="text-xs font-bold text-zinc-300">Preview</span><span className="ml-2 text-[10px] text-zinc-600">{dimensions.width} × {dimensions.height}</span></div><div className="flex items-center gap-2"><select aria-label="Canvas ratio" value={aspect} onChange={(e) => { remember(); setAspect(e.target.value as AspectRatio); }} className="editor-select sm:hidden"><option>9:16</option><option>1:1</option><option>16:9</option></select><span className="hidden rounded-md bg-white/5 px-2 py-1 text-[10px] text-zinc-500 sm:inline">{aspect}</span><button onClick={playPreview} disabled={isExporting} className="editor-play">{isPlaying ? "Ⅱ Pause" : "▶ Play"}</button></div></div>
          <div className="stage-canvas-area"><div className="stage-glow" /><div className="stage-canvas-wrap relative" style={canvasStyle}><canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="h-full w-full rounded-lg object-contain" aria-label="Video canvas preview" /><InteractiveCanvasOverlay layers={activeScene.layers} canvasWidth={dimensions.width} canvasHeight={dimensions.height} activeLayerId={selectedTarget === "photo" ? "__photo__" : activeLayerId} photoName={activeScene.photoName} photoSide={activeScene.photoSide} photoTransform={{ x: activeScene.photoX ?? (activeScene.photoSide === "left" ? 30 : 70), y: activeScene.photoY ?? 50, scale: activeScene.photoScale ?? 1, rotation: activeScene.photoRotation ?? 0 }} onSelectLayer={(id) => { setSelectedTarget("layer"); setActiveLayerId(id); }} onTransformLayer={(id, patch) => { setScenes((items) => items.map((scene) => scene.id !== activeSceneId ? scene : { ...scene, layers: scene.layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer) })); setDownloadUrl(""); }} onSelectPhoto={() => setSelectedTarget("photo")} onGestureStart={remember} onTransformPhoto={(patch) => { setSelectedTarget("photo"); setScenes((items) => items.map((scene) => scene.id === activeSceneId ? { ...scene, photoX: patch.x, photoY: patch.y, photoScale: patch.scale, photoRotation: patch.rotation } : scene)); setDownloadUrl(""); }} disabled={isPlaying || isExporting} /></div></div>
          <div className="stage-footnote"><span>◉ Browser preview</span><span>Drag layers to move · corner handle to scale · top handle to rotate</span></div>
        </section>

        <aside className={`editor-properties ${mobilePanelOpen && panel === "Properties" ? "mobile-properties-open" : ""}`}>
          <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-fuchsia-300">Inspector</p><h2 className="mt-1 text-base font-bold">Properties</h2></div>
          <div className="space-y-5">
            <div><label className="label">Selected layer</label><select className="editor-select w-full" value={activeLayer.id} onChange={(e) => setActiveLayerId(e.target.value)}>{activeScene.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.text || "Text layer"}</option>)}</select></div>
            <div><label className="label" htmlFor="layerText">Text content</label><textarea id="layerText" className="editor-input min-h-20 resize-y" value={activeLayer.text} onChange={(e) => patchLayer({ text: e.target.value })} /></div>
            <div><label className="label" htmlFor="layerFont">Font family</label><select id="layerFont" className="editor-select w-full" value={activeLayer.fontFamily} onChange={(e) => patchLayer({ fontFamily: e.target.value })}>{fonts.map((font) => <option key={font}>{font}</option>)}</select></div>
            <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="layerSize">Font size</label><span className="text-xs text-zinc-400">{activeLayer.fontSize}px</span></div><input id="layerSize" className="editor-range" type="range" min="18" max="180" value={activeLayer.fontSize} onChange={(e) => patchLayer({ fontSize: Number(e.target.value) })} /></div>
            <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="layerScale">Zoom / scale</label><span className="text-xs text-zinc-400">{(activeLayer.scale ?? 1).toFixed(2)}×</span></div><input id="layerScale" className="editor-range" type="range" min="0.25" max="3" step="0.05" value={activeLayer.scale ?? 1} onChange={(e) => patchLayer({ scale: Number(e.target.value) })} /><p className="mt-1 text-[10px] text-zinc-500">Character ya text ko bada/chhota karne ke liye.</p></div>
            <div><label className="label" htmlFor="textOutline">Text outline</label><div className="mt-2 flex items-center gap-3"><input id="textOutline" type="color" value={activeLayer.outlineColor ?? "#111111"} onChange={(e) => patchLayer({ outlineColor: e.target.value })} className="h-9 w-11 rounded-lg border-0 bg-transparent" /><input aria-label="Outline thickness" type="range" min="0" max="12" value={activeLayer.outlineWidth ?? 0} onChange={(e) => patchLayer({ outlineWidth: Number(e.target.value) })} className="editor-range" /><span className="text-xs text-zinc-400">{activeLayer.outlineWidth ?? 0}px</span></div></div>
            <div><label className="label" htmlFor="textBackground">Text background</label><div className="mt-2 flex items-center gap-3"><select id="textBackground" className="editor-select flex-1" value={activeLayer.backgroundColor ?? "transparent"} onChange={(e) => patchLayer({ backgroundColor: e.target.value })}><option value="transparent">None</option><option value="#000000">Black</option><option value="#ffffff">White</option><option value="#7c3aed">Purple</option><option value="#db2777">Pink</option><option value="#facc15">Yellow</option><option value="#0f766e">Teal</option></select><span className="text-[10px] text-zinc-500">Caption box</span></div></div>
            <div><label className="label" htmlFor="layerColor">Text colour</label><div className="flex items-center gap-3"><input id="layerColor" type="color" value={activeLayer.color} onChange={(e) => patchLayer({ color: e.target.value })} className="h-9 w-11 rounded-lg border-0 bg-transparent" /><span className="text-xs text-zinc-400">{activeLayer.color}</span></div></div>
            <div><label className="label" htmlFor="layerAnimation">Animation</label><select id="layerAnimation" className="editor-select w-full" value={activeLayer.animation} onChange={(e) => patchLayer({ animation: e.target.value as AnimationName })}><option value="fade">Fade in</option><option value="slide">Slide up</option><option value="pop">Pop</option><option value="bounce">Bounce loop</option><option value="float">Float loop</option><option value="spin">Spin loop</option><option value="shake">Shake loop</option><option value="pulse">Pulse loop</option></select></div>
            <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="layerX">Horizontal position</label><span className="text-xs text-zinc-400">{activeLayer.x}%</span></div><input id="layerX" className="editor-range" type="range" min="5" max="95" value={activeLayer.x} onChange={(e) => patchLayer({ x: Number(e.target.value) })} /></div>
            <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="layerY">Vertical position</label><span className="text-xs text-zinc-400">{activeLayer.y}%</span></div><input id="layerY" className="editor-range" type="range" min="5" max="95" value={activeLayer.y} onChange={(e) => patchLayer({ y: Number(e.target.value) })} /></div>
            <button onClick={() => { remember(); setScenes((items) => items.map((scene) => scene.id === activeSceneId ? { ...scene, layers: scene.layers.filter((layer) => layer.id !== activeLayerId) } : scene)); const nextLayer = activeScene.layers.find((layer) => layer.id !== activeLayerId); setActiveLayerId(nextLayer?.id ?? ""); }} disabled={activeScene.layers.length <= 1} className="w-full rounded-xl border border-rose-300/20 px-3 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-300/5 disabled:opacity-30">Delete selected text layer</button>
          </div>
        </aside>
      </div>

      {musicUrl && <audio ref={previewAudioRef} src={musicUrl} preload="auto" loop className="hidden" />}
      <section className="editor-timeline">
        <div className="timeline-head"><div><h2 className="text-sm font-bold">Timeline</h2><p className="mt-1 text-[10px] text-zinc-500">{totalDuration}s total · {scenes.length} scenes</p></div><div className="flex items-center gap-2"><button onClick={addScene} className="editor-secondary">＋ Scene</button><button onClick={playPreview} className="editor-tool-btn">{isPlaying ? "Ⅱ" : "▶"}</button></div></div>
        <div className="timeline-ruler"><span>00:00</span><span>{Math.floor(totalDuration / 2)}s</span><span>{totalDuration}s</span></div>
        <div className="timeline-track-wrap">
          <div className="timeline-track">
            {scenes.map((scene, index) => <button draggable key={scene.id} onDragStart={() => { dragSceneId.current = scene.id; }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => reorderScene(e, scene.id)} onClick={() => { setActiveSceneId(scene.id); setActiveLayerId(scene.layers[0]?.id ?? ""); let before = 0; for (let i = 0; i < index; i++) before += scenes[i].duration; setPlayhead(before); }} style={{ flex: `${scene.duration} 1 0%`, background: scene.background }} className={`timeline-scene ${scene.id === activeSceneId ? "active" : ""}`}><span className="timeline-scene-number">{index + 1}</span><span className="timeline-scene-text">{scene.layers.map((layer) => layer.text).join(" · ")}</span><span className="timeline-scene-duration">{scene.duration}s</span></button>)}
            <div className="playhead" style={{ left: `${Math.min(100, playhead / Math.max(totalDuration, 1) * 100)}%` }}><span /></div>
          </div>
          <div className="audio-track"><span className="audio-track-label">▶ Video · {scenes.filter(scene=>scene.videoName).length ? scenes.filter(scene=>scene.videoName).map(scene=>scene.videoName).join(", ") : "Import a clip from Media"}</span></div><div className="audio-track"><span className="audio-track-label">T Text overlays · {scenes.reduce((n,scene)=>n+scene.layers.length,0)} layers</span></div><div className="audio-track"><span className="audio-track-label">♫ {musicName || "Music track — upload audio"}</span>{musicUrl && <span className="audio-wave">▂▅▃▇▅▂▆▃▅▇▂▅▃▆▅▂▇▃▅▂▆▃▅▇▂▅▃▆▅▂▇▃▅▂▆▃▅▇</span>}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-600"><span>{status}</span>{isExporting && <span>{progress}%</span>}{downloadUrl && <a href={downloadUrl} download="reelmind-reel.mp4" className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200">↓ Download MP4</a>}</div>
        {isExporting && <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all" style={{ width: `${progress}%` }} /></div>}
      </section>
      <nav className="mobile-bottom-nav">{[...Object.keys(iconByPanel), "Properties"].map((name) => <button key={name} onClick={() => openPanel(name)} className={panel === name ? "active" : ""}><span>{name === "Properties" ? "⚙" : iconByPanel[name]}</span><small>{name}</small></button>)}</nav>
      <AnimatePresence>{mobilePanelOpen && <motion.button aria-label="Close tools panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobilePanelOpen(false)} className="mobile-scrim" />}</AnimatePresence>
    </main>
  );
}
