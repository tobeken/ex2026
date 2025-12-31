"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VoicePanel from "@/components/voice-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TaskSurvey from "@/components/task-survey";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
      "来月の休日に短期旅行を計画。予算、移動手段、宿泊先を調べ、複数案を比較し現実的な旅行プランを考えてください。",
  },
];

export default function Session1Page() {
  const STORAGE_KEY = "taskCustomNotes";
  const [participantId, setParticipantId] = useState("");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [stage, setStage] = useState<"survey" | "voice">("survey");
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const [customNotes, setCustomNotes] = useState<string[]>(() =>
    tasks.map(() => "")
  );
  const [noteSaved, setNoteSaved] = useState<boolean[]>(() =>
    tasks.map(() => false)
  );
  const [postAnswers, setPostAnswers] = useState(
    () => tasks.map(() => ({ q1: "", q2: "" }))
  );
  const [postCompleted, setPostCompleted] = useState<boolean[]>(() =>
    tasks.map(() => false)
  );
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("participantId") || "";
      setParticipantId(stored);

      const notes = window.sessionStorage.getItem(STORAGE_KEY);
      if (notes) {
        try {
          const parsed = JSON.parse(notes);
          if (Array.isArray(parsed) && parsed.length === tasks.length) {
            const parsedNotes = parsed.map((v) =>
              typeof v === "string" ? v : ""
            );
            setCustomNotes(parsedNotes);
            setNoteSaved(parsedNotes.map((n) => n.trim().length > 0));
          }
        } catch (e) {
          console.warn("Failed to parse stored notes", e);
        }
      }
    }
  }, []);

  const persistNotes = (next: string[]) => {
    setCustomNotes(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const currentTask = tasks[currentTaskIndex];
  const currentNote = customNotes[currentTaskIndex] || "";
  const notePrompt = (() => {
    if (currentTaskIndex === 0) return "トピック1: 送る相手を入力してください。";
    if (currentTaskIndex === 1) return "トピック2: お世話になっている人を入力してください。";
    return "トピック3: 行き先を入力してください。";
  })();
  const notePlaceholder = (() => {
    if (currentTaskIndex === 0) return "例: 祖母 / 同僚 / 友人";
    if (currentTaskIndex === 1) return "例: 部署の先輩 / 担当教授 / 顧客担当";
    return "例: 京都 / ソウル / 札幌 / 台北";
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
  const canStart = !sessionActive && stage === "voice";

  const handleNextTask = (force?: boolean) => {
    if (sessionActive) return;
    if (!voiceCompleted && !force) return;
    if (stage === "post" && !postCompleted[currentTaskIndex] && !force) return;
    setCurrentTaskIndex((idx) => Math.min(idx + 1, tasks.length - 1));
    setStage("survey");
    setVoiceCompleted(false);
  };

  const handleSurveySubmit = () => {
    if (!noteSaved[currentTaskIndex]) {
      alert("自由記述を保存してください。");
      return;
    }
    setStage("voice");
  };

  const handleTaskComplete = () => {
    if (sessionActive) return;
    setVoiceCompleted(true);
    setStage("post");
  };

  const handleSaveNote = () => {
    const next = [...customNotes];
    next[currentTaskIndex] = currentNote;
    persistNotes(next);
    const savedNext = [...noteSaved];
    savedNext[currentTaskIndex] = currentNote.trim().length > 0;
    setNoteSaved(savedNext);
    toast.success("保存しました");
  };

  const handlePostAnswerChange = (key: "q1" | "q2", value: string) => {
    const next = [...postAnswers];
    next[currentTaskIndex] = { ...next[currentTaskIndex], [key]: value };
    setPostAnswers(next);
    const completedNext = [...postCompleted];
    completedNext[currentTaskIndex] = false;
    setPostCompleted(completedNext);
  };

  const handlePostSubmit = () => {
    const answers = postAnswers[currentTaskIndex];
    if (!answers.q1.trim() || !answers.q2.trim()) {
      alert("Q1とQ2の両方に回答してください。");
      return;
    }
    const completedNext = [...postCompleted];
    completedNext[currentTaskIndex] = true;
    setPostCompleted(completedNext);
    if (currentTaskIndex >= tasks.length - 1) {
      toast.success("すべてのタスクが完了しました");
      router.push("/s1/demographics");
    } else {
      handleNextTask(true);
    }
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
            <p className="text-sm text-foreground mt-2 leading-6 font-medium">
              {scenarioWithReplacement}
            </p>
          </div>
        </div>
        {stage === "survey" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{notePrompt}</p>
            <Textarea
              value={currentNote}
              onChange={(e) => {
                const next = [...customNotes];
                next[currentTaskIndex] = e.target.value;
                setCustomNotes(next);
                const savedNext = [...noteSaved];
                savedNext[currentTaskIndex] = false;
                setNoteSaved(savedNext);
              }}
              placeholder={notePlaceholder}
            />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={handleSaveNote}>
                保存
              </Button>
            </div>
          </div>
        )}
      </Card>
      {stage === "survey" && (
        <div className="space-y-4">
          <TaskSurvey
            topic={currentTask.title}
            scenario={scenarioWithReplacement}
            onSubmit={handleSurveySubmit}
          />
        </div>
      )}
      {stage === "voice" && (
        <div className="space-y-4">
          <VoicePanel
            canStart={canStart}
            title={`VoicePanel - ${currentTask.title}`}
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
      )}
      {stage === "post" && (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium">タスク終了アンケート</p>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q1. 今回、調べて分かったこと・理解したことを箇条書きで書いてください
            </p>
            <Textarea
              value={postAnswers[currentTaskIndex]?.q1 || ""}
              onChange={(e) => handlePostAnswerChange("q1", e.target.value)}
              placeholder="例: 箇条書きで記載してください"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q2. まだ調べ残っていることや次に調べたいことを箇条書きで書いてください
            </p>
            <Textarea
              value={postAnswers[currentTaskIndex]?.q2 || ""}
              onChange={(e) => handlePostAnswerChange("q2", e.target.value)}
              placeholder="例: 箇条書きで記載してください"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePostSubmit} variant="default">
              {currentTaskIndex >= tasks.length - 1
                ? "アンケート送信（完了）"
                : "アンケート送信（次へ）"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
