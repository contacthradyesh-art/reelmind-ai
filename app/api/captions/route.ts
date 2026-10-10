import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "Speech-to-text is not configured. Set OPENAI_API_KEY on the server." }, { status: 503 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Expected multipart form data with an audio or video file." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an audio or video file." }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "File exceeds the 25 MB transcription limit." }, { status: 413 });
  const allowed = /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg|mov|flac)$/i;
  if (!allowed.test(file.name)) return NextResponse.json({ error: "Unsupported file type. Use MP3, MP4, M4A, WAV, WEBM, MOV, OGG or FLAC." }, { status: 415 });
  const upstream = new FormData();
  upstream.set("file", file, file.name);
  upstream.set("model", "whisper-1");
  upstream.set("response_format", "verbose_json");
  upstream.set("timestamp_granularities[]", "word");
  const language = form.get("language");
  if (typeof language === "string" && /^[a-z]{2,3}$/.test(language)) upstream.set("language", language);
  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: upstream, signal: AbortSignal.timeout(55000),
    });
    if (!response.ok) return NextResponse.json({ error: "Transcription provider failed.", detail: (await response.text()).slice(0, 400) }, { status: 502 });
    const data = await response.json();
    const words = Array.isArray(data.words) ? data.words.map((word: { word?: string; start?: number; end?: number }) => ({ text: String(word.word ?? "").trim(), start: Number(word.start ?? 0), end: Number(word.end ?? word.start ?? 0) })).filter((word: {text:string;start:number;end:number}) => word.text && Number.isFinite(word.start) && Number.isFinite(word.end)) : [];
    return NextResponse.json({ text: String(data.text ?? ""), language: data.language ?? null, duration: Number(data.duration ?? 0), words });
  } catch {
    return NextResponse.json({ error: "Transcription request timed out or failed." }, { status: 502 });
  }
}
