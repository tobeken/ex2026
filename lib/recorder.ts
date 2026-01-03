export type ActiveRecorder = {
  recorder: MediaRecorder;
  chunks: Blob[];
};

export function startRecorder(stream: MediaStream): ActiveRecorder {
  const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
  return { recorder, chunks };
}

export async function stopRecorder(active: ActiveRecorder): Promise<Blob> {
  return new Promise((resolve) => {
    active.recorder.onstop = () => {
      const blob = new Blob(active.chunks, { type: "audio/webm" });
      resolve(blob);
    };
    active.recorder.stop();
  });
}

