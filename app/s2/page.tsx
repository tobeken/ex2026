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
  q5: {} as Record<string, string>, // pairwise weighting selection
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const [customNotes, setCustomNotes] = useState<string[]>(() => ["", "", ""]);
  const [followupPrevNotes, setFollowupPrevNotes] = useState<string[]>(() => ["", "", ""]);
  const [followupNextNotes, setFollowupNextNotes] = useState<string[]>(() => ["", "", ""]);
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);
  const [followupDraftPrev, setFollowupDraftPrev] = useState("");
  const [followupDraftNext, setFollowupDraftNext] = useState("");
  const [stage, setStage] = useState<"voice" | "post">("voice");
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
      const s2done = window.sessionStorage.getItem("session2Done") === "true";
      if (s2done) {
        router.replace("/sessions");
        return;
      }
      const s1done = window.sessionStorage.getItem("session1Done") === "true";
      if (!s1done) {
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
    setCurrentTaskIndex(0);
    setStage("voice");
    setVoiceCompleted(false);
    setAudioPlaying(false);
    setAudioFinished(false);
    setCustomNotes((prev) =>
      orderedTasks.map((_, idx) => (typeof prev[idx] === "string" ? prev[idx] : ""))
    );
      setFollowupPrevNotes((prev) =>
        orderedTasks.map((_, idx) => (typeof prev[idx] === "string" ? prev[idx] : ""))
      );
      setFollowupNextNotes((prev) =>
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

  useEffect(() => {
    const applyProgress = async () => {
      if (!participantId || orderedTasks.length === 0 || progressApplied) return;
      // 1) sessionStorage から進行中ステージ復元
      if (typeof window !== "undefined") {
        const storedIdx = Number(window.sessionStorage.getItem(PROGRESS_IDX_KEY) || "0");
        const storedStage =
          (window.sessionStorage.getItem(PROGRESS_STAGE_KEY) as "voice" | "post" | null) ||
          null;
        if (!Number.isNaN(storedIdx) && storedIdx >= 0 && storedIdx < orderedTasks.length) {
          setCurrentTaskIndex(storedIdx);
          if (storedStage === "post") {
            setStage("post");
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

  const persistStage = (idx: number, st: "voice" | "post") => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(PROGRESS_IDX_KEY, String(idx));
    window.sessionStorage.setItem(PROGRESS_STAGE_KEY, st);
  };

  useEffect(() => {
    const fetchAudio = async () => {
      if (!participantId || !currentTask) return;
      try {
        const res = await fetch(
          `/api/playback-assets?participantId=${encodeURIComponent(
            participantId
          )}&taskId=${encodeURIComponent(currentTask.taskId)}&conditionId=${encodeURIComponent(
            currentTask.condition
          )}`
        );
        if (!res.ok) {
          setAudioUrl(null);
          return;
        }
        const data = await res.json().catch(() => null);
        if (data?.audioUrl) {
          setAudioUrl(data.audioUrl as string);
        } else {
          setAudioUrl(null);
        }
      } catch (e) {
        console.warn("failed to load playback asset", e);
        setAudioUrl(null);
      }
    };
    fetchAudio();
    setAudioFinished(false);
    setAudioPlaying(false);
  }, [participantId, currentTask?.taskId, currentTask?.condition]);

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
      // 「短期旅行」を「短期<入力>旅行」にするなど、挿入する位置を工夫
      return currentTask.scenario
        .replace(/短期旅行/g, `短期${currentNote}旅行`)
        .replace(/休日旅行/g, `${currentNote}旅行`)
        .replace(/旅行/g, `${currentNote}旅行`);
    }
    return currentTask.scenario;
  })();

  const canStart = stage === "voice" && audioFinished && !audioPlaying;

  const tlxDimensions = [
    {
      key: "mental",
      label: "知的・知覚的要求",
      desc: "どの程度の知的・知覚的活動を必要としましたか。",
      minLabel: "小さい",
      maxLabel: "大きい",
    },
    {
      key: "physical",
      label: "身体的要求",
      desc: "身体的な活動量はどの程度でしたか。",
      minLabel: "小さい",
      maxLabel: "大きい",
    },
    {
      key: "temporal",
      label: "タイムプレッシャー",
      desc: "時間的切迫感はどの程度でしたか。",
      minLabel: "弱い",
      maxLabel: "強い",
    },
    {
      key: "performance",
      label: "作業成績",
      desc: "目標達成度はどの程度でしたか。",
      minLabel: "良い",
      maxLabel: "悪い",
    },
    {
      key: "effort",
      label: "努力",
      desc: "精神的・身体的な努力はどの程度必要でしたか。",
      minLabel: "少ない",
      maxLabel: "多い",
    },
    {
      key: "frustration",
      label: "フラストレーション",
      desc: "不安・落胆・いらいら・ストレスの程度はどのくらいでしたか。",
      minLabel: "低い",
      maxLabel: "高い",
    },
  ] as const;

  const tlxPairs = [
    ["mental", "frustration"],
    ["effort", "performance"],
    ["performance", "frustration"],
    ["temporal", "performance"],
    ["effort", "physical"],
    ["mental", "physical"],
    ["performance", "physical"],
    ["effort", "temporal"],
    ["mental", "effort"],
    ["effort", "frustration"],
    ["temporal", "physical"],
    ["mental", "temporal"],
    ["frustration", "physical"],
    ["mental", "performance"],
    ["temporal", "frustration"],
  ] as const;

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
    if (!audioUrl) {
      alert("音声が設定されていません。");
      return;
    }
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener("ended", () => {
          setAudioPlaying(false);
          setAudioFinished(true);
          setIsFollowupOpen(true);
        });
      }
      audioRef.current.src = audioUrl;
      setAudioFinished(false);
      setIsFollowupOpen(false);
      setFollowupDraftPrev(followupPrevNotes[currentTaskIndex] || "");
      setFollowupDraftNext(followupNextNotes[currentTaskIndex] || "");
      setAudioPlaying(true);
      await audioRef.current.play();
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
    setCurrentTaskIndex((idx) => idx + 1);
    setAudioPlaying(false);
    setAudioFinished(false);
    setVoiceCompleted(false);
    setStage("voice");
    persistStage(currentTaskIndex + 1, "voice");
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
    // このタスクのポストアンケから再開できるように保持（完了送信時に次タスクへ進める）
    persistStage(currentTaskIndex, "post");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingTime(null);
  };

  const handleFollowupSave = () => {
    if (!followupDraftPrev.trim() || !followupDraftNext.trim()) {
      alert("両方の内容を入力してください。");
      return;
    }
    const prevArr = [...followupPrevNotes];
    prevArr[currentTaskIndex] = followupDraftPrev;
    setFollowupPrevNotes(prevArr);
    const nextArr = [...followupNextNotes];
    nextArr[currentTaskIndex] = followupDraftNext;
    setFollowupNextNotes(nextArr);
    submitSurvey({
      stage: "followup",
      answers: { learned: followupDraftPrev, followup: followupDraftNext },
    });
    setFollowupDraftPrev("");
    setFollowupDraftNext("");
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
    const pairFilled = tlxPairs.every(
      ([a, b]) =>
        ans.q5 &&
        typeof ans.q5[`${a}|${b}`] === "string" &&
        (ans.q5[`${a}|${b}`] === a || ans.q5[`${a}|${b}`] === b)
    );
    if (!ans.q1.trim() || ans.q2 <= 0 || ans.q3 <= 0 || !tlxFilled || !pairFilled) {
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
          2回目（3タスク連続）。音声再生 → Start/Stop → Next の流れです。ID入力は不要です。
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
              Q2. 検索前のシステムの音声が記憶想起に役立ったと思いますか？
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {[1, 2, 3, 4, 5].map((n) => {
                const labels = ["全く当てはまらない", "あまり当てはまらない", "どちらでもない", "よく当てはまる", "とてもよく当てはまる"];
                return (
                  <label key={n} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q2-${currentTaskIndex}`}
                      value={n}
                      checked={(postAnswers[currentTaskIndex]?.q2 || 0) === n}
                      onChange={(e) => handlePostAnswerChange("q2", e.target.value)}
                    />
                    {labels[n - 1]}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q3. 検索前に提示されたシステムの音声は、検索を再開し、最初の検索を行う際に役立ちましたか？
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {[1, 2, 3, 4, 5].map((n) => {
                const labels = ["全く当てはまらない", "あまり当てはまらない", "どちらでもない", "よく当てはまる", "とてもよく当てはまる"];
                return (
                  <label key={n} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q3-${currentTaskIndex}`}
                      value={n}
                      checked={(postAnswers[currentTaskIndex]?.q3 || 0) === n}
                      onChange={(e) => handlePostAnswerChange("q3", e.target.value)}
                    />
                    {labels[n - 1]}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Q4. 認知負荷 (NASA-TLX) 各項目（1-5）</p>
            <p className="text-xs text-muted-foreground">
              1〜20のスライダーでお答えください（20段階）。
            </p>
            {tlxDimensions.map((dim) => (
              <div key={dim.key} className="space-y-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{dim.label}</p>
                  <p className="text-xs text-muted-foreground">{dim.desc}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{dim.minLabel}</span>
                    <span>{dim.maxLabel}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={postAnswers[currentTaskIndex]?.q4?.[dim.key] || 0}
                    onChange={(e) => handlePostAnswerChange("q4", e.target.value, dim.key)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    現在の値: {postAnswers[currentTaskIndex]?.q4?.[dim.key] || 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              2つの項目を比較し、より負荷に影響すると感じた項目を選んでください
            </p>
            <p className="text-xs text-muted-foreground">
              各ペアで一方を選択してください。
            </p>
            <div className="space-y-2">
              {tlxPairs.map(([a, b]) => {
                const pairKey = `${a}|${b}`;
                const current = postAnswers[currentTaskIndex]?.q5?.[pairKey] || "";
                return (
                  <div key={pairKey} className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={pairKey}
                        value={a}
                        checked={current === a}
                        onChange={(e) => {
                          const next = [...postAnswers];
                          const currentAns = next[currentTaskIndex];
                          next[currentTaskIndex] = {
                            ...currentAns,
                            q5: { ...currentAns.q5, [pairKey]: e.target.value },
                          };
                          setPostAnswers(next);
                          const completedNext = [...postCompleted];
                          completedNext[currentTaskIndex] = false;
                          setPostCompleted(completedNext);
                        }}
                      />
                      {tlxDimensions.find((d) => d.key === a)?.label}
                    </label>
                    <span className="text-muted-foreground">or</span>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={pairKey}
                        value={b}
                        checked={current === b}
                        onChange={(e) => {
                          const next = [...postAnswers];
                          const currentAns = next[currentTaskIndex];
                          next[currentTaskIndex] = {
                            ...currentAns,
                            q5: { ...currentAns.q5, [pairKey]: e.target.value },
                          };
                          setPostAnswers(next);
                          const completedNext = [...postCompleted];
                          completedNext[currentTaskIndex] = false;
                          setPostCompleted(completedNext);
                        }}
                      />
                      {tlxDimensions.find((d) => d.key === b)?.label}
                    </label>
                  </div>
                );
              })}
            </div>
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
            <DialogTitle>以下について記載ください</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              前回の検索で調べて分かったこと・理解したことを箇条書きで書いてください
            </p>
            <Textarea
              value={followupDraftPrev}
              onChange={(e) => setFollowupDraftPrev(e.target.value)}
              placeholder="箇条書きで入力してください"
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold">
              前回の検索を踏まえて、調べ残っていること、次に調べたい点を箇条書きで書いてください
            </p>
            <Textarea
              value={followupDraftNext}
              onChange={(e) => setFollowupDraftNext(e.target.value)}
              placeholder="箇条書きで入力してください"
              className="min-h-[120px]"
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
