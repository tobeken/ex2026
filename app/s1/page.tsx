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
import { uploadAudio } from "@/lib/upload-audio";
import { startRecorder, stopRecorder, type ActiveRecorder } from "@/lib/recorder";

type TaskId = "BIRTHDAY_GIFT" | "FAREWELL_PARTY" | "WEEKEND_TRIP";
type GroupId = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7" | "G8" | "G9";

const TASK_CATALOG: Record<
  TaskId,
  { title: string; scenario: string }
> = {
  BIRTHDAY_GIFT: {
    title: "トピック: 誕生日プレゼント",
    scenario:
      "あなたの知人が来月誕生日を迎えるため、プレゼントを購入したいと考えています。予算、好み、購入場所などを考慮してプレゼントを考えてください。",
  },
  FAREWELL_PARTY: {
    title: "トピック: 歓送迎会の計画",
    scenario:
      "バイト先や研究で一緒だったお世話になっている人が、卒業し、来月から東京で就職することになりました。あなたは、幹事となったので、歓送迎会を考えることになりました。予算、人数、開催場所、時間などを調べ、複数案の歓送迎会の企画を比較しながら、現実的な歓送迎会プランを考えてください。",
  },
  WEEKEND_TRIP: {
    title: "トピック: 休日旅行の計画",
    scenario:
      "あなたは来月の休日に一泊二日の短期旅行を計画しています。旅行に行く人数、予算、移動手段、行き先、アクティビティやイベント、宿泊先等を調べ、複数案の旅程を比較しながら作り、現実的な旅行プランを考えてください。",
  },
};

const TASK_ORDERS: TaskId[][] = [
  ["BIRTHDAY_GIFT", "FAREWELL_PARTY", "WEEKEND_TRIP"],
  ["FAREWELL_PARTY", "WEEKEND_TRIP", "BIRTHDAY_GIFT"],
  ["WEEKEND_TRIP", "BIRTHDAY_GIFT", "FAREWELL_PARTY"],
];

const CONDITION_ORDERS = [
  ["SUMMARY", "NARRATIVE", "NONE"],
  ["NARRATIVE", "NONE", "SUMMARY"],
  ["NONE", "SUMMARY", "NARRATIVE"],
];

const buildPlan = (tasks: TaskId[], conditions: string[]) =>
  tasks.map((taskId, idx) => ({ taskId, condition: conditions[idx] }));

const ASSIGNMENT_PLAN: Record<GroupId, { taskId: TaskId; condition: string }[]> = {
  G1: buildPlan(TASK_ORDERS[0], CONDITION_ORDERS[0]),
  G2: buildPlan(TASK_ORDERS[1], CONDITION_ORDERS[0]),
  G3: buildPlan(TASK_ORDERS[2], CONDITION_ORDERS[0]),
  G4: buildPlan(TASK_ORDERS[0], CONDITION_ORDERS[1]),
  G5: buildPlan(TASK_ORDERS[1], CONDITION_ORDERS[1]),
  G6: buildPlan(TASK_ORDERS[2], CONDITION_ORDERS[1]),
  G7: buildPlan(TASK_ORDERS[0], CONDITION_ORDERS[2]),
  G8: buildPlan(TASK_ORDERS[1], CONDITION_ORDERS[2]),
  G9: buildPlan(TASK_ORDERS[2], CONDITION_ORDERS[2]),
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
  const taskStartAtRef = useRef<number | null>(null);
  const combinedStreamGetterRef = useRef<() => MediaStream | null>(() => null);
  const fullRecorderRef = useRef<ActiveRecorder | null>(null);
  const fullStartedAtRef = useRef<number | null>(null);
  const [fullRecordingActive, setFullRecordingActive] = useState(false);

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
    const fetchNotes = async () => {
      if (!participantId || orderedTasks.length === 0) return;
      try {
        const res = await fetch(
          `/api/task-notes?participantId=${encodeURIComponent(participantId)}`
        );
        if (!res.ok) return;
        const rows: Array<{ taskId: TaskId; note: string }> = await res.json();
        const map = new Map(rows.map((r) => [r.taskId, r.note]));
        const nextNotes = orderedTasks.map((t) => map.get(t.taskId) || "");
        setCustomNotes(nextNotes);
        setNoteSaved(nextNotes.map((n) => n.trim().length > 0));
      } catch (e) {
        console.warn("failed to fetch task notes", e);
      }
    };
    fetchNotes();
  }, [participantId, orderedTasks]);

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
    setRemainingTime(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    taskStartAtRef.current = null;
  }, [orderedTasks]);

  // セッションが Active になったら合成ストリームでフル録音開始
  useEffect(() => {
    if (sessionActive) {
      startFullRecording();
    }
  }, [sessionActive]);

  useEffect(() => {
    const applyProgress = async () => {
      if (!participantId || orderedTasks.length === 0 || progressApplied) return;
      try {
        const progressRes = await fetch(
          `/api/progress?participantId=${encodeURIComponent(participantId)}&session=s1`
        );
        if (progressRes.ok) {
          const progress = await progressRes.json();
          if (progress?.completed) {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("session1Done", "true");
            }
            router.replace("/sessions");
            return;
          }
          if (
            typeof progress?.taskIndex === "number" &&
            progress.taskIndex >= 0 &&
            progress.taskIndex < orderedTasks.length
          ) {
            setCurrentTaskIndex(progress.taskIndex);
            if (progress.stage === "voice" || progress.stage === "post" || progress.stage === "survey") {
              setStage(progress.stage);
            }
            setProgressApplied(true);
            return;
          }
        }
      } catch (e) {
        console.warn("Failed to load progress for s1", e);
      }

      // 既存: sessionStorage からの復元 (fallback)
      if (typeof window !== "undefined") {
        const storedIdx = Number(window.sessionStorage.getItem(PROGRESS_IDX_KEY) || "0");
        const storedStage =
          (window.sessionStorage.getItem(PROGRESS_STAGE_KEY) as "survey" | "voice" | "post" | null) ||
          null;
        if (!Number.isNaN(storedIdx) && storedIdx >= 0 && storedIdx < orderedTasks.length) {
          setCurrentTaskIndex(storedIdx);
          if (storedStage === "voice" || storedStage === "post" || storedStage === "survey") {
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
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("session1Done", "true");
          }
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

  const persistStage = async (idx: number, st: "survey" | "voice" | "post") => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PROGRESS_IDX_KEY, String(idx));
      window.sessionStorage.setItem(PROGRESS_STAGE_KEY, st);
    }
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          session: "s1",
          taskIndex: idx,
          stage: st,
          completed: false,
        }),
      });
    } catch (e) {
      console.warn("failed to persist s1 progress", e);
    }
  };

  const persistNotes = (next: string[]) => {
    setCustomNotes(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const persistNoteToDb = async (taskId: TaskId, note: string) => {
    if (!participantId) return;
    try {
      await fetch("/api/task-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, taskId, note }),
      });
    } catch (e) {
      console.warn("failed to save task note", e);
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

  const postTurns = async (turns: { role: "user" | "assistant"; text?: string; startedAt: number; endedAt: number; audioUrl?: string }[]) => {
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
      let scenario = currentTask.scenario;
      scenario = scenario.replace("短期旅行", `短期${currentNote}旅行`);
      if (scenario === currentTask.scenario) {
        scenario = scenario.replace("旅行", `${currentNote}旅行`);
      }
      return scenario;
    }
    return currentTask.scenario;
  })();
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canStart =
    !sessionActive && stage === "voice" && (remainingTime === null || remainingTime > 0);

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
    setRemainingTime(null);
    persistStage(Math.min(currentTaskIndex + 1, orderedTasks.length - 1), "survey");
    stopFullRecordingAndUpload();
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

  const startFullRecording = () => {
    if (fullRecorderRef.current) return;
    const stream = combinedStreamGetterRef.current?.();
    if (!stream) {
      console.warn("full recording start skipped: no combined stream");
      return;
    }
    try {
      fullRecorderRef.current = startRecorder(stream);
      fullStartedAtRef.current = Date.now();
      setFullRecordingActive(true);
    } catch (e) {
      console.warn("full recording start failed", e);
    }
  };

  const stopFullRecordingAndUpload = async () => {
    if (!fullRecorderRef.current) return;
    const startedAt = fullStartedAtRef.current ?? Date.now();
    const endedAt = Date.now();
    let blob: Blob | null = null;
    try {
      blob = await stopRecorder(fullRecorderRef.current);
    } catch (e) {
      console.warn("full recording stop failed", e);
    }
    fullRecorderRef.current = null;
    fullStartedAtRef.current = null;
    setFullRecordingActive(false);
    if (!blob) return;
    if (blob.size === 0) {
      console.warn("full recording blob size 0, skip upload");
      return;
    }
    let audioUrl: string | undefined = undefined;
    try {
      audioUrl =
        (await uploadAudio({
          participantId,
          taskId: currentTask.taskId,
          session: "s1",
          turnId: `full-${Date.now()}`,
          role: "user",
          file: blob,
        })) || undefined;
    } catch (e) {
      console.warn("full recording upload failed", e);
    }
    postTurns([
      {
        role: "user",
        text: "(full session audio)",
        startedAt,
        endedAt,
        audioUrl,
      },
    ]);
  };

  const handleTaskComplete = () => {
    if (sessionActive) return;
    setVoiceCompleted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setRemainingTime(null);
    }
    const started = taskStartAtRef.current;
    const durationMs = started ? Math.min(5 * 60 * 1000, Date.now() - started) : 5 * 60 * 1000;
    postTiming([{ event: "session_stop", extra: { searchDurationMs: durationMs } }]);
    taskStartAtRef.current = null;
    stopFullRecordingAndUpload();
    setStage("post");
    // このタスクのポストアンケから再開できるように保持（完了送信時に次タスクへ進める）
    persistStage(currentTaskIndex, "post");
    lastAssistantEndRef.current = null;
  };

  const handleSaveNote = async () => {
    const next = [...customNotes];
    next[currentTaskIndex] = currentNote;
    persistNotes(next);
    const savedNext = [...noteSaved];
    savedNext[currentTaskIndex] = currentNote.trim().length > 0;
    setNoteSaved(savedNext);
    await persistNoteToDb(currentTask.taskId, currentNote);
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

  const handlePostSubmit = async () => {
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
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId,
            session: "s1",
            taskIndex: currentTaskIndex,
            stage: "complete",
            completed: true,
          }),
        });
      } catch (e) {
        console.warn("failed to mark s1 complete", e);
      }
      toast.success("すべてのタスクが完了しました");
      router.push("/s1/demographics");
    } else {
      persistStage(currentTaskIndex + 1, "survey");
      handleNextTask(true);
    }
  };

  const handleStartSession = async () => {
    if (!timerRef.current) {
    setRemainingTime((prev) => (prev === null ? 5 * 60 : prev));
      if (taskStartAtRef.current === null) {
        taskStartAtRef.current = Date.now();
      }
      postTiming([{ event: "session_start" }]);
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            timerRef.current = null;
            setVoiceCompleted(true);
            setStage("post");
            toast.warning("5分経過したため終了しました。アンケートに進んでください。");
            const started = taskStartAtRef.current ?? Date.now() - 5 * 60 * 1000;
            const durationMs = Math.min(5 * 60 * 1000, Date.now() - started);
            postTiming([{ event: "session_stop", extra: { searchDurationMs: durationMs } }]);
            taskStartAtRef.current = null;
            stopFullRecordingAndUpload();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
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
        1回目（3タスク連続）。音声再生 → 対話開始/対話中断 → 完了 の流れです。検索時間は5分です。終了後にアンケートに答えてください。
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
            {/* <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Condition:</span>
              <Badge variant="outline">{currentTask.condition}</Badge>
            </div> */}
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
            stopFullRecordingAndUpload();
          }}
          onCombinedStreamReady={(getter) => {
            combinedStreamGetterRef.current = getter;
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
              Q1. 今回、調べて分かったことや決まったことを箇条書きで書いてください
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
