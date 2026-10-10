import { NextResponse } from "next/server";

export const runtime = "nodejs";
const voices = new Set(["Kore", "Puck", "Charon", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"]);

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Text-to-speech is not configured. Set GEMINI_API_KEY on the server." }, { status: 503 });
  let body: { text?: unknown; voice?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
  const voice = typeof body.voice === "string" && voices.has(body.voice) ? body.voice : "Kore";
  if (!text) return NextResponse.json({ error: "Enter text to speak." }, { status: 400 });
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=" + encodeURIComponent(key), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return NextResponse.json({ error: "TTS provider failed.", detail: (await response.text()).slice(0, 400) }, { status: 502 });
    const data = await response.json();
    const part = data.candidates?.[0]?.content?.parts?.find((item: { inlineData?: { data?: string; mimeType?: string } }) => item.inlineData?.data);
    if (!part?.inlineData?.data) return NextResponse.json({ error: "Provider returned no audio." }, { status: 502 });
    return NextResponse.json({ audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType ?? "audio/pcm;rate=24000", voice });
  } catch {
    return NextResponse.json({ error: "TTS request timed out or failed." }, { status: 502 });
  }
}
