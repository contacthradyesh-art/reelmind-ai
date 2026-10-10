"use client";

import Link from "next/link";
import { useState } from "react";

export default function AICharacterStudioPage() {
  const [prompt,setPrompt]=useState("A friendly futuristic Indian podcast host, cinematic studio lighting, expressive face, vertical portrait");
  const [size,setSize]=useState("1024x1536");
  const [image,setImage]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function generate(){setBusy(true);setError("");setImage("");try{const response=await fetch("/api/images",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,size})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Generation failed");setImage(data.dataUrl);}catch(e){setError(e instanceof Error?e.message:"Image generation failed");}finally{setBusy(false);}}
  return <main className="site-bg min-h-screen px-5 py-8 text-white"><div className="mx-auto max-w-5xl"><Link href="/" className="text-sm text-fuchsia-300">← ReelMind AI</Link><h1 className="mt-4 text-3xl font-black">AI Character Studio</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Generate original character portraits and scene art. Requires server-side OPENAI_API_KEY. Generated images may incur provider charges.</p><div className="mt-8 grid gap-6 md:grid-cols-2"><section className="glass rounded-2xl p-5"><label className="label">Character / background prompt</label><textarea className="field min-h-36" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={1000}/><label className="label mt-5">Image shape</label><select className="field" value={size} onChange={e=>setSize(e.target.value)}><option value="1024x1536">Portrait 2:3</option><option value="1024x1024">Square</option><option value="1536x1024">Landscape 3:2</option></select><button disabled={busy||prompt.trim().length<5} onClick={generate} className="gradient-button mt-5 w-full rounded-xl p-3 font-bold disabled:opacity-50">{busy?"Generating…":"Generate original image"}</button>{error&&<p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}</section><section className="glass flex min-h-80 items-center justify-center rounded-2xl p-4">{image?<div className="w-full"><img src={image} alt="AI generated character" className="mx-auto max-h-[620px] rounded-xl"/><a className="mt-4 block rounded-xl border border-white/15 p-3 text-center text-sm" download="reelmind-character.png" href={image}>Save PNG</a></div>:<p className="text-center text-sm text-zinc-500">Your generated image will appear here.</p>}</section></div></div></main>;
}
