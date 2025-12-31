"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import VoicePanel from "@/components/voice-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type TaskId = "BIRTHDAY_GIFT" | "FAREWELL_PARTY" | "WEEKEND_TRIP";
type GroupId = "G1" | "G2" | "G3";
const createPostAnswer = () => ({
  q1: "",
  q2: 0,
  q3: 0,
  q4: {
    mental: 0,
    physical: 0,
    temporal: 0,
    performance: 0,
    effort: 0,
    frustration: 0,
  },
});

const TASK_CATALOG: Record<
  TaskId,
  { title: string; scenario: string }
> = {
  BIRTHDAY_GIFT: {
    title: "トピック: 誕生日プレゼント",
    scenario:
      "あなたの知人が来月誕生日を迎えます。音声対話システムで調べながら、予算や候補、選ぶポイントを検討してください。",
  },
  FAREWELL_PARTY: {
    title: "トピック: 送別会の場所",
    scenario:
      "お世話になっている人の送別会の幹事。来月の開催場所を探し、予算・イベント・規模・料理などを調べながら検討してください。",
  },
  WEEKEND_TRIP: {
    title: "トピック: 休日旅行の計画",
    scenario:
      "来月の休日に短期旅行を計画。行き先、予算、移動手段、宿泊先を調べ、複数案を比較し現実的な旅行プランを考えてください。",
  },
};

const ASSIGNMENT_PLAN: Record<
  GroupId,
  { taskId: TaskId; condition: string }[]
> = {
  G1: [
    { taskId: "BIRTHDAY_GIFT", condition: "SUMMARY" },
    { taskId: "FAREWELL_PARTY", condition: "NARRATIVE" },
    { taskId: "WEEKEND_TRIP", condition: "NONE" },
  ],
  G2: [
    { taskId: "FAREWELL_PARTY", condition: "SUMMARY" },
    { taskId: "WEEKEND_TRIP", condition: "NARRATIVE" },
    { taskId: "BIRTHDAY_GIFT", condition: "NONE" },
  ],
  G3: [
    { taskId: "WEEKEND_TRIP", condition: "SUMMARY" },
    { taskId: "BIRTHDAY_GIFT", condition: "NARRATIVE" },
    { taskId: "FAREWELL_PARTY", condition: "NONE" },
  ],
};

const STORAGE_KEY = "taskCustomNotes";

export default function Session2Page() {
  const [participantId, setParticipantId] = useState("");
  const [participantGroup, setParticipantGroup] = useState<GroupId>("G1");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const [customNotes, setCustomNotes] = useState<string[]>(() => ["", "", ""]);
  const [followupNotes, setFollowupNotes] = useState<string[]>(() => ["", "", ""]);
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);
  const [followupDraft, setFollowupDraft] = useState("");
  const [stage, setStage] = useState<"voice" | "post">("voice");
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [postAnswers, setPostAnswers] = useState(
    () => [createPostAnswer(), createPostAnswer(), createPostAnswer()]
  );
  const [postCompleted, setPostCompleted] = useState<boolean[]>(() => [false, false, false]);
  const router = useRouter();

  const orderedTasks = useMemo(() => {
    const plan = ASSIGNMENT_PLAN[participantGroup] || ASSIGNMENT_PLAN.G1;
    return plan.map(({ taskId, condition }) => ({
      taskId,
      condition,
      ...TASK_CATALOG[taskId],
    }));
  }, [participantGroup]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("participantId") || "";
      setParticipantId(stored);
      const storedGroup =
        (window.sessionStorage.getItem("participantGroup") as GroupId | null) || "G1";
      setParticipantGroup(storedGroup);

      const notes = window.sessionStorage.getItem(STORAGE_KEY);
      if (notes && orderedTasks.length === 3) {
        try {
          const parsed = JSON.parse(notes);
          if (Array.isArray(parsed)) {
            setCustomNotes(
              orderedTasks.map((_, idx) =>
                typeof parsed[idx] === "string" ? parsed[idx] : ""
              )
            );
          }
        } catch (e) {
          console.warn("Failed to parse stored notes", e);
        }
      }
    }
  }, [orderedTasks]);

  useEffect(() => {
    setCurrentTaskIndex(0);
    setStage("voice");
    setVoiceCompleted(false);
    setAudioPlaying(false);
    setAudioFinished(false);
    setCustomNotes((prev) =>
      orderedTasks.map((_, idx) => (typeof prev[idx] === "string" ? prev[idx] : ""))
    );
    setFollowupNotes((prev) =>
      orderedTasks.map((_, idx) => (typeof prev[idx] === "string" ? prev[idx] : ""))
    );
    setPostAnswers((prev) =>
      orderedTasks.map(
        (_, idx) =>
          prev[idx] || createPostAnswer()
      )
    );
    setPostCompleted((prev) => orderedTasks.map((_, idx) => !!prev[idx]));
  }, [orderedTasks]);

  const currentTask = orderedTasks[currentTaskIndex];
  const currentNote = customNotes[currentTaskIndex] || "";
  const notePrompt = (() => {
    switch (currentTask?.taskId) {
      case "BIRTHDAY_GIFT":
        return "トピック: 送る相手を入力してください。";
      case "FAREWELL_PARTY":
        return "トピック: お世話になっている人を入力してください。";
      case "WEEKEND_TRIP":
      default:
        return "トピック: 行き先を入力してください。";
    }
  })();
  const notePlaceholder = (() => {
    switch (currentTask?.taskId) {
      case "BIRTHDAY_GIFT":
        return "例: 祖母 / 同僚 / 友人";
      case "FAREWELL_PARTY":
        return "例: 部署の先輩 / 担当教授";
      case "WEEKEND_TRIP":
      default:
        return "例: 京都 / ソウル / 札幌";
    }
  })();
  const scenarioWithReplacement = (() => {
    if (!currentTask) return "";
    if (!currentNote) return currentTask.scenario;
    if (currentTask.taskId === "BIRTHDAY_GIFT") {
      return currentTask.scenario.replace("知人", currentNote);
    }
    if (currentTask.taskId === "FAREWELL_PARTY") {
      return currentTask.scenario.replace("お世話になっている人", currentNote);
    }
    if (currentTask.taskId === "WEEKEND_TRIP") {
      return currentTask.scenario.replace("旅行", currentNote);
    }
    return currentTask.scenario;
  })();

  const canStart = stage === "voice" && audioFinished && !audioPlaying;

  const handlePlayAudio = () => {
    setAudioPlaying(true);
    setAudioFinished(false);
    setIsFollowupOpen(false);
    setFollowupDraft(followupNotes[currentTaskIndex] || "");
    window.setTimeout(() => {
      setAudioPlaying(false);
      setAudioFinished(true);
      setIsFollowupOpen(true);
    }, 1500);
  };

  const handleNextTask = (force?: boolean) => {
    if (currentTaskIndex >= orderedTasks.length - 1) return;
    if (stage === "voice" && !voiceCompleted && !force) return;
    if (stage === "post" && !postCompleted[currentTaskIndex] && !force) return;
    setCurrentTaskIndex((idx) => idx + 1);
    setAudioPlaying(false);
    setAudioFinished(false);
    setVoiceCompleted(false);
    setStage("voice");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingTime(null);
  };

  const handleTaskComplete = () => {
    if (sessionActive) return;
    setVoiceCompleted(true);
    setStage("post");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingTime(null);
  };

  const handleFollowupSave = () => {
    if (!followupDraft.trim()) {
      alert("内容を入力してください。");
      return;
    }
    const next = [...followupNotes];
    next[currentTaskIndex] = followupDraft;
    setFollowupNotes(next);
    setIsFollowupOpen(false);
  };

  const handlePostAnswerChange = (
    key: "q1" | "q2" | "q3" | "q4",
    value: string,
    tlxKey?: keyof (typeof postAnswers)[number]["q4"],
  ) => {
    const next = [...postAnswers];
    if (key === "q4" && tlxKey) {
      next[currentTaskIndex] = {
        ...next[currentTaskIndex],
        q4: { ...next[currentTaskIndex].q4, [tlxKey]: Number(value) },
      };
    } else {
      next[currentTaskIndex] = { ...next[currentTaskIndex], [key]: key === "q1" ? value : Number(value) };
    }
    setPostAnswers(next);
    const completedNext = [...postCompleted];
    completedNext[currentTaskIndex] = false;
    setPostCompleted(completedNext);
  };

  const handlePostSubmit = () => {
    const ans = postAnswers[currentTaskIndex];
    const tlxValues = Object.values(ans.q4);
    const tlxFilled = tlxValues.every((v) => v > 0);
    if (!ans.q1.trim() || ans.q2 <= 0 || ans.q3 <= 0 || !tlxFilled) {
      alert("すべての項目に回答してください。");
      return;
    }
    const completedNext = [...postCompleted];
    completedNext[currentTaskIndex] = true;
    setPostCompleted(completedNext);
    if (currentTaskIndex >= orderedTasks.length - 1) {
      router.push("/s2/impressions");
    } else {
      handleNextTask(true);
    }
  };

  const handleStartSession = () => {
    setRemainingTime(8 * 60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          timerRef.current = null;
          setRemainingTime(0);
          setVoiceCompleted(true);
          setStage("post");
          toast.warning("8分経過しました。アンケートに進んでください。");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
              Step {currentTaskIndex + 1} / {orderedTasks.length}
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
          {stage === "voice" && (
            <Button onClick={handlePlayAudio} disabled={audioPlaying}>
              {audioPlaying ? "再生中..." : "Play audio"}
            </Button>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {stage === "voice"
              ? audioFinished
                ? "Start で検索を開始できます。"
                : "Play audio を実行してください。"
              : "アンケートに回答してください。"}
          </span>
          {stage === "voice" && remainingTime !== null && (
            <span className="text-sm font-semibold text-red-500">
              残り時間: {Math.floor(remainingTime / 60)}分{remainingTime % 60}秒
            </span>
          )}
        </div>
      </Card>

      {followupNotes[currentTaskIndex]?.trim() && (
        <Card className="p-4 space-y-2">
          <p className="text-sm font-medium">調べ残し・次に調べたいこと</p>
          <p className="text-sm whitespace-pre-wrap">
            {followupNotes[currentTaskIndex]}
          </p>
        </Card>
      )}

      {stage === "voice" && (
        <>
          <VoicePanel
            title="VoicePanel"
            canStart={canStart}
            onSessionStateChange={setSessionActive}
            onStart={handleStartSession}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleTaskComplete}
              disabled={sessionActive || voiceCompleted}
              variant="secondary"
            >
              {currentTaskIndex >= orderedTasks.length - 1
                ? "タスク完了"
                : "タスク完了（次へ）"}
            </Button>
          </div>
        </>
      )}

      {stage === "post" && (
        <Card className="p-4 space-y-4">
          <p className="text-sm font-semibold">
            Q1. 今回、新たに調べて分かったこと・理解したことを箇条書きで書いてください
          </p>
          <Textarea
            value={postAnswers[currentTaskIndex]?.q1 || ""}
            onChange={(e) => handlePostAnswerChange("q1", e.target.value)}
            placeholder="箇条書きで記入してください"
            className="min-h-[120px]"
          />
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q2. 検索前のシステムの音声が記憶想起に役立ったと思いますか？（5段階）
            </p>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={postAnswers[currentTaskIndex]?.q2 || 0}
              onChange={(e) => handlePostAnswerChange("q2", e.target.value)}
            >
              <option value={0}>選択してください</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q3. 検索前に提示されたシステムの音声は、検索を再開し、最初の検索を行う際に役立ちましたか？（5段階）
            </p>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={postAnswers[currentTaskIndex]?.q3 || 0}
              onChange={(e) => handlePostAnswerChange("q3", e.target.value)}
            >
              <option value={0}>選択してください</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Q4. 認知負荷 (NASA-TLX) 各項目（1-5）</p>
            {([
              ["mental", "メンタル要求"],
              ["physical", "身体的要求"],
              ["temporal", "時間的要求"],
              ["performance", "達成度"],
              ["effort", "努力"],
              ["frustration", "フラストレーション"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <select
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={postAnswers[currentTaskIndex]?.q4?.[key] || 0}
                  onChange={(e) =>
                    handlePostAnswerChange("q4", e.target.value, key)
                  }
                >
                  <option value={0}>選択してください</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePostSubmit}>
              {currentTaskIndex >= orderedTasks.length - 1
                ? "アンケート送信（完了）"
                : "アンケート送信（次へ）"}
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={isFollowupOpen} onOpenChange={setIsFollowupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              前回の検索を踏まえて、調べ残っていること、次に調べたい点を箇条書きで書いてください
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={followupDraft}
              onChange={(e) => setFollowupDraft(e.target.value)}
              placeholder="箇条書きで入力してください"
              className="min-h-[160px]"
            />
          </div>
          <DialogFooter className="flex justify-end">
            <Button onClick={handleFollowupSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
