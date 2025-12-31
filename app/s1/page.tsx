"use client";

import { useMemo, useState } from "react";
import VoicePanel from "@/components/voice-panel";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const tasks = [
  { title: "誕生日プレゼントを探す", condition: "SUMMARY" },
  { title: "週末のレストランを探す", condition: "DETAIL" },
  { title: "研究テーマの資料探し", condition: "LRP" },
];

export default function Session1Page() {
  const [participantId, setParticipantId] = useState("");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);

  const currentTask = tasks[currentTaskIndex];

  const canStart = useMemo(
    () => participantId.trim().length > 0 && !sessionActive,
    [participantId, sessionActive],
  );

  const handleNextTask = () => {
    if (sessionActive) return;
    setCurrentTaskIndex((idx) => Math.min(idx + 1, tasks.length - 1));
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Session 1</h1>
        <p className="text-sm text-muted-foreground">
          1回目も 3 タスク連続で進めます。参加者IDを入れて Start / Stop を各タスクで行ってください。
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium flex flex-col gap-2">
          Participant ID
          <Input
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="例: P001"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          各タスク: Start で Realtime 接続を開始、Stop で終了。Next は Stop 後に押してください。
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
