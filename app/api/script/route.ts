import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ReelScene = { name: string; duration: number; text: string[]; background: string; style: string; voiceover: string };
const allowedRatios = new Set(["9:16", "1:1", "16:9"]);

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI script generation is not configured. Set GEMINI_API_KEY on the server." }, { status: 503 });
  }
  let body: { topic?: unknown; language?: unknown; tone?: unknown; audience?: unknown; aspectRatio?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 500) : "";
  if (topic.length < 3) return NextResponse.json({ error: "Enter a topic with at least 3 characters." }, { status: 400 });
  const language = typeof body.language === "string" ? body.language.slice(0, 40) : "Hindi";
  const tone = typeof body.tone === "string" ? body.tone.slice(0, 80) : "engaging";
  const audience = typeof body.audience === "string" ? body.audience.slice(0, 120) : "general audience";
  const aspectRatio = typeof body.aspectRatio === "string" && allowedRatios.has(body.aspectRatio) ? body.aspectRatio : "9:16";
  const prompt = `Create an original short social video plan about: ${topic}
Language: ${language}. Tone: ${tone}. Audience: ${audience}. Aspect ratio: ${aspectRatio}.
Return ONLY valid JSON with this exact shape:
{"title":"...","aspectRatio":"${aspectRatio}","scenes":[{"name":"Hook","duration":3,"text":["short on-screen line"],"background":"#111827","style":"bold kinetic typography","voiceover":"spoken line"},{"name":"Main Content","duration":5,"text":["..."],"background":"#312e81","style":"...","voiceover":"..."},{"name":"Outro CTA","duration":3,"text":["..."],"background":"#701a75","style":"...","voiceover":"..."}]}
Exactly three scenes named Hook, Main Content, Outro CTA. Duration 1-15 seconds per scene. Each background must be a CSS hex color. Keep on-screen text concise, original, and appropriate. No markdown fences.`;
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(process.env.GEMINI_API_KEY), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.8, maxOutputTokens: 1800 } }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return NextResponse.json({ error: "Gemini request failed.", detail: (await response.text()).slice(0, 500) }, { status: 502 });
    const payload = await response.json();
    const raw = payload.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
    if (!raw) return NextResponse.json({ error: "Gemini returned an empty response." }, { status: 502 });
    const parsed = JSON.parse(raw) as { title?: unknown; scenes?: unknown };
    if (typeof parsed.title !== "string" || !Array.isArray(parsed.scenes) || parsed.scenes.length !== 3) return NextResponse.json({ error: "AI response did not match the three-scene schema." }, { status: 502 });
    const scenes: ReelScene[] = parsed.scenes.map((scene, index) => {
      const item = scene as Record<string, unknown>;
      return {
        name: ["Hook", "Main Content", "Outro CTA"][index],
        duration: typeof item.duration === "number" ? Math.max(1, Math.min(15, item.duration)) : [3, 5, 3][index],
        text: Array.isArray(item.text) ? item.text.filter((x): x is string => typeof x === "string").slice(0, 5).map(x => x.slice(0, 140)) : [],
        background: typeof item.background === "string" && /^#[0-9a-fA-F]{6}$/.test(item.background) ? item.background : ["#111827", "#312e81", "#701a75"][index],
        style: typeof item.style === "string" ? item.style.slice(0, 160) : "kinetic typography",
        voiceover: typeof item.voiceover === "string" ? item.voiceover.slice(0, 500) : "",
      };
    });
    return NextResponse.json({ title: parsed.title.slice(0, 120), aspectRatio, scenes });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.name === "TimeoutError" ? "Gemini request timed out." : "Could not parse AI response." }, { status: 502 });
  }
}
