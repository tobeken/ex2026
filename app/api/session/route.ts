import { NextResponse } from "next/server";

const REALTIME_MODEL = "gpt-realtime-mini-2025-12-15";
const REALTIME_VOICE = "alloy";

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          instructions:
            "あなたは情報検索ができる優秀な日本人です. ユーザからの相談や質問に日本語で答えてください．",
          audio: {
            output: { voice: REALTIME_VOICE },
          },
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        data?.error?.message ||
        (typeof data === "string" ? data : JSON.stringify(data));
      console.error("POST /api/session OpenAI error:", response.status, detail);
      return NextResponse.json(
        { error: "Failed to create realtime client secret", detail },
        { status: response.status }
      );
    }

    const token = data?.value ?? data?.client_secret?.value;
    if (!token) {
      console.error("POST /api/session missing token in response", data);
      return NextResponse.json(
        { error: "Realtime client secret missing in OpenAI response" },
        { status: 500 }
      );
    }

    // クライアントは value または client_secret.value を参照する
    return NextResponse.json({
      ...data,
      client_secret: data?.client_secret ?? { value: token, expires_at: data?.expires_at },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("POST /api/session error:", msg);
    return NextResponse.json({ error: "Failed to fetch session data", detail: msg }, { status: 500 });
  }
}
