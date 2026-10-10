"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, firebaseConfigured, googleProvider } from "@/lib/firebase/client";

export default function LoginPage(){
 const [user,setUser]=useState<User|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 useEffect(()=>auth?onAuthStateChanged(auth,setUser):undefined,[]);
 async function login(){if(!auth){setError("Firebase is not configured. Copy .env.example to .env.local and fill in your Firebase web-app settings.");return;}setBusy(true);setError("");try{await signInWithPopup(auth,googleProvider);}catch(e){setError(e instanceof Error?e.message:"Google sign-in failed");}finally{setBusy(false);}}
 return <main className="site-bg flex min-h-screen items-center justify-center px-5 text-white"><section className="glass w-full max-w-md rounded-3xl p-7"><Link href="/" className="text-sm text-fuchsia-300">← ReelMind AI</Link><h1 className="mt-5 text-3xl font-black">Your cloud workspace</h1><p className="mt-3 text-sm leading-6 text-zinc-400">Sign in to save, load and manage your own reel projects in Firestore.</p>{user?<><div className="mt-6 rounded-xl border border-white/10 p-4"><p className="font-bold">{user.displayName??"Signed in"}</p><p className="mt-1 break-all text-xs text-zinc-400">{user.email}</p></div><Link href="/projects" className="gradient-button mt-4 block rounded-xl p-3 text-center font-bold">Open my projects</Link><button onClick={()=>auth&&signOut(auth)} className="mt-3 w-full rounded-xl border border-white/10 p-3 text-sm">Sign out</button></>:<button disabled={busy} onClick={login} className="gradient-button mt-6 w-full rounded-xl p-3 font-bold disabled:opacity-50">{busy?"Signing in…":"Continue with Google"}</button>}{!firebaseConfigured&&<p className="mt-4 text-xs text-amber-200">Firebase environment variables are currently missing.</p>}{error&&<p role="alert" className="mt-4 break-words text-sm text-rose-300">{error}</p>}<p className="mt-5 text-xs leading-5 text-zinc-500">Only configure public Firebase web-app settings here. Never put service-account private keys in NEXT_PUBLIC variables.</p></section></main>;
}
