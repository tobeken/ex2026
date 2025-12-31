"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import TaskSurvey from "@/components/task-survey";
import VoicePanel from "@/components/voice-panel";

const STORAGE_KEY_PRACTICE_DONE = "practiceDone";

const practiceTask = {
  title: "練習: ダークチョコレートについて",
  condition: "PRACTICE",
  scenario:
    "あなたは、ダークチョコレートについて関心を持ち、情報を調べることにしました。ダークチョコレートとは何か、どのような特徴があるのかについて調べてください。また、健康への影響や、どの程度の量を摂取するのが適切かなど、気になる点についても情報を調べながら理解を深めてください。必要に応じて、価格や購入のしやすさなどについても調べても構いません。",
};

export default function PracticePage() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [stage, setStage] = useState<"survey" | "voice" | "post">("survey");
  const [sessionActive, setSessionActive] = useState(false);
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [postAnswers, setPostAnswers] = useState({ q1: "", q2: "" });
  const [postCompleted, setPostCompleted] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const canStart = !sessionActive && stage === "voice";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("participantId") || "";
      setParticipantId(stored);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const submitSurvey = async (payload: {
    stage: "pre" | "post";
    answers: any;
  }) => {
    if (!participantId) return;
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          session: "practice",
          taskId: "PRACTICE",
          stage: payload.stage,
          condition: practiceTask.condition,
          answers: payload.answers,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("practice survey submit failed", err);
      }
    } catch (e) {
      console.error("practice survey submit error", e);
    }
  };

  const handleSaveNote = () => {
    setNoteSaved(note.trim().length > 0);
    toast.success("保存しました");
  };

  const handleSurveySubmit = (answers: Record<string, string>) => {
    if (!noteSaved) {
      alert("自由記述を保存してください。");
      return;
    }
    submitSurvey({
      stage: "pre",
      answers: {
        note,
        ...answers,
      },
    });
    setStage("voice");
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

  const handleTaskComplete = () => {
    if (sessionActive) return;
    setVoiceCompleted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingTime(null);
    setStage("post");
  };

  const handlePostSubmit = () => {
    if (!postAnswers.q1.trim() || !postAnswers.q2.trim()) {
      alert("Q1とQ2に回答してください。");
      return;
    }
    submitSurvey({
      stage: "post",
      answers: {
        q1: postAnswers.q1,
        q2: postAnswers.q2,
      },
    });
    setPostCompleted(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY_PRACTICE_DONE, "true");
    }
    router.push("/sessions");
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
        <h1 className="text-2xl font-semibold">練習タスク</h1>
        <p className="text-sm text-muted-foreground">
          Start / Stop で検索を行い、終了後にアンケートに回答してください。
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-medium">Step 1 / 1</p>
            <p className="text-lg font-semibold">{practiceTask.title}</p>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Condition:</span>
              <Badge variant="outline">{practiceTask.condition}</Badge>
            </div>
            <p className="text-sm text-foreground mt-2 leading-6 font-medium">
              {practiceTask.scenario}
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
            <p className="text-sm font-medium">トピック: 自由記述</p>
            <Textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteSaved(false);
              }}
              placeholder="例: 何を調べたいか、気になっている点など"
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
            topic={practiceTask.title}
            scenario={practiceTask.scenario}
            onSubmit={handleSurveySubmit}
          />
        </div>
      )}

      {stage === "voice" && (
        <div className="space-y-4">
          <VoicePanel
            canStart={canStart}
            title={`VoicePanel - ${practiceTask.title}`}
            onSessionStateChange={setSessionActive}
            onStart={handleStartSession}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleTaskComplete}
              disabled={sessionActive || voiceCompleted}
              variant="secondary"
            >
              タスク完了
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
              value={postAnswers.q1}
              onChange={(e) => setPostAnswers((prev) => ({ ...prev, q1: e.target.value }))}
              placeholder="箇条書きで記載してください"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Q2. まだ調べ残っていることや次に調べたいことを箇条書きで書いてください
            </p>
            <Textarea
              value={postAnswers.q2}
              onChange={(e) => setPostAnswers((prev) => ({ ...prev, q2: e.target.value }))}
              placeholder="箇条書きで記載してください"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePostSubmit} disabled={postCompleted}>
              アンケート送信（完了）
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
