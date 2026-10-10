import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "Image generation is not configured. Set OPENAI_API_KEY on the server." }, { status: 503 });
  let body: { prompt?: unknown; size?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1000) : "";
  const size = body.size === "1024x1024" || body.size === "1536x1024" || body.size === "1024x1536" ? body.size : "1024x1536";
  if (prompt.length < 5) return NextResponse.json({ error: "Describe the background you want (at least 5 characters)." }, { status: 400 });
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt: `Create an original, text-free visual background for a social video. Composition should have safe negative space for captions. Prompt: ${prompt}`, size, n: 1 }),
      signal: AbortSignal.timeout(55000),
    });
    if (!response.ok) return NextResponse.json({ error: "Image provider failed.", detail: (await response.text()).slice(0, 400) }, { status: 502 });
    const data = await response.json();
    const item = data.data?.[0];
    if (!item?.b64_json) return NextResponse.json({ error: "Image provider returned no image data." }, { status: 502 });
    return NextResponse.json({ dataUrl: `data:image/png;base64,${item.b64_json}`, revisedPrompt: item.revised_prompt ?? prompt });
  } catch {
    return NextResponse.json({ error: "Image generation request timed out or failed." }, { status: 502 });
  }
}
