"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VoicePanel from "@/components/voice-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

export default function Session1Page() {
  const [participantId, setParticipantId] = useState("");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("participantId") || "";
      setParticipantId(stored);
    }
  }, []);

  const currentTask = tasks[currentTaskIndex];
  const canStart = !sessionActive;

  const handleNextTask = () => {
    if (sessionActive) return;
    setCurrentTaskIndex((idx) => Math.min(idx + 1, tasks.length - 1));
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Session 1</h1>
        <p className="text-sm text-muted-foreground">
          1回目も 3 タスク連続で進めます。Start / Stop のみで進行できます。
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
            <p className="text-xs text-muted-foreground mt-2 leading-6">
              {currentTask.scenario}
            </p>
          </div>
          <Button
            onClick={handleNextTask}
            disabled={currentTaskIndex >= tasks.length - 1 || sessionActive}
            variant="outline"
          >
            Next task
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          各タスクは Start/Stop を完了してから Next に進んでください。
        </p>
      </Card>

      <VoicePanel
        canStart={canStart}
        title={`VoicePanel - ${currentTask.title}`}
        onSessionStateChange={setSessionActive}
      />
    </div>
  );
}
