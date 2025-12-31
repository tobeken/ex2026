"use client";

import { useEffect, useMemo, useState } from "react";
import VoicePanel from "@/components/voice-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tasks = [
  { title: "誕生日プレゼントを探す", condition: "SUMMARY" },
  { title: "週末のレストランを探す", condition: "DETAIL" },
  { title: "研究テーマの資料探し", condition: "LRP" },
];

export default function Session2Page() {
  const [participantId, setParticipantId] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const currentTask = tasks[currentTaskIndex];

  const canStart = useMemo(
    () =>
      participantId.trim().length > 0 &&
      isLoaded &&
      audioFinished &&
      !audioPlaying,
    [participantId, isLoaded, audioFinished, audioPlaying],
  );

  const handleLoad = () => setIsLoaded(true);

  const handlePlayAudio = () => {
    setAudioPlaying(true);
    setAudioFinished(false);
    window.setTimeout(() => {
      setAudioPlaying(false);
      setAudioFinished(true);
    }, 1500);
  };

  const handleNextTask = () => {
    if (currentTaskIndex >= tasks.length - 1) return;
    setCurrentTaskIndex((idx) => idx + 1);
    setAudioPlaying(false);
    setAudioFinished(false);
  };

  useEffect(() => {
    setIsLoaded(false);
  }, [participantId]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Session 2</h1>
        <p className="text-sm text-muted-foreground">
          2回目（3タスク連続）。IDをロード → 音声再生 → Start/Stop → Next の流れです。
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <label className="text-sm font-medium flex-1 flex flex-col gap-2">
            Participant ID
            <Input
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="例: P002"
            />
          </label>
          <Button
            onClick={handleLoad}
            disabled={participantId.trim().length === 0}
            variant={isLoaded ? "secondary" : "default"}
          >
            Load
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Load でIDを確定 → Play audio で説明を再生 → 再生完了後に Start で検索開始。
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-medium">
              Step {currentTaskIndex + 1} / {tasks.length}
            </p>
            <p className="text-lg font-semibold">{currentTask.title}</p>
            <p className="text-xs text-muted-foreground">
              Condition:{" "}
              <Badge variant="outline" className="ml-1">
                {currentTask.condition}
              </Badge>
            </p>
          </div>
          <Button onClick={handlePlayAudio} disabled={audioPlaying}>
            {audioPlaying ? "再生中..." : "Play audio"}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {audioFinished
            ? "再生完了 → Start で検索を開始できます。"
            : audioPlaying
              ? "音声再生中..."
              : "再生ボタンを押してください。"}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleNextTask}
            disabled={
              currentTaskIndex >= tasks.length - 1 || sessionActive
            }
            variant="outline"
          >
            Next task
          </Button>
        </div>
      </Card>

      <VoicePanel
        title="VoicePanel"
        canStart={canStart}
        onSessionStateChange={setSessionActive}
      />
    </div>
  );
}
