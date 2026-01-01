"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import VoicePanel from "@/components/voice-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TaskSurvey from "@/components/task-survey";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type TaskId = "BIRTHDAY_GIFT" | "FAREWELL_PARTY" | "WEEKEND_TRIP";
type GroupId = "G1" | "G2" | "G3";

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
      "来月の休日に短期旅行を計画。予算、移動手段、宿泊先を調べ、複数案を比較し現実的な旅行プランを考えてください。",
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

export default function Session1Page() {
  const STORAGE_KEY = "taskCustomNotes";
  const [participantId, setParticipantId] = useState("");
  const [participantGroup, setParticipantGroup] = useState<GroupId>("G1");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [stage, setStage] = useState<"survey" | "voice" | "post">("survey");
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const [customNotes, setCustomNotes] = useState<string[]>(() => ["", "", ""]);
  const [noteSaved, setNoteSaved] = useState<boolean[]>(() => [false, false, false]);
  const [postAnswers, setPostAnswers] = useState(
    () => [{ q1: "", q2: "" }, { q1: "", q2: "" }, { q1: "", q2: "" }]
  );
  const [postCompleted, setPostCompleted] = useState<boolean[]>(() => [false, false, false]);
  const [progressApplied, setProgressApplied] = useState(false);
  const router = useRouter();
  const PROGRESS_IDX_KEY = "s1_currentTaskIndex";
  const PROGRESS_STAGE_KEY = "s1_stage";
  const [turnIndex, setTurnIndex] = useState(0);
  const lastAssistantEndRef = useRef<number | null>(null);

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
      const s1done = window.sessionStorage.getItem("session1Done") === "true";
      if (s1done) {
        router.replace("/sessions");
        return;
      }
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
            const nextNotes = orderedTasks.map((_, idx) =>
              typeof parsed[idx] === "string" ? parsed[idx] : ""
            );
            setCustomNotes(nextNotes);
            setNoteSaved(nextNotes.map((n) => n.trim().length > 0));
          }
        } catch (e) {
          console.warn("Failed to parse stored notes", e);
        }
      }
    }
  }, [orderedTasks]);

  useEffect(() => {
    setCurrentTaskIndex(0);
    setStage("survey");
    setVoiceCompleted(false);
    setCustomNotes((prev) =>
      orderedTasks.map((_, idx) => (typeof prev[idx] === "string" ? prev[idx] : ""))
    );
    setNoteSaved((prev) => orderedTasks.map((_, idx) => !!prev[idx]));
    setPostAnswers((prev) =>
      orderedTasks.map((_, idx) => prev[idx] ?? { q1: "", q2: "" })
    );
    setPostCompleted((prev) => orderedTasks.map((_, idx) => !!prev[idx]));
  }, [orderedTasks]);

  useEffect(() => {
    const applyProgress = async () => {
      if (!participantId || orderedTasks.length === 0 || progressApplied) return;
      // 1) 進行中ステージをsessionStorageから復元
      if (typeof window !== "undefined") {
        const storedIdx = Number(window.sessionStorage.getItem(PROGRESS_IDX_KEY) || "0");
          const storedStage =
          (window.sessionStorage.getItem(PROGRESS_STAGE_KEY) as "survey" | "voice" | "post" | null) ||
          null;
          if (!Number.isNaN(storedIdx) && storedIdx >= 0 && storedIdx < orderedTasks.length) {
            setCurrentTaskIndex(storedIdx);
          if (storedStage === "voice" || storedStage === "post") {
            setStage(storedStage);
          }
          }
        }

      try {
        const res = await fetch(
          `/api/surveys?participantId=${encodeURIComponent(participantId)}&session=s1&stage=post`
        );
        if (!res.ok) return;
        const data: { taskId?: string }[] = await res.json();
        const completedIds = new Set(
          data.filter((r) => r.taskId).map((r) => r.taskId as string)
        );
        const nextIdx = orderedTasks.findIndex((t) => !completedIds.has(t.taskId));
        if (nextIdx === -1) {
          window.sessionStorage.setItem("session1Done", "true");
          router.replace("/s1/demographics");
          return;
        }
        setCurrentTaskIndex(nextIdx);
      } catch (e) {
        console.warn("Failed to load progress for s1", e);
      } finally {
        setProgressApplied(true);
      }
    };
    applyProgress();
  }, [participantId, orderedTasks, progressApplied, router]);

  const persistStage = (idx: number, st: "survey" | "voice" | "post") => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(PROGRESS_IDX_KEY, String(idx));
    window.sessionStorage.setItem(PROGRESS_STAGE_KEY, st);
  };

  const persistNotes = (next: string[]) => {
    setCustomNotes(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const postTiming = async (events: { event: string; timestamp?: number; extra?: any }[]) => {
    if (!participantId || !currentTask) return;
    try {
      await fetch("/api/conversation/timing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          events.map((e) => ({
            participantId,
            session: "s1",
            taskId: currentTask.taskId,
            event: e.event,
            timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
            extra: e.extra,
          }))
        ),
      });
    } catch (err) {
      console.warn("failed to post timing", err);
    }
  };

  const postTurns = async (turns: { role: "user" | "assistant"; text?: string; startedAt: number; endedAt: number }[]) => {
    if (!participantId || !currentTask) return;
    try {
      await fetch("/api/conversation/turns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          turns.map((t, idx) => ({
            participantId,
            session: "s1",
            taskId: currentTask.taskId,
            turnIndex: turnIndex + idx,
            role: t.role,
            text: t.text,
            startedAt: new Date(t.startedAt).toISOString(),
            endedAt: new Date(t.endedAt).toISOString(),
          }))
        ),
      });
      setTurnIndex((prev) => prev + turns.length);
    } catch (err) {
      console.warn("failed to post turns", err);
    }
  };

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
        return "例: 部署の先輩 / 担当教授 / 顧客担当";
      case "WEEKEND_TRIP":
      default:
        return "例: 京都 / ソウル / 札幌 / 台北";
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
      return currentTask.scenario
        .replace(/短期旅行/g, `短期${currentNote}旅行`)
        .replace(/休日旅行/g, `${currentNote}旅行`)
        .replace(/旅行/g, `${currentNote}旅行`);
    }
    return currentTask.scenario;
  })();
  const canStart = !sessionActive && stage === "voice";
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const submitSurvey = async (payload: {
    stage: "pre" | "post";
    answers: any;
  }) => {
    if (!participantId || !currentTask) return;
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          session: "s1",
          taskId: currentTask.taskId,
          stage: payload.stage,
          condition: currentTask.condition,
          answers: payload.answers,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("s1 survey submit failed", err);
      }
    } catch (e) {
      console.error("s1 survey submit error", e);
    }
  };

  const handleNextTask = (force?: boolean) => {
    if (sessionActive) return;
    if (!voiceCompleted && !force) return;
    if (stage === "post" && !postCompleted[currentTaskIndex] && !force) return;
    setCurrentTaskIndex((idx) => Math.min(idx + 1, orderedTasks.length - 1));
    setStage("survey");
    setVoiceCompleted(false);
    persistStage(Math.min(currentTaskIndex + 1, orderedTasks.length - 1), "survey");
  };

  const handleSurveySubmit = (answers: Record<string, string>) => {
    if (!noteSaved[currentTaskIndex]) {
      alert("自由記述を保存してください。");
      return;
    }
    submitSurvey({
      stage: "pre",
      answers: {
        note: currentNote,
        ...answers,
      },
    });
    setStage("voice");
    persistStage(currentTaskIndex, "voice");
  };

  const handleTaskComplete = () => {
    if (sessionActive) return;
    setVoiceCompleted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setRemainingTime(null);
    }
    setStage("post");
    // このタスクのポストアンケから再開できるように保持（完了送信時に次タスクへ進める）
    persistStage(currentTaskIndex, "post");
    postTiming([{ event: "session_stop" }]);
    lastAssistantEndRef.current = null;
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
    submitSurvey({
      stage: "post",
      answers: {
        q1: answers.q1,
        q2: answers.q2,
      },
    });
    const completedNext = [...postCompleted];
    completedNext[currentTaskIndex] = true;
    setPostCompleted(completedNext);
    if (currentTaskIndex >= orderedTasks.length - 1) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("session1Done", "true");
        window.sessionStorage.removeItem(PROGRESS_IDX_KEY);
        window.sessionStorage.removeItem(PROGRESS_STAGE_KEY);
      }
      toast.success("すべてのタスクが完了しました");
      router.push("/s1/demographics");
    } else {
      persistStage(currentTaskIndex + 1, "survey");
      handleNextTask(true);
    }
  };

  const handleStartSession = async () => {
    setRemainingTime(8 * 60);
    if (timerRef.current) clearInterval(timerRef.current);
    postTiming([{ event: "session_start" }]);
    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          timerRef.current = null;
          setVoiceCompleted(true);
          setStage("post");
          toast.warning("8分経過したため終了しました。アンケートに進んでください。");
          postTiming([{ event: "session_stop" }]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 space-y-6">
      {participantId && (
        <div className="flex justify-end">
          <Badge variant="secondary" className="px-3 py-1">
            ID: {participantId}
          </Badge>
        </div>
      )}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Session 1</h1>
        <p className="text-sm text-muted-foreground">
          1回目も 3 タスク連続で進めます。Start / Stop のみで進行できます。
        </p>
        {participantId && (
          <p className="text-xs text-muted-foreground">
            参加者ID: <span className="font-semibold text-foreground">{participantId}</span>
          </p>
        )}
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
          {stage === "voice" && remainingTime !== null && (
            <p className="text-sm font-semibold text-red-500">
              残り時間: {Math.floor(remainingTime / 60)}分{remainingTime % 60}秒
            </p>
          )}
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
            onStart={handleStartSession}
            onStop={() => {
              postTiming([{ event: "session_stop" }]);
            }}
            onUserSpeechStart={(ts) => {
              if (lastAssistantEndRef.current) {
                postTiming([
                  {
                    event: "assistant_end_to_user_start",
                    timestamp: ts,
                    extra: { delayMs: ts - lastAssistantEndRef.current },
                  },
                ]);
              }
            }}
            onUserSpeechFinal={(text, startedAt, endedAt) => {
              postTurns([{ role: "user", text, startedAt, endedAt }]);
            }}
            onAssistantSpeechStart={(ts) => {
              // no-op
            }}
            onAssistantSpeechEnd={(text, startedAt, endedAt) => {
              lastAssistantEndRef.current = endedAt;
              postTurns([{ role: "assistant", text, startedAt, endedAt }]);
            }}
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
              {currentTaskIndex >= orderedTasks.length - 1
                ? "アンケート送信（完了）"
                : "アンケート送信（次へ）"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
