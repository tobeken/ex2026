"use client";

import { useEffect, useState } from "react";
import VoicePanel from "@/components/voice-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const tasks = [
  {
    title: "トピック1: 誕生日プレゼント",
    condition: "SUMMARY",
    scenario:
      "あなたの知人が来月誕生日を迎えます。音声対話システムで調べながら、予算や候補、選ぶポイントを検討してください。",
  },
  {
    title: "トピック2: 送別会の場所",
    condition: "DETAIL",
    scenario:
      "お世話になっている人の送別会の幹事。来月の開催場所を探し、予算・イベント・規模・料理などを調べながら検討してください。",
  },
  {
    title: "トピック3: 休日旅行の計画",
    condition: "LRP",
    scenario:
      "来月の休日に短期旅行を計画。行き先、予算、移動手段、宿泊先を調べ、複数案を比較し現実的な旅行プランを考えてください。",
  },
];

const STORAGE_KEY = "taskCustomNotes";

export default function Session2Page() {
  const [participantId, setParticipantId] = useState("");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const [customNotes, setCustomNotes] = useState<string[]>(() =>
    tasks.map(() => "")
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("participantId") || "";
      setParticipantId(stored);

      const notes = window.sessionStorage.getItem(STORAGE_KEY);
      if (notes) {
        try {
          const parsed = JSON.parse(notes);
          if (Array.isArray(parsed) && parsed.length === tasks.length) {
            setCustomNotes(parsed.map((v) => (typeof v === "string" ? v : "")));
          }
        } catch (e) {
          console.warn("Failed to parse stored notes", e);
        }
      }
    }
  }, []);

  const currentTask = tasks[currentTaskIndex];
  const currentNote = customNotes[currentTaskIndex] || "";
  const notePrompt = (() => {
    if (currentTaskIndex === 0) return "トピック1: 送る相手を入力してください。";
    if (currentTaskIndex === 1) return "トピック2: お世話になっている人を入力してください。";
    return "トピック3: 行き先を入力してください。";
  })();
  const notePlaceholder = (() => {
    if (currentTaskIndex === 0) return "例: 祖母 / 同僚 / 友人";
    if (currentTaskIndex === 1) return "例: 部署の先輩 / 担当教授";
    return "例: 京都 / ソウル / 札幌";
  })();
  const scenarioWithReplacement = (() => {
    if (!currentNote) return currentTask.scenario;
    if (currentTaskIndex === 0) {
      return currentTask.scenario.replace("知人", currentNote);
    }
    if (currentTaskIndex === 1) {
      return currentTask.scenario.replace("お世話になっている人", currentNote);
    }
    if (currentTaskIndex === 2) {
      return currentTask.scenario.replace("旅行", currentNote);
    }
    return currentTask.scenario;
  })();

  const canStart = audioFinished && !audioPlaying;

  const handlePlayAudio = () => {
    setAudioPlaying(true);
    setAudioFinished(false);
    window.setTimeout(() => {
      setAudioPlaying(false);
      setAudioFinished(true);
    }, 1500);
  };

  const handleNextTask = (force?: boolean) => {
    if (currentTaskIndex >= tasks.length - 1) return;
    if (!voiceCompleted && !force) return;
    setCurrentTaskIndex((idx) => idx + 1);
    setAudioPlaying(false);
    setAudioFinished(false);
    setVoiceCompleted(false);
  };

  const handleTaskComplete = () => {
    if (sessionActive) return;
    setVoiceCompleted(true);
    if (currentTaskIndex < tasks.length - 1) {
      handleNextTask(true);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Session 2</h1>
        <p className="text-sm text-muted-foreground">
          2回目（3タスク連続）。音声再生 → Start/Stop → Next の流れです。ID入力は不要です。
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-medium">
              Step {currentTaskIndex + 1} / {tasks.length}
            </p>
            <p className="text-lg font-semibold">{currentTask.title}</p>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Condition:</span>
              <Badge variant="outline">{currentTask.condition}</Badge>
            </div>
            <p className="text-sm text-foreground mt-2 leading-6 font-medium">
              {scenarioWithReplacement}
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
      </Card>

      <VoicePanel
        title="VoicePanel"
        canStart={canStart}
        onSessionStateChange={setSessionActive}
      />
      <div className="flex justify-end">
        <Button
          onClick={handleTaskComplete}
          disabled={sessionActive || voiceCompleted}
          variant="secondary"
        >
          {currentTaskIndex >= tasks.length - 1
            ? "タスク完了"
            : "タスク完了（次へ）"}
        </Button>
      </div>
    </div>
  );
}
