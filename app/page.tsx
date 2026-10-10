"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const features = [
  { icon: "▧", title: "Vertical-first canvas", text: "Design for Reels and Shorts with a true 9:16 preview." },
  { icon: "✦", title: "Your style, your story", text: "Add custom text, colours, photos and simple animations." },
  { icon: "↗", title: "Export in your browser", text: "Render locally on your device—your project stays in the browser." }
];

export default function HomePage() {
  return (
    <main className="site-bg min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
        <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-2xl gradient-button text-xl">R</span>
          <span className="text-lg">ReelMind <span className="gradient-text">AI</span></span>
        </Link>
        <Link href="/editor" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold transition hover:border-fuchsia-300/60 hover:bg-white/5">Open editor ↗</Link>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 md:grid-cols-2 md:px-8 md:pb-28 md:pt-20">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-2 text-xs text-fuchsia-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> PHASE 1 · REEL MAKER
          </div>
          <h1 className="max-w-2xl text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            Your ideas.<br /><span className="gradient-text">In motion.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg">
            Create scroll-stopping vertical videos with text, photos, colour and motion. No complicated timeline. Just your imagination.
          </p>
          <p className="mt-4 text-sm font-semibold text-zinc-300">Imagine It. Create It. Reel It.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/editor" className="gradient-button inline-flex items-center gap-2 rounded-2xl px-6 py-4 font-bold transition hover:scale-[1.02]">Create your first reel <span>→</span></Link>
            <a href="#features" className="rounded-2xl border border-white/10 px-6 py-4 font-semibold text-zinc-300 hover:bg-white/5">Explore features</a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500"><span>✓ No account needed</span><span>✓ Browser-based editor</span><span>✓ Your own media</span></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .7, delay: .15 }} className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-purple-600/20 to-pink-500/10 blur-3xl" />
          <div className="glass relative rounded-[2rem] p-3 shadow-2xl">
            <div className="flex items-center justify-between px-3 py-3 text-xs text-zinc-400"><span>YOUR NEXT REEL</span><span className="rounded-full bg-white/5 px-3 py-1">9:16 PREVIEW</span></div>
            <div className="relative mx-auto flex aspect-[9/16] max-h-[570px] w-full max-w-[321px] flex-col items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-violet-950 via-[#4c164f] to-rose-950 p-6 text-center">
              <div className="absolute -left-16 top-12 h-48 w-48 rounded-full bg-purple-500/30 blur-3xl" />
              <div className="absolute -right-14 bottom-10 h-48 w-48 rounded-full bg-pink-500/30 blur-3xl" />
              <span className="relative mb-5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-bold tracking-[.25em]">A LITTLE REMINDER</span>
              <h2 className="relative text-4xl font-black leading-tight sm:text-5xl">YOUR<br /><span className="text-pink-200">STORY</span><br />ISN’T OVER.</h2>
              <p className="relative mt-5 max-w-[220px] text-sm leading-6 text-white/75">Keep showing up. The little steps count, too.</p>
              <div className="relative mt-8 h-1 w-16 rounded-full bg-white/60" />
              <span className="absolute bottom-5 text-[10px] tracking-widest text-white/45">MADE WITH REELMIND</span>
            </div>
            <div className="flex items-center justify-between px-3 py-4 text-xs text-zinc-400"><span>✦ Text + gradients</span><span>MP4 export · coming in editor</span></div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8"><div className="mb-6"><p className="text-sm font-bold uppercase tracking-[.2em] text-fuchsia-300">Creator suite</p><h2 className="mt-2 text-3xl font-black">Choose your workspace</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
 {href:"/editor",icon:"▧",title:"Reel Maker",text:"Compose scenes, text, photos and browser-based exports."},
 {href:"/meme-maker",icon:"😂",title:"Meme Maker",text:"Customize original meme layouts and export PNG."},
 {href:"/ai-reel",icon:"✦",title:"AI Script Generator",text:"Turn a topic into a three-scene reel brief with Gemini."},
 {href:"/ai-character-studio",icon:"🎭",title:"AI Character Studio",text:"Generate original character portraits and backgrounds."}
].map(card=><Link key={card.href} href={card.href} className="glass rounded-2xl p-5 transition hover:-translate-y-1 hover:border-fuchsia-300/40"><span className="text-2xl">{card.icon}</span><h3 className="mt-4 font-bold">{card.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{card.text}</p><span className="mt-4 inline-block text-sm font-bold text-fuchsia-300">Open workspace →</span></Link>)}</div></section>
      <section id="features" className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="mb-8 max-w-xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-fuchsia-300">Made for creators</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Everything starts with <span className="gradient-text">one idea.</span></h2></div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, i) => <motion.article key={feature.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .1 }} className="glass rounded-3xl p-6 sm:p-7">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-purple-500/25 to-pink-500/20 text-2xl text-fuchsia-200">{feature.icon}</div>
            <h3 className="text-lg font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{feature.text}</p>
          </motion.article>)}
        </div>
      </section>
      <footer className="border-t border-white/10 px-5 py-7 text-center text-xs text-zinc-500">© {new Date().getFullYear()} ReelMind AI · Imagine It. Create It. Reel It.</footer>
    </main>
  );
}