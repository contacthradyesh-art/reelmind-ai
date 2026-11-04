import Link from "next/link";

export default function HomePage() {
  return (
    <main className="site-bg min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
        <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-2xl gradient-button text-xl">R</span>
          <span className="text-lg">ReelMind <span className="gradient-text">AI</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/editor" className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/5">Classic editor</Link>
          <Link href="/anime-studio" className="gradient-button rounded-full px-4 py-2.5 text-sm font-bold">Anime Story Studio ↗</Link>
        </div>
      </nav>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 md:grid-cols-2 md:px-8 md:pb-28 md:pt-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-xs text-sky-200"><span className="h-2 w-2 rounded-full bg-emerald-400" /> REELMIND · CREATOR STUDIO</div>
          <h1 className="max-w-2xl text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">Your ideas.<br /><span className="gradient-text">In motion.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg">Create vertical reels, build dialogue-led stories, organise characters, attach voice tracks and export video drafts from one browser workspace.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/anime-studio" className="gradient-button inline-flex items-center gap-2 rounded-2xl px-6 py-4 font-bold">Create an anime episode <span>→</span></Link><Link href="/editor" className="rounded-2xl border border-white/10 px-6 py-4 font-semibold text-zinc-300 hover:bg-white/5">Open classic editor</Link></div>
          <p className="mt-8 text-xs leading-6 text-zinc-500">Anime Story Studio includes five character slots, a scene timeline, reference art, ElevenLabs audio uploads, moonlight and wind atmosphere, autosave and WebM draft export. AI-generated footage and lip-sync require a separate video-generation service.</p>
        </div>
        <div className="glass rounded-[2rem] p-4"><div className="mb-3 flex items-center justify-between px-2 text-xs text-zinc-400"><span>HUM CHAAR DOST</span><span>9:16 · ANIME STORY</span></div><div className="mx-auto flex aspect-[9/16] max-h-[520px] max-w-[292px] flex-col items-center justify-end overflow-hidden rounded-[1.5rem] border border-sky-100/10 bg-[radial-gradient(circle_at_72%_17%,#dbeafe_0_6%,transparent_6.5%),linear-gradient(180deg,#071329,#17284a_55%,#090d1c)] p-6 text-center shadow-2xl"><div className="mb-auto pt-16 text-5xl">🌙</div><div className="mb-10 text-5xl">👥</div><p className="text-xs font-semibold tracking-[.25em] text-sky-200">FOUR FRIENDS · ONE REALITY</p><h2 className="mt-3 text-3xl font-black leading-tight">LIFE KI<br /><span className="text-sky-200">SACHCHAI</span></h2><p className="mt-3 text-xs text-white/65">Sapne. Struggle. Dosti. Aur gehri baatein.</p></div></div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-24 md:grid-cols-2 md:px-8">
        <Link href="/anime-studio" className="glass rounded-3xl p-6 transition hover:border-sky-300/40"><p className="text-xs font-bold uppercase tracking-[.2em] text-sky-300">Character-driven shorts</p><h2 className="mt-2 text-2xl font-black">Anime Story Studio</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Five reusable character profiles, dialogue scenes, voice uploads and moonlit story previews.</p><span className="mt-5 inline-block text-sm font-bold text-sky-200">Open studio →</span></Link>
        <Link href="/editor" className="glass rounded-3xl p-6 transition hover:border-fuchsia-300/40"><p className="text-xs font-bold uppercase tracking-[.2em] text-fuchsia-300">General reel editor</p><h2 className="mt-2 text-2xl font-black">Classic Editor</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Text and photo layers, templates, animations, music, timeline and MP4 export.</p><span className="mt-5 inline-block text-sm font-bold text-fuchsia-200">Open editor →</span></Link>
      </section>
      <footer className="border-t border-white/10 px-5 py-7 text-center text-xs text-zinc-500">© {new Date().getFullYear()} ReelMind AI · Imagine It. Create It. Reel It.</footer>
    </main>
  );
}
