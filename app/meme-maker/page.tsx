"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { memeTemplates } from "@/lib/editor/meme-templates";

export default function MemeMakerPage() {
  const [selected, setSelected] = useState(memeTemplates[0].id);
  const [top, setTop] = useState(memeTemplates[0].top);
  const [bottom, setBottom] = useState(memeTemplates[0].bottom);
  const [background, setBackground] = useState(memeTemplates[0].background);
  const [textColor, setTextColor] = useState(memeTemplates[0].textColor);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMemo(() => memeTemplates.find(item => item.id === selected) ?? memeTemplates[0], [selected]);
  const choose = (id: string) => { const item = memeTemplates.find(template => template.id === id); if (!item) return; setSelected(id); setTop(item.top); setBottom(item.bottom); setBackground(item.background); setTextColor(item.textColor); };
  const exportPng = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = background; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = textColor;
    ctx.font = `900 76px "${active.font}"`; ctx.lineWidth = 7; ctx.strokeStyle = "#111111";
    const wrap = (text: string, y: number) => {
      const words = text.split(/\s+/); const lines: string[] = []; let line = "";
      for (const word of words) { const next = line ? line + " " + word : word; if (ctx.measureText(next).width > 900 && line) { lines.push(line); line = word; } else line = next; }
      if (line) lines.push(line);
      lines.slice(0,3).forEach((row,index) => { const yy=y+(index-(Math.min(lines.length,3)-1)/2)*88; ctx.strokeText(row,540,yy,990); ctx.fillText(row,540,yy,990); });
    };
    wrap(top.toUpperCase(),250); wrap(bottom.toUpperCase(),830);
    const anchor=document.createElement("a"); anchor.download="reelmind-meme.png"; anchor.href=canvas.toDataURL("image/png"); anchor.click();
  };
  return <main className="site-bg min-h-screen px-5 py-8 text-white"><div className="mx-auto max-w-6xl"><header className="mb-8 flex items-center justify-between"><div><Link href="/" className="text-sm text-fuchsia-300">← ReelMind AI</Link><h1 className="mt-2 text-3xl font-black">Meme Maker</h1><p className="mt-2 text-sm text-zinc-400">10 editable original layouts. Export a PNG without third-party copyrighted templates.</p></div><Link href="/editor" className="rounded-xl border border-white/15 px-4 py-2 text-sm">Open Reel Editor</Link></header><div className="grid gap-6 lg:grid-cols-[1fr_380px]"><section className="grid grid-cols-2 gap-3 sm:grid-cols-3">{memeTemplates.map(item=><button key={item.id} onClick={()=>choose(item.id)} className={`rounded-2xl border p-3 text-left ${selected===item.id?"border-fuchsia-400":"border-white/10"}`}><span className="flex aspect-[4/5] flex-col items-center justify-center rounded-xl p-3 text-center font-black" style={{background:item.background,color:item.textColor,fontFamily:item.font}}><span>{item.top}</span><span className="mt-6">{item.bottom}</span></span><span className="mt-2 block text-sm font-bold">{item.title}</span><span className="text-xs text-zinc-500">{item.category}</span></button>)}</section><aside className="glass h-fit rounded-2xl p-5"><h2 className="mb-4 font-bold">Customize meme</h2><label className="label">Top text</label><textarea className="field mb-4" value={top} onChange={e=>setTop(e.target.value)}/><label className="label">Bottom text</label><textarea className="field mb-4" value={bottom} onChange={e=>setBottom(e.target.value)}/><div className="mb-4 flex gap-4"><label className="label">Background <input aria-label="Background color" className="mt-2 block h-10 w-14" type="color" value={background} onChange={e=>setBackground(e.target.value)}/></label><label className="label">Text <input aria-label="Text color" className="mt-2 block h-10 w-14" type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></label></div><button onClick={exportPng} className="gradient-button w-full rounded-xl p-3 font-bold">Export PNG</button><canvas ref={canvasRef} width={1080} height={1080} className="mt-4 hidden"/></aside></div></div></main>;
}
