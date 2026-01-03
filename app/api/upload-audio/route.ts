import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

const BUCKET = process.env.CONVERSATION_AUDIO_BUCKET || "conversation-audio";

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase credentials are missing" },
      { status: 500 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const participantId = String(formData.get("participantId") || "").trim();
  const taskId = String(formData.get("taskId") || "").trim();
  const session = String(formData.get("session") || "").trim();
  const turnId = String(formData.get("turnId") || "").trim();
  const role = String(formData.get("role") || "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!participantId || !taskId || !turnId || (role !== "user" && role !== "assistant")) {
    return NextResponse.json(
      { error: "participantId, taskId, turnId, role are required" },
      { status: 400 },
    );
  }

  const ext = file.type?.split("/").pop() || "webm";
  const path = `${session}/${participantId}/${taskId}/${role}-${turnId}.${ext}`;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "audio/webm",
    upsert: true,
  });

  if (error) {
    console.error("upload to supabase failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data, error: pubErr } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (pubErr || !data?.publicUrl) {
    console.error("getPublicUrl failed", pubErr);
    return NextResponse.json({ error: "failed to create public url", path }, { status: 500 });
  }
  return NextResponse.json({ url: data.publicUrl, path });
}
