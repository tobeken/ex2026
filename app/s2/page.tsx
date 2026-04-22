"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import VoicePanel from "@/components/voice-panel";
import type { HistoryMessage } from "@/hooks/use-webrtc";
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
import { uploadAudio } from "@/lib/upload-audio";
import { startRecorder, stopRecorder, type ActiveRecorder } from "@/lib/recorder";

type TaskId = "BIRTHDAY_GIFT" | "FAREWELL_PARTY" | "WEEKEND_TRIP";
type GroupId = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7" | "G8" | "G9";

type PlaybackReady = {
  url: string;
  taskId: TaskId;
  condition: string;
};
const createPostAnswer = () => ({
  q1: "",
  q21: "",
  q22: "",
  q31: "",
  q32: "",
  q4: "",
});

const followupLikertOptions = [
  "全くそう思わない",
  "あまりそう思わない",
  "どちらともいえない",
  "ややそう思う",
  "かなりそう思う",
] as const;

const createFollowupAnswer = () => ({
  q11: "",
  q12: "",
  q21: "",
  q22: "",
  q31: "",
  q32: "",
  q41: "",
  q42: "",
});

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
    title: "トピック: 送迎会の計画",
    scenario:
      "あなたの知人が、卒業（あるいは転校や異動）することになりました。あなたは、幹事となったので、送迎会を考えることになりました。予算、人数、開催場所、時間などを調べ、複数案の送迎会の企画を比較しながら、現実的な送迎会プランを考えてください。",
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

const STORAGE_KEY = "taskCustomNotes";

export default function Session2Page() {
  const [participantId, setParticipantId] = useState("");
  const [participantGroup, setParticipantGroup] = useState<GroupId>("G1");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [playbackReady, setPlaybackReady] = useState<PlaybackReady | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const [customNotes, setCustomNotes] = useState<string[]>(() => ["", "", ""]);
  const [followupAnswers, setFollowupAnswers] = useState(
    () => [createFollowupAnswer(), createFollowupAnswer(), createFollowupAnswer()]
  );
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);
  const [followupDraft, setFollowupDraft] = useState(createFollowupAnswer());
  const [stage, setStage] = useState<"voice" | "post">("voice");
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackFetchSeqRef = useRef(0);
  const [postAnswers, setPostAnswers] = useState(
    () => [createPostAnswer(), createPostAnswer(), createPostAnswer()]
  );
  const [postCompleted, setPostCompleted] = useState<boolean[]>(() => [false, false, false]);
  const router = useRouter();
  const [canAccess, setCanAccess] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [progressApplied, setProgressApplied] = useState(false);
  const PROGRESS_IDX_KEY = "s2_currentTaskIndex";
  const PROGRESS_STAGE_KEY = "s2_stage";
  const [turnIndex, setTurnIndex] = useState(0);
  const modalSavedAtRef = useRef<number | null>(null);
  const lastAssistantEndRef = useRef<number | null>(null);
  const lastAssistantTurnIndexRef = useRef<number | null>(null);
  const lastAssistantTextRef = useRef<string | null>(null);
  const taskStartAtRef = useRef<number | null>(null);
  const combinedStreamGetterRef = useRef<() => MediaStream | null>(() => null);
  const fullRecorderRef = useRef<ActiveRecorder | null>(null);
  const fullStartedAtRef = useRef<number | null>(null);
  const fullRecordingRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSessionRef = useRef<(() => void) | null>(null);
  const [fullRecordingActive, setFullRecordingActive] = useState(false);
  const [historyMessages, setHistoryMessages] = useState<HistoryMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const orderedTasks = useMemo(() => {
    const plan = ASSIGNMENT_PLAN[participantGroup] || ASSIGNMENT_PLAN.G1;
    return plan.map(({ taskId, condition }) => ({
      taskId,
      condition,
      ...TASK_CATALOG[taskId],
    }));
  }, [participantGroup]);

  const currentTask = orderedTasks[currentTaskIndex];

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
      setCanAccess(true);
    }
  }, [orderedTasks, router]);

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
      } catch (e) {
        console.warn("failed to fetch task notes", e);
      }
    };
    fetchNotes();
  }, [participantId, orderedTasks]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!participantId) return;
      try {
        const [s1Res, s2Res] = await Promise.all([
          fetch(
            `/api/progress?participantId=${encodeURIComponent(participantId)}&session=s1`
          ),
          fetch(
            `/api/progress?participantId=${encodeURIComponent(participantId)}&session=s2`
          ),
        ]);
        if (s2Res.ok) {
          const s2Progress = await s2Res.json();
          if (s2Progress?.completed) {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("session2Done", "true");
            }
            router.replace("/sessions");
            return;
          }
        }
        if (s1Res.ok) {
          const s1Progress = await s1Res.json();
          if (!s1Progress?.completed) {
            router.replace("/sessions");
            return;
          }
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("session1Done", "true");
          }
        }
      } catch (e) {
        console.warn("Failed to check s1/s2 progress", e);
        if (typeof window !== "undefined") {
          const s2done = window.sessionStorage.getItem("session2Done") === "true";
          const s1done = window.sessionStorage.getItem("session1Done") === "true";
          if (s2done || !s1done) {
            router.replace("/sessions");
          }
        }
      }
    };
    checkAccess();
  }, [participantId, router]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!participantId || !currentTask) return;
      setHistoryLoading(true);
      try {
        const res = await fetch(
          `/api/conversation/turns?participantId=${encodeURIComponent(
            participantId
          )}&session=s1&taskId=${encodeURIComponent(currentTask.taskId)}`
        );
        if (!res.ok) {
          setHistoryMessages([]);
          setHistoryLoading(false);
          return;
        }
        const rows: Array<{ role: "user" | "assistant"; text: string | null }> = await res.json();
        const filtered: HistoryMessage[] = rows
          .filter(
            (row): row is { role: "user" | "assistant"; text: string } =>
              typeof row.text === "string" && row.text.trim().length > 0
          )
          .map((row) => ({ role: row.role, text: row.text }));
        setHistoryMessages(filtered);
        setHistoryLoading(false);
      } catch (e) {
        console.warn("failed to fetch s1 history", e);
        setHistoryMessages([]);
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [participantId, currentTask]);

  useEffect(() => {
    setCurrentTaskIndex(0);
    setStage("voice");
    setVoiceCompleted(false);
    setAudioPlaying(false);
    setAudioFinished(false);
    setCustomNotes((prev) =>
      orderedTasks.map((_, idx) => (typeof prev[idx] === "string" ? prev[idx] : ""))
    );
    setFollowupAnswers((prev) =>
      orderedTasks.map((_, idx) => prev[idx] || createFollowupAnswer())
    );
      setPostAnswers((prev) =>
        orderedTasks.map(
        (_, idx) =>
          prev[idx] || createPostAnswer()
      )
    );
    setPostCompleted((prev) => orderedTasks.map((_, idx) => !!prev[idx]));
  }, [orderedTasks]);

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
          `/api/progress?participantId=${encodeURIComponent(participantId)}&session=s2`
        );
        if (progressRes.ok) {
          const progress = await progressRes.json();
          if (progress?.completed) {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("session2Done", "true");
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
            if (progress.stage === "post" || progress.stage === "voice") {
              setStage(progress.stage);
            }
            setProgressApplied(true);
            return;
          }
        }
      } catch (e) {
        console.warn("Failed to load progress for s2", e);
      }

      // fallback: sessionStorage
      if (typeof window !== "undefined") {
        const storedIdx = Number(window.sessionStorage.getItem(PROGRESS_IDX_KEY) || "0");
        const storedStage =
          (window.sessionStorage.getItem(PROGRESS_STAGE_KEY) as "voice" | "post" | null) ||
          null;
        if (!Number.isNaN(storedIdx) && storedIdx >= 0 && storedIdx < orderedTasks.length) {
          setCurrentTaskIndex(storedIdx);
          if (storedStage === "post" || storedStage === "voice") {
            setStage(storedStage);
          }
        }
      }
      try {
        const res = await fetch(
          `/api/surveys?participantId=${encodeURIComponent(participantId)}&session=s2&stage=post`
        );
        if (!res.ok) return;
        const data: { taskId?: string }[] = await res.json();
        const completedIds = new Set(
          data.filter((r) => r.taskId).map((r) => r.taskId as string)
        );
        const nextIdx = orderedTasks.findIndex((t) => !completedIds.has(t.taskId));
        if (nextIdx === -1) {
          // postアンケが全タスク分あり → impressions か complete へ誘導
          const s2done = window.sessionStorage.getItem("session2Done") === "true";
          if (s2done) {
            router.replace("/sessions");
          } else {
            router.replace("/s2/impressions");
          }
          return;
        }
        setCurrentTaskIndex(nextIdx);
      } catch (e) {
        console.warn("Failed to load progress for s2", e);
      } finally {
        setProgressApplied(true);
      }
    };
    applyProgress();
  }, [participantId, orderedTasks, progressApplied, router]);

  const persistStage = async (idx: number, st: "voice" | "post") => {
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
          session: "s2",
          taskIndex: idx,
          stage: st,
          completed: false,
        }),
      });
    } catch (e) {
      console.warn("failed to persist s2 progress", e);
    }
  };

  const startFullRecording = () => {
    if (fullRecorderRef.current) return;
    const stream = combinedStreamGetterRef.current?.();
    if (!stream) {
      if (fullRecordingRetryRef.current === null) {
        fullRecordingRetryRef.current = setTimeout(() => {
          fullRecordingRetryRef.current = null;
          startFullRecording();
        }, 500);
      }
      console.warn("full recording start skipped: no combined stream");
      return;
    }
    try {
      if (fullRecordingRetryRef.current) {
        clearTimeout(fullRecordingRetryRef.current);
        fullRecordingRetryRef.current = null;
      }
      fullRecorderRef.current = startRecorder(stream);
      fullStartedAtRef.current = Date.now();
      setFullRecordingActive(true);
    } catch (e) {
      console.warn("full recording start failed", e);
    }
  };

  const stopFullRecordingAndUpload = async () => {
    if (!fullRecorderRef.current) {
      console.warn("full recording stop skipped: no active recorder");
      return;
    }
    if (fullRecordingRetryRef.current) {
      clearTimeout(fullRecordingRetryRef.current);
      fullRecordingRetryRef.current = null;
    }
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
          session: "s2",
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
  const postTiming = async (events: { event: string; timestamp?: number; extra?: any }[]) => {
    if (!participantId || !currentTask) return;
    try {
      await fetch("/api/conversation/timing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          events.map((e) => ({
            participantId,
            session: "s2",
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

  const postTurns = async (
    turns: {
      role: "user" | "assistant";
      text?: string;
      startedAt: number;
      endedAt: number;
      durationMs?: number;
      audioUrl?: string;
    }[]
  ) => {
    if (!participantId || !currentTask) return;
    try {
      await fetch("/api/conversation/turns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          turns.map((t, idx) => ({
            participantId,
            session: "s2",
            taskId: currentTask.taskId,
            turnIndex: turnIndex + idx,
            role: t.role,
            text: t.text,
            durationMs: t.durationMs ?? Math.max(0, t.endedAt - t.startedAt),
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

  useEffect(() => {
    if (!participantId || !currentTask) return;

    const seq = ++playbackFetchSeqRef.current;
    const ac = new AbortController();
    const taskId = currentTask.taskId;
    const condition = currentTask.condition;

    setPlaybackReady(null);
    setPlaybackLoading(true);
    setAudioFinished(false);
    setAudioPlaying(false);

    try {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
    } catch {
      // ignore
    }

    const fetchAudio = async () => {
      const modalOpenTs = Date.now();
      postTiming([{ event: "play_audio_modal_open", timestamp: modalOpenTs }]);
      try {
        const res = await fetch(
          `/api/playback-assets?participantId=${encodeURIComponent(
            participantId
          )}&taskId=${encodeURIComponent(taskId)}&conditionId=${encodeURIComponent(condition)}`,
          { signal: ac.signal }
        );
        if (seq !== playbackFetchSeqRef.current) return;
        if (!res.ok) {
          setPlaybackReady(null);
          return;
        }
        const data = await res.json().catch(() => null);
        if (seq !== playbackFetchSeqRef.current) return;
        if (data?.audioUrl && typeof data.audioUrl === "string") {
          setPlaybackReady({
            url: data.audioUrl,
            taskId,
            condition,
          });
        } else {
          setPlaybackReady(null);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        console.warn("failed to load playback asset", e);
        if (seq !== playbackFetchSeqRef.current) return;
        setPlaybackReady(null);
      } finally {
        if (seq === playbackFetchSeqRef.current) {
          setPlaybackLoading(false);
        }
      }
    };
    void fetchAudio();

    return () => {
      ac.abort();
    };
  }, [participantId, currentTask?.taskId, currentTask?.condition]);

  const currentNote = customNotes[currentTaskIndex] || "";
  const notePrompt = (() => {
    switch (currentTask?.taskId) {
      case "BIRTHDAY_GIFT":
        return "トピック: 誕生日プレゼントを贈る相手を入力してください。。";
      case "FAREWELL_PARTY":
        return "トピック: 知人を入力してください。";
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
        return "例: 先輩 / 担任の先生 / 同僚";
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
      return currentTask.scenario.replace("知人", currentNote);
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

  const canStart =
    !sessionActive &&
    stage === "voice" &&
    audioFinished &&
    !audioPlaying &&
    !historyLoading &&
    (remainingTime === null || remainingTime > 0);

  const submitSurvey = async (payload: {
    stage: "post" | "followup";
    answers: any;
  }) => {
    if (!participantId || !currentTask) return;
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          session: "s2",
          taskId: currentTask.taskId,
          stage: payload.stage,
          condition: currentTask.condition,
          answers: payload.answers,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("s2 survey submit failed", err);
      }
    } catch (e) {
      console.error("s2 survey submit error", e);
    }
  };

  const handlePlayAudio = async () => {
    if (!currentTask) return;
    const asset = playbackReady;
    if (
      !asset ||
      asset.taskId !== currentTask.taskId ||
      asset.condition !== currentTask.condition
    ) {
      if (playbackLoading) {
        toast.info("音声を読み込み中です。しばらくお待ちください。");
      } else {
        alert("音声が設定されていません。少し待ってから再度お試しください。");
      }
      return;
    }
    const startTs = Date.now();
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener("ended", () => {
          setAudioPlaying(false);
          setAudioFinished(true);
          setIsFollowupOpen(true);
          postTiming([{ event: "play_audio_ended", timestamp: Date.now() }]);
        });
      }
      const el = audioRef.current;
      el.pause();
      el.src = asset.url;
      el.load();
      setAudioFinished(false);
      setIsFollowupOpen(false);
      setFollowupDraft(followupAnswers[currentTaskIndex] || createFollowupAnswer());
      setAudioPlaying(true);
      await el.play();
      postTiming([{ event: "play_audio_started", timestamp: startTs }]);
    } catch (e) {
      console.error("audio play failed", e);
      setAudioPlaying(false);
      setAudioFinished(false);
      alert("音声の再生に失敗しました。");
    }
  };

  const handleNextTask = (force?: boolean) => {
    if (currentTaskIndex >= orderedTasks.length - 1) return;
    if (stage === "voice" && !voiceCompleted && !force) return;
    if (stage === "post" && !postCompleted[currentTaskIndex] && !force) return;
    playbackFetchSeqRef.current += 1;
    setPlaybackReady(null);
    setPlaybackLoading(false);
    try {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
    } catch {
      // ignore
    }
    setCurrentTaskIndex((idx) => idx + 1);
    setAudioPlaying(false);
    setAudioFinished(false);
    setVoiceCompleted(false);
    setRemainingTime(null);
    setStage("voice");
    stopFullRecordingAndUpload();
    persistStage(currentTaskIndex + 1, "voice");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingTime(null);
    stopFullRecordingAndUpload();
  };

  const handleTaskComplete = () => {
    setVoiceCompleted(true);
    setStage("post");
    // このタスクのポストアンケから再開できるように保持（完了送信時に次タスクへ進める）
    persistStage(currentTaskIndex, "post");
    const started = taskStartAtRef.current;
    const durationMs = started ? Math.min(5 * 60 * 1000, Date.now() - started) : 5 * 60 * 1000;
    postTiming([{ event: "session_stop", extra: { searchDurationMs: durationMs } }]);
    taskStartAtRef.current = null;
    stopSessionRef.current?.();
    setSessionActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingTime(null);
    stopFullRecordingAndUpload();
  };

  const handleFollowupSave = () => {
    if (
      !followupDraft.q11.trim() ||
      !followupDraft.q12 ||
      !followupDraft.q21 ||
      !followupDraft.q22 ||
      !followupDraft.q31.trim() ||
      !followupDraft.q32 ||
      !followupDraft.q41.trim() ||
      !followupDraft.q42
    ) {
      alert("すべての項目に回答してください。");
      return;
    }
    const nextAnswers = [...followupAnswers];
    nextAnswers[currentTaskIndex] = { ...followupDraft };
    setFollowupAnswers(nextAnswers);
    submitSurvey({
      stage: "followup",
      answers: followupDraft,
    });
    const savedAt = Date.now();
    modalSavedAtRef.current = savedAt;
    postTiming([{ event: "play_audio_modal_saved", timestamp: savedAt }]);
    setFollowupDraft(createFollowupAnswer());
    setIsFollowupOpen(false);
  };

  const handlePostAnswerChange = (
    key: "q1" | "q21" | "q22" | "q31" | "q32" | "q4",
    value: string
  ) => {
    const next = [...postAnswers];
    next[currentTaskIndex] = {
      ...next[currentTaskIndex],
      [key]: value,
    };
    setPostAnswers(next);
    const completedNext = [...postCompleted];
    completedNext[currentTaskIndex] = false;
    setPostCompleted(completedNext);
  };

  const handlePostSubmit = () => {
    const ans = postAnswers[currentTaskIndex];
    if (
      !ans.q1.trim() ||
      !ans.q21 ||
      !ans.q22.trim() ||
      !ans.q31 ||
      !ans.q32.trim() ||
      !ans.q4.trim()
    ) {
      alert("すべての項目に回答してください。");
      return;
    }
    submitSurvey({
      stage: "post",
      answers: ans,
    });
    const completedNext = [...postCompleted];
    completedNext[currentTaskIndex] = true;
    setPostCompleted(completedNext);
    if (currentTaskIndex >= orderedTasks.length - 1) {
      router.push("/s2/impressions");
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(PROGRESS_IDX_KEY);
        window.sessionStorage.removeItem(PROGRESS_STAGE_KEY);
      }
    } else {
      persistStage(currentTaskIndex + 1, "voice");
      handleNextTask(true);
    }
  };

  const handleStartSession = () => {
    if (timerRef.current) return;
    setRemainingTime((prev) => (prev === null ? 5 * 60 : prev));
    startFullRecording();
    const now = Date.now();
    const extra: any = {};
    if (modalSavedAtRef.current) {
      extra.playAudioToStartMs = now - modalSavedAtRef.current;
    }
    if (taskStartAtRef.current === null) {
      taskStartAtRef.current = now;
      postTiming([{ event: "session_start", timestamp: now, extra }]);
    }
    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          timerRef.current = null;
          setRemainingTime(0);
          setVoiceCompleted(true);
          setStage("post");
          toast.warning("5分経過しました。アンケートに進んでください。");
          stopSessionRef.current?.();
          setSessionActive(false);
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
  };

  if (!canAccess) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10 space-y-6">
      {participantId && (
        <div className="flex justify-end">
          <Badge variant="secondary" className="px-3 py-1">
            ID: {participantId}
          </Badge>
        </div>
      )}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Session 2</h1>
        <p className="text-sm text-muted-foreground">
          2回目（3タスク連続）。サーチヒストリー音声再生 → 対話開始 → 完了 の流れです。検索時間は5分です。終了後にアンケートに答えてください。
        </p>
        {participantId && (
          <p className="text-xs text-muted-foreground">
            兵庫県立大学のメールアドレス: <span className="font-semibold text-foreground">{participantId}</span>
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
          {stage === "voice" && (
            <Button
              onClick={handlePlayAudio}
              disabled={audioPlaying || playbackLoading || !playbackReady}
            >
              {audioPlaying
                ? "再生中..."
                : playbackLoading
                  ? "読み込み中..."
                  : "サーチヒストリー音声再生"}
            </Button>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {stage === "voice"
              ? audioFinished
                ? "対話開始 で検索を開始できます。"
                : "サーチヒストリー音声再生 を実行してください。"
              : "アンケートに回答してください。"}
          </span>
          {stage === "voice" && remainingTime !== null && (
            <span className="text-sm font-semibold text-red-500">
              残り時間: {Math.floor(remainingTime / 60)}分{remainingTime % 60}秒
            </span>
          )}
        </div>
      </Card>

      {stage === "voice" && (
        <>
      <VoicePanel
        title="VoicePanel"
        canStart={canStart}
        initialMessages={historyMessages}
        onSessionStateChange={setSessionActive}
        onStart={handleStartSession}
        onStopSessionReady={(stop) => {
          stopSessionRef.current = stop;
        }}
        onUserSpeechStart={(ts) => {
          if (lastAssistantEndRef.current) {
            postTiming([
              {
                event: "assistant_end_to_user_start",
                timestamp: ts,
                extra: {
                  delayMs: ts - lastAssistantEndRef.current,
                  assistantEndedAt: lastAssistantEndRef.current,
                  userStartedAt: ts,
                  assistantTurnIndex: lastAssistantTurnIndexRef.current,
                  assistantText: lastAssistantTextRef.current,
                },
              },
            ]);
          }
        }}
        onUserSpeechFinal={(text, startedAt, endedAt) => {
          postTurns([
            { role: "user", text, startedAt, endedAt, durationMs: endedAt - startedAt },
          ]);
        }}
        onAssistantSpeechStart={(ts) => {
          // no-op for now
        }}
          onAssistantSpeechEnd={(text, startedAt, endedAt) => {
            lastAssistantEndRef.current = endedAt;
            lastAssistantTurnIndexRef.current = turnIndex;
            lastAssistantTextRef.current = text ?? null;
            postTurns([
              {
                role: "assistant",
                text,
                startedAt,
                endedAt,
                durationMs: endedAt - startedAt,
              },
            ]);
          }}
        onCombinedStreamReady={(getter) => {
          combinedStreamGetterRef.current = getter;
        }}
      />
          <div className="flex justify-end">
            <Button
              onClick={handleTaskComplete}
              disabled={voiceCompleted}
              variant="secondary"
            >
              対話を終了しタスクを完了
            </Button>
          </div>
        </>
      )}

      {stage === "post" && (
        <Card className="p-4 space-y-4">
          <p className="text-sm font-medium">タスク終了アンケート</p>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q1. 1回目と2回目の検索を踏まえて、最終的にどのような計画を立てましたか？できるだけ具体的に書いてください。（自由記述）
            </p>
            <Textarea
              value={postAnswers[currentTaskIndex]?.q1 || ""}
              onChange={(e) => handlePostAnswerChange("q1", e.target.value)}
              placeholder="自由記述"
              rows={10}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q2-1. 今回の検索中（2回目）、どんな質問をしようか悩まずに検索ができたと感じましたか？
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {["全くそう思わない", "あまりそう思わない", "どちらともいえない", "ややそう思う", "かなりそう思う"].map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`s2-post-q21-${currentTaskIndex}`}
                    value={label}
                    checked={(postAnswers[currentTaskIndex]?.q21 || "") === label}
                    onChange={(e) => handlePostAnswerChange("q21", e.target.value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q2-2. Q2-1の理由を教えてください。（自由記述）
            </p>
            <Textarea
              value={postAnswers[currentTaskIndex]?.q22 || ""}
              onChange={(e) => handlePostAnswerChange("q22", e.target.value)}
              placeholder="自由記述"
              rows={10}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q3-1. 今回の検索（2回目の検索）で、目的を十分に達成したと感じましたか？
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {["全くそう思わない", "あまりそう思わない", "どちらともいえない", "ややそう思う", "かなりそう思う"].map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`s2-post-q31-${currentTaskIndex}`}
                    value={label}
                    checked={(postAnswers[currentTaskIndex]?.q31 || "") === label}
                    onChange={(e) => handlePostAnswerChange("q31", e.target.value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q3-2. Q3-1の理由を教えてください。（自由記述）
            </p>
            <Textarea
              value={postAnswers[currentTaskIndex]?.q32 || ""}
              onChange={(e) => handlePostAnswerChange("q32", e.target.value)}
              placeholder="自由記述"
              rows={10}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q4. 今回の検索でサーチヒストリー音声について感じたことを自由に記述してください。（自由記述）
            </p>
            <Textarea
              value={postAnswers[currentTaskIndex]?.q4 || ""}
              onChange={(e) => handlePostAnswerChange("q4", e.target.value)}
              placeholder="自由記述"
              rows={10}
            />
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

      <Dialog
        open={isFollowupOpen}
        onOpenChange={(open) => {
          if (open) setIsFollowupOpen(true);
        }}
      >
        <DialogContent
          className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>以下について記載ください</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              Q1-1. 前回の検索で調べたこと/決まったことを思い出して箇条書きで書いてください（覚えていない場合は覚えていないと記載ください）
            </p>
            <Textarea
              value={followupDraft.q11}
              onChange={(e) =>
                setFollowupDraft((prev) => ({ ...prev, q11: e.target.value }))
              }
              placeholder="箇条書きで入力してください"
              rows={10}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q1-2. サーチヒストリー音声は前回の検索で調べたこと/決まったことを思い出すのに役に立ちましたか？
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {followupLikertOptions.map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`followup-q12-${currentTaskIndex}`}
                    value={label}
                    checked={followupDraft.q12 === label}
                    onChange={(e) =>
                      setFollowupDraft((prev) => ({ ...prev, q12: e.target.value }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q2-1. サーチヒストリー音声を理解するのは容易であると感じましたか？
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {followupLikertOptions.map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`followup-q21-${currentTaskIndex}`}
                    value={label}
                    checked={followupDraft.q21 === label}
                    onChange={(e) =>
                      setFollowupDraft((prev) => ({ ...prev, q21: e.target.value }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q2-2. サーチヒストリー音声の長さは適切だと感じましたか？
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {followupLikertOptions.map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`followup-q22-${currentTaskIndex}`}
                    value={label}
                    checked={followupDraft.q22 === label}
                    onChange={(e) =>
                      setFollowupDraft((prev) => ({ ...prev, q22: e.target.value }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold">
              Q3-1. 前回の検索で次に調べようと思っていたことを思い出して箇条書きで書いてください（覚えていない場合は覚えていないと記載ください）
            </p>
            <Textarea
              value={followupDraft.q31}
              onChange={(e) =>
                setFollowupDraft((prev) => ({ ...prev, q31: e.target.value }))
              }
              placeholder="箇条書きで入力してください"
              rows={10}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q3-2. サーチヒストリー音声は前回の検索で次に調べようとしていた内容を思い出すのに役に立ちましたか？
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {followupLikertOptions.map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`followup-q32-${currentTaskIndex}`}
                    value={label}
                    checked={followupDraft.q32 === label}
                    onChange={(e) =>
                      setFollowupDraft((prev) => ({ ...prev, q32: e.target.value }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold">
              Q4-1. 次に調べようと思いついたことがあれば箇条書きで書いてください（Q3-1と同じ内容であっても良い）
            </p>
            <Textarea
              value={followupDraft.q41}
              onChange={(e) =>
                setFollowupDraft((prev) => ({ ...prev, q41: e.target.value }))
              }
              placeholder="箇条書きで入力してください"
              rows={10}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q4-2. サーチヒストリー音声は次に調べることを思いつくのに役立ちましたか？
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {followupLikertOptions.map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`followup-q42-${currentTaskIndex}`}
                    value={label}
                    checked={followupDraft.q42 === label}
                    onChange={(e) =>
                      setFollowupDraft((prev) => ({ ...prev, q42: e.target.value }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter className="flex justify-end">
            <Button onClick={handleFollowupSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
