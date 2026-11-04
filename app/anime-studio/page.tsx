"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Character = { id: string; name: string; role: string; outfit: string; voice: string; image?: string };
type StoryScene = { id: string; title: string; speakerId: string; dialogue: string; duration: number; backgroundImage?: string; audioUrl?: string; audioName?: string };
const starterCharacters: Character[] = [
  { id: "shubham", name: "Shubham", role: "The Realist", outfit: "Black hoodie · messy black hair", voice: "ElevenLabs voice ID goes here" },
  { id: "aman", name: "Aman", role: "The Dreamer", outfit: "Cream hoodie · fluffy black hair", voice: "ElevenLabs voice ID goes here" },
  { id: "kabir", name: "Kabir", role: "The Deep Thinker", outfit: "Olive-green shirt · black glasses", voice: "ElevenLabs voice ID goes here" },
  { id: "priya", name: "Priya", role: "The Straight Talker", outfit: "Pink sweater · long dark hair", voice: "ElevenLabs voice ID goes here" },
  { id: "guest", name: "Fifth character", role: "Custom character", outfit: "Set the look and outfit", voice: "Optional ElevenLabs voice ID" },
];
const starterScenes: StoryScene[] = [
  { id: "s1", title: "Hook", speakerId: "shubham", dialogue: "Bhai, kabhi-kabhi lagta hai... hum apne liye jee bhi rahe hain ya sirf zimmedariyan nibha rahe hain?", duration: 6 },
  { id: "s2", title: "Hope", speakerId: "aman", dialogue: "Arey bhai, ek din sab theek hoga. Apne bhi sapne poore honge.", duration: 6 },
  { id: "s3", title: "Deep thought", speakerId: "kabir", dialogue: "Bas farq itna hai... kuch log sapne poore karne ke liye jeete hain, aur kuch sapne poore karne se pehle ghar sambhalte hain.", duration: 8 },
  { id: "s4", title: "Truth", speakerId: "priya", dialogue: "Lekin ek baat yaad rakhna... apno ke liye jeete-jeete khud ko khona mat.", duration: 7 },
  { id: "s5", title: "Ending", speakerId: "group", dialogue: "Khud ke liye jeena bhi zaroori hai.", duration: 3 },
];
const DB = "reelmind-anime-studio";
const STORE = "project";
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function readProject(): Promise<{ characters: Character[]; scenes: StoryScene[] } | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get("active");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
async function writeProject(value: { characters: Character[]; scenes: StoryScene[] }) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, "active");
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read file."));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function AnimeStudioPage() {
  const [characters, setCharacters] = useState(starterCharacters);
  const [scenes, setScenes] = useState(starterScenes);
  const [activeCharacter, setActiveCharacter] = useState("shubham");
  const [activeScene, setActiveScene] = useState("s1");
  const [tab, setTab] = useState<"characters" | "story" | "audio">("story");
  const [status, setStatus] = useState("Your story project is ready.");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [wind, setWind] = useState(true);
  const [moon, setMoon] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = scenes.find((scene) => scene.id === activeScene) ?? scenes[0];
  const selectedCharacter = characters.find((character) => character.id === activeCharacter) ?? characters[0];
  const currentSpeaker = characters.find((character) => character.id === active.speakerId);
  const totalDuration = useMemo(() => scenes.reduce((sum, scene) => sum + scene.duration, 0), [scenes]);

  useEffect(() => {
    let live = true;
    readProject().then((project) => {
      if (!live || !project) return;
      setCharacters(project.characters?.length ? project.characters : starterCharacters);
      setScenes(project.scenes?.length ? project.scenes : starterScenes);
      setStatus("Restored your saved Anime Story Studio project.");
    }).catch(() => setStatus("New project · browser storage will save your work."));
    return () => { live = false; };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeProject({ characters, scenes }).then(() => setSaved(true)).catch(() => setStatus("Save failed. Export your project backup."));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [characters, scenes]);

  const draw = (scene: StoryScene, time = 0) => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    const w = canvas.width, h = canvas.height;
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#050b1b"); gradient.addColorStop(.55, "#101b3a"); gradient.addColorStop(1, "#080b19");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    if (scene.backgroundImage) {
      const image = new Image(); image.src = scene.backgroundImage;
      if (image.complete && image.naturalWidth) {
        const scale = Math.max(w / image.width, h / image.height);
        ctx.drawImage(image, (w-image.width*scale)/2, (h-image.height*scale)/2, image.width*scale, image.height*scale);
      }
    }
    if (moon) {
      ctx.save(); ctx.shadowColor = "#9bc8ff"; ctx.shadowBlur = 42; ctx.fillStyle = "#e4f1ff";
      ctx.beginPath(); ctx.arc(w*.72, h*.16, w*.105, 0, Math.PI*2); ctx.fill(); ctx.restore();
      ctx.fillStyle = "rgba(6,14,33,.17)"; ctx.fillRect(0,0,w,h);
    }
    for (let i=0;i<35;i++) { const x=(i*137)%w, y=(i*83)%Math.round(h*.5); ctx.fillStyle = "rgba(220,235,255,.55)"; ctx.fillRect(x,y,2,2); }
    // distant city silhouettes
    for (let i=0;i<18;i++) { const bw=28+(i*17)%45, bh=65+(i*31)%130, x=i*(w/17)-12; ctx.fillStyle="#111b35"; ctx.fillRect(x,h*.57-bh,bw,bh); ctx.fillStyle="rgba(255,205,120,.45)"; for(let yy=h*.57-bh+16;yy<h*.57-8;yy+=22) for(let xx=x+8;xx<x+bw-5;xx+=17) ctx.fillRect(xx,yy,5,7); }
    ctx.fillStyle="#1b2941"; ctx.fillRect(0,h*.57,w,h*.43);
    ctx.strokeStyle="rgba(174,204,255,.2)"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,h*.57); ctx.lineTo(w,h*.57); ctx.stroke();
    if (wind) {
      ctx.strokeStyle="rgba(191,218,255,.28)"; ctx.lineWidth=2;
      for(let i=0;i<5;i++){ const y=h*(.3+i*.07)+Math.sin(time*2+i)*8; const x=((time*65+i*145)%(w+160))-80; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+35,y-8,x+90,y); ctx.stroke(); }
      ctx.fillStyle="rgba(220,235,255,.35)";
      for(let i=0;i<6;i++){const x=(i*191+time*28)%w; const y=h*.5+Math.sin(time+i)*25; ctx.beginPath();ctx.ellipse(x,y,5,2,Math.sin(time+i),0,Math.PI*2);ctx.fill();}
    }
    const actor = characters.find(c=>c.id===scene.speakerId);
    if (actor?.image) {
      const img = new Image(); img.src=actor.image;
      if (img.complete && img.naturalWidth) {
        const iw=w*.64, ih=h*.5, scale=Math.min(iw/img.width,ih/img.height), dw=img.width*scale, dh=img.height*scale;
        ctx.drawImage(img,(w-dw)/2,h*.38-dh/2+Math.sin(time*1.8)*3,dw,dh);
      }
    } else {
      ctx.textAlign="center"; ctx.font="bold 34px Arial"; ctx.fillStyle="#d7e6ff"; ctx.fillText(actor?.name ?? "Four friends",w/2,h*.49);
      ctx.font="16px Arial"; ctx.fillStyle="#91a6ce"; ctx.fillText("Upload a character reference to show the artwork",w/2,h*.53);
    }
    if (captions) {
      ctx.fillStyle="rgba(3,7,18,.82)"; ctx.fillRect(w*.06,h*.73,w*.88,h*.18);
      ctx.fillStyle="#f8fbff"; ctx.textAlign="center"; ctx.font="bold 29px Arial";
      const words=scene.dialogue.split(" "); let lines: string[]=[]; let line="";
      for(const word of words){ if((line+" "+word).trim().length>34){lines.push(line);line=word;} else line=(line+" "+word).trim(); } if(line)lines.push(line);
      lines.slice(0,3).forEach((l,i)=>ctx.fillText(l,w/2,h*.78+i*37,w*.82));
      ctx.fillStyle="#9fb6df"; ctx.font="bold 17px Arial"; ctx.fillText(actor?.name ?? "HUM CHAAR DOST",w/2,h*.95);
    }
  };

  useEffect(() => { draw(active, 0); }, [active, characters, moon, wind, captions]);

  const updateCharacter = (id: string, patch: Partial<Character>) => setCharacters(items=>items.map(c=>c.id===id?{...c,...patch}:c));
  const updateScene = (id: string, patch: Partial<StoryScene>) => setScenes(items=>items.map(s=>s.id===id?{...s,...patch}:s));
  const uploadCharacter = async (id: string, file?: File) => { if(!file)return; if(!file.type.startsWith("image/")){setStatus("Please upload a PNG, JPG or WEBP reference image.");return;} updateCharacter(id,{image:await readFile(file)}); setStatus("Character reference uploaded. Keep the same image in every episode."); };
  const uploadSceneImage = async (id: string, file?: File) => { if(!file)return; if(!file.type.startsWith("image/")){setStatus("Please upload an image background.");return;} updateScene(id,{backgroundImage:await readFile(file)}); setStatus("Scene background added."); };
  const uploadAudio = async (id: string, file?: File) => { if(!file)return; if(!file.type.startsWith("audio/")){setStatus("Upload an MP3, WAV, M4A or other audio file.");return;} updateScene(id,{audioUrl:await readFile(file),audioName:file.name}); setStatus("ElevenLabs dialogue audio attached to this scene."); };
  const addScene = () => { const id="scene-"+Date.now(); setScenes(items=>[...items,{id,title:"New scene",speakerId:"shubham",dialogue:"Write dialogue here…",duration:5}]); setActiveScene(id); };
  const removeScene = (id:string) => { if(scenes.length===1)return; const next=scenes.filter(s=>s.id!==id);setScenes(next);if(activeScene===id)setActiveScene(next[0].id); };
  const addCharacterSlot = () => { const id="character-"+Date.now();setCharacters(items=>[...items,{id,name:"New character",role:"Custom role",outfit:"Describe hairstyle and outfit",voice:"Add ElevenLabs Voice ID"}]);setActiveCharacter(id);setTab("characters"); };
  const exportProject = () => { const blob=new Blob([JSON.stringify({title:"HUM CHAAR DOST",format:"9:16",style:"anime-night-moonlight",characters:characters.map(({image,...c})=>({...c,hasReference:!!image})),scenes:scenes.map(({backgroundImage,audioUrl,...s})=>({...s,hasBackground:!!backgroundImage,hasAudio:!!audioUrl}))},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="hum-chaar-dost-project.json";a.click();URL.revokeObjectURL(url); };
  const exportVideo = async () => {
    const canvas=canvasRef.current;if(!canvas||!canvas.captureStream||!("MediaRecorder" in window)){setStatus("Video export needs a modern Chrome or Edge browser.");return;}
    setIsExporting(true);setStatus("Recording animated anime-style scene…");
    const stream=canvas.captureStream(30);const chunks:BlobPart[]=[];const recorder=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm"});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    const done=new Promise<void>(resolve=>{recorder.onstop=()=>resolve();});
    const started=performance.now(); const duration=totalDuration;
    let audio:HTMLAudioElement|undefined;let audioCtx:AudioContext|undefined;let source:MediaElementAudioSourceNode|undefined;
    try{
      audioCtx=new AudioContext();const dest=audioCtx.createMediaStreamDestination(); 
      const activeAudio=scenes.find(s=>s.audioUrl)?.audioUrl;
      if(activeAudio){audio=new Audio(activeAudio);audio.loop=true;source=audioCtx.createMediaElementSource(audio);source.connect(dest);source.connect(audioCtx.destination);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));await audioCtx.resume();}
      recorder.start(200);await audio?.play().catch(()=>undefined);
      await new Promise<void>(resolve=>{const frame=(now:number)=>{const elapsed=(now-started)/1000;if(elapsed>=duration){resolve();return;}let t=elapsed;let scene=scenes[0];for(const item of scenes){scene=item;if(t<item.duration)break;t-=item.duration;}draw(scene,t);requestAnimationFrame(frame);};requestAnimationFrame(frame);});
      recorder.stop();await done;const blob=new Blob(chunks,{type:recorder.mimeType||"video/webm"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="hum-chaar-dost-episode-01.webm";a.click();setStatus("WebM video downloaded. Open in CapCut to add final voice timing and music.");setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(error){setStatus(error instanceof Error?error.message:"Video export failed.");if(recorder.state!=="inactive")recorder.stop();}
    finally{stream.getTracks().forEach(t=>t.stop());audio?.pause();source?.disconnect();await audioCtx?.close().catch(()=>undefined);setIsExporting(false);draw(active,0);}
  };

  return <main className="min-h-screen bg-[#080b16] text-white">
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#090d1b]/95 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3"><Link href="/editor" className="rounded-lg border border-white/10 px-3 py-2 text-sm">← Editor</Link><div><div className="font-black tracking-wide">REELMIND <span className="text-sky-300">ANIME STUDIO</span></div><div className="text-[10px] text-slate-400">HUM CHAAR DOST · 9:16 vertical series</div></div></div>
      <div className="flex gap-2"><button onClick={exportProject} className="rounded-xl border border-white/15 px-3 py-2 text-xs">Backup</button><button disabled={isExporting} onClick={exportVideo} className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 px-3 py-2 text-xs font-bold disabled:opacity-50">{isExporting?"Rendering…":"Export video"}</button></div>
    </header>
    <section className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-sky-300/20 bg-gradient-to-r from-sky-400/10 to-violet-500/10 p-4"><div className="text-xs font-bold uppercase tracking-[.2em] text-sky-200">Night anime universe</div><h1 className="mt-1 text-2xl font-black">Create your next episode</h1><p className="mt-1 text-sm text-slate-400">Five character slots · scene-by-scene dialogue · ElevenLabs audio · 9:16 preview and export.</p><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300"><span className="rounded-full bg-white/10 px-3 py-1">🌙 Moonlight</span><span className="rounded-full bg-white/10 px-3 py-1">🍃 Soft breeze</span><span className="rounded-full bg-white/10 px-3 py-1">🎞 Anime mood</span><span className="rounded-full bg-white/10 px-3 py-1">Autosave: {saved?"Saved":"Saving…"}</span></div></div>
        <div className="rounded-2xl border border-white/10 bg-[#11182a] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Live vertical preview</h2><p className="text-xs text-slate-400">Moonlit rooftop · moving breeze · dialogue captions</p></div><button onClick={()=>draw(active,1.5)} className="rounded-lg bg-white/10 px-3 py-2 text-xs">Refresh preview</button></div><div className="mx-auto w-full max-w-[310px] overflow-hidden rounded-2xl border border-sky-100/20 bg-black shadow-[0_0_55px_#315b9b33]"><canvas ref={canvasRef} width={540} height={960} className="block h-auto w-full"/></div><p className="mt-3 text-center text-[11px] text-slate-500">For best character consistency, upload each character’s approved anime reference image below.</p></div>
        <div className="rounded-2xl border border-white/10 bg-[#11182a] p-4"><div className="flex items-center justify-between"><div><h2 className="font-bold">Episode timeline</h2><p className="text-xs text-slate-400">{scenes.length} scenes · {totalDuration}s total</p></div><button onClick={addScene} className="rounded-lg border border-sky-300/30 px-3 py-2 text-xs text-sky-200">＋ Add scene</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{scenes.map((scene,i)=>{const speaker=characters.find(c=>c.id===scene.speakerId);return <button key={scene.id} onClick={()=>setActiveScene(scene.id)} className={`rounded-xl border p-3 text-left ${activeScene===scene.id?"border-sky-300/60 bg-sky-300/10":"border-white/10 bg-white/[.03]"}`}><div className="flex justify-between text-xs"><b>{String(i+1).padStart(2,"0")} · {scene.title}</b><span className="text-slate-400">{scene.duration}s</span></div><div className="mt-1 text-[11px] text-sky-200">{speaker?.name??"Group"}</div><p className="mt-2 line-clamp-2 text-xs text-slate-300">{scene.dialogue}</p></button>;})}</div></div>
      </div>
      <aside className="space-y-4">
        <div className="flex rounded-xl border border-white/10 bg-[#11182a] p-1">{(["story","characters","audio"] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold capitalize ${tab===t?"bg-sky-400/15 text-sky-100":"text-slate-400"}`}>{t}</button>)}</div>
        {tab==="characters"&&<div className="rounded-2xl border border-white/10 bg-[#11182a] p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Character universe</h2><button onClick={addCharacterSlot} className="text-xs text-sky-200">＋ Add character</button></div><div className="mt-3 space-y-2">{characters.map(c=><button key={c.id} onClick={()=>setActiveCharacter(c.id)} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left ${activeCharacter===c.id?"border-sky-300/50 bg-sky-300/10":"border-white/10"}`}><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-slate-800 text-lg">{c.image?<img src={c.image} alt={c.name} className="h-full w-full object-cover"/>:"✦"}</span><span className="min-w-0"><b className="block text-sm">{c.name}</b><small className="block text-slate-400">{c.role}</small></span></button>)}</div><div className="mt-4 space-y-3"><label className="block text-xs text-slate-400">Character name<input value={selectedCharacter.name} onChange={e=>updateCharacter(selectedCharacter.id,{name:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#080d19] p-3 text-sm text-white"/></label><label className="block text-xs text-slate-400">Role / personality<input value={selectedCharacter.role} onChange={e=>updateCharacter(selectedCharacter.id,{role:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#080d19] p-3 text-sm text-white"/></label><label className="block text-xs text-slate-400">Fixed outfit and look<input value={selectedCharacter.outfit} onChange={e=>updateCharacter(selectedCharacter.id,{outfit:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#080d19] p-3 text-sm text-white"/></label><label className="block text-xs text-slate-400">ElevenLabs Voice ID (optional)<input value={selectedCharacter.voice} onChange={e=>updateCharacter(selectedCharacter.id,{voice:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#080d19] p-3 text-sm text-white"/></label><label className="block cursor-pointer rounded-xl border border-dashed border-sky-300/40 p-4 text-center text-xs text-sky-100">＋ Upload approved anime reference<input type="file" accept="image/*" className="sr-only" onChange={e=>uploadCharacter(selectedCharacter.id,e.target.files?.[0])}/><span className="mt-1 block text-[10px] text-slate-400">PNG · JPG · WEBP</span></label></div></div>}
        {tab==="story"&&<div className="rounded-2xl border border-white/10 bg-[#11182a] p-4"><h2 className="font-bold">Scene & dialogue</h2><div className="mt-3 space-y-3"><label className="block text-xs text-slate-400">Scene title<input value={active.title} onChange={e=>updateScene(active.id,{title:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#080d19] p-3 text-sm text-white"/></label><label className="block text-xs text-slate-400">Speaking character<select value={active.speakerId} onChange={e=>updateScene(active.id,{speakerId:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#080d19] p-3 text-sm text-white"><option value="group">Group / all</option>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="block text-xs text-slate-400">Dialogue<textarea rows={5} value={active.dialogue} onChange={e=>updateScene(active.id,{dialogue:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-[#080d19] p-3 text-sm text-white"/></label><label className="block text-xs text-slate-400">Duration · {active.duration}s<input type="range" min="2" max="15" value={active.duration} onChange={e=>updateScene(active.id,{duration:Number(e.target.value)})} className="mt-2 w-full accent-sky-400"/></label><label className="block cursor-pointer rounded-xl border border-dashed border-white/20 p-3 text-center text-xs">＋ Scene background image<input type="file" accept="image/*" className="sr-only" onChange={e=>uploadSceneImage(active.id,e.target.files?.[0])}/></label><button onClick={()=>removeScene(active.id)} disabled={scenes.length===1} className="w-full rounded-lg border border-rose-400/20 py-2 text-xs text-rose-200 disabled:opacity-30">Delete this scene</button></div></div>}
        {tab==="audio"&&<div className="rounded-2xl border border-white/10 bg-[#11182a] p-4"><h2 className="font-bold">Voice & ambience</h2><p className="mt-1 text-xs leading-5 text-slate-400">Generate each character’s dialogue in ElevenLabs, download the audio, then attach it to the matching scene here.</p><div className="mt-3 rounded-xl bg-sky-300/10 p-3 text-xs text-sky-100">Active scene: {active.title} · {currentSpeaker?.name??"Group"}</div><label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-sky-300/40 p-4 text-center text-xs text-sky-100">＋ Attach ElevenLabs dialogue audio<input type="file" accept="audio/*" className="sr-only" onChange={e=>uploadAudio(active.id,e.target.files?.[0])}/><span className="mt-1 block text-[10px] text-slate-400">MP3 · WAV · M4A</span></label>{active.audioName&&<div className="mt-3 rounded-lg bg-white/5 p-3 text-xs">{active.audioName}<audio controls src={active.audioUrl} className="mt-2 w-full"/></div>}<div className="mt-4 space-y-2"><label className="flex items-center justify-between text-xs text-slate-300">Moonlight ambience<input type="checkbox" checked={moon} onChange={e=>setMoon(e.target.checked)}/></label><label className="flex items-center justify-between text-xs text-slate-300">Gentle wind animation<input type="checkbox" checked={wind} onChange={e=>setWind(e.target.checked)}/></label><label className="flex items-center justify-between text-xs text-slate-300">Dialogue captions<input type="checkbox" checked={captions} onChange={e=>setCaptions(e.target.checked)}/></label></div></div>}
        <div className="rounded-2xl border border-white/10 bg-[#11182a] p-4"><b className="text-sm">Workflow</b><ol className="mt-2 list-inside list-decimal space-y-2 text-xs leading-5 text-slate-400"><li>Upload the same approved reference for each character.</li><li>Edit the script scene by scene.</li><li>Create each speaker’s voice in ElevenLabs and attach its audio.</li><li>Add a background image for a scene if needed.</li><li>Export a video draft, then finish cuts and captions in CapCut.</li></ol></div>
        <p className="text-[11px] text-slate-500">{status} · Autosaves locally in this browser.</p>
      </aside>
    </section>
  </main>;
}
