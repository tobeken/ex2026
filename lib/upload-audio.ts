export type UploadAudioParams = {
  participantId: string;
  taskId: string;
  session: string;
  turnId: string;
  role: "user" | "assistant";
  file: Blob;
};

export async function uploadAudio({
  participantId,
  taskId,
  session,
  turnId,
  role,
  file,
}: UploadAudioParams): Promise<string | undefined> {
  const formData = new FormData();
  formData.append("participantId", participantId);
  formData.append("taskId", taskId);
  formData.append("session", session);
  formData.append("turnId", turnId);
  formData.append("role", role);
  formData.append("file", file, `${role}-${turnId}.webm`);

  const res = await fetch("/api/upload-audio", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    console.warn("upload audio failed", await res.text());
    return undefined;
  }

  const data = (await res.json()) as { url?: string; path?: string } | null;
  if (!data || !data.url) {
    console.warn("upload audio missing url", data);
    return undefined;
  }
  return data.url;
}
