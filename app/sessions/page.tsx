"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SessionsPage() {
  const [participantId, setParticipantId] = useState("");
  const [practiceDone, setPracticeDone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("participantId") || "";
      setParticipantId(stored);

      const practiced = window.sessionStorage.getItem("practiceDone") === "true";
      setPracticeDone(practiced);
    }
  }, []);

  const hasId = participantId.trim().length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Session 選択</h1>
        <p className="text-sm text-muted-foreground">
          ログイン済みの参加者IDで Session1 / Session2 へ進んでください。
        </p>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-medium">練習タスク</p>
          <p className="text-sm text-muted-foreground">
            ダークチョコレートについて（アンケート → 音声対話 → アンケート）
          </p>
        </div>
        <Button asChild disabled={!hasId || practiceDone} variant="outline">
          <Link href="/practice">練習へ</Link>
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-medium">Session 1</p>
            <p className="text-sm text-muted-foreground">3タスク（1回目）</p>
          </div>
          <Button asChild disabled={!hasId}>
            <Link href="/s1">Session1へ</Link>
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-medium">Session 2</p>
            <p className="text-sm text-muted-foreground">3タスク（2回目）</p>
          </div>
          <Button asChild disabled={!hasId} variant="secondary">
            <Link href="/s2">Session2へ</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
