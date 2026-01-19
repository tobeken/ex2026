export type UploadAudioParams = {
  participantId: string;
  taskId: string;
  session: string;
  turnId: string;
  role: "user" | "assistant";
  file: Blob;
};

const sanitizeSegment = (value: string) => {
  const normalized = value.trim().normalize("NFKC");
  const cleaned = normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned || "unknown";
};

export async function uploadAudio({
  participantId,
  taskId,
  session,
  turnId,
  role,
  file,
}: UploadAudioParams): Promise<string | undefined> {
  if (typeof window === "undefined") {
    console.warn("uploadAudio should be called from the browser");
    return undefined;
  }

  const { supabaseClient } = await import("@/lib/supabase-client");
  const bucket =
    process.env.NEXT_PUBLIC_CONVERSATION_AUDIO_BUCKET || "conversation-audio";
  const ext = file.type?.split("/").pop() || "webm";
  const path = `${sanitizeSegment(session)}/${sanitizeSegment(participantId)}/${sanitizeSegment(
    taskId
  )}/${sanitizeSegment(role)}-${sanitizeSegment(turnId)}.${ext}`;

  const { error } = await supabaseClient.storage.from(bucket).upload(path, file, {
    contentType: file.type || "audio/webm",
    upsert: true,
  });

  if (error) {
    console.warn("upload audio failed", error);
    return undefined;
  }

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    console.warn("upload audio missing url", data);
    return undefined;
  }
  return data.publicUrl;
}
