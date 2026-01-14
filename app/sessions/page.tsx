"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SessionsPage() {
  const [participantId, setParticipantId] = useState("");
  const [session1Done, setSession1Done] = useState(false);
  const [session2Done, setSession2Done] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("participantId") || "";
      setParticipantId(stored);
      const s1done = window.sessionStorage.getItem("session1Done") === "true";
      setSession1Done(s1done);
      const s2done = window.sessionStorage.getItem("session2Done") === "true";
      setSession2Done(s2done);
    }
  }, []);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!participantId) return;
      try {
        const res = await fetch(
          `/api/progress?participantId=${encodeURIComponent(participantId)}`
        );
        if (!res.ok) return;
        const rows: Array<{ session: string; completed: boolean }> = await res.json();
        const s1 = rows.find((r) => r.session === "s1")?.completed ?? false;
        const s2 = rows.find((r) => r.session === "s2")?.completed ?? false;
        setSession1Done(s1);
        setSession2Done(s2);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("session1Done", s1 ? "true" : "false");
          window.sessionStorage.setItem("session2Done", s2 ? "true" : "false");
        }
      } catch (e) {
        console.warn("failed to fetch progress", e);
      }
    };
    fetchProgress();
  }, [participantId]);

  const hasId = participantId.trim().length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 space-y-6">
      {hasId && (
        <div className="flex justify-end">
          <Badge variant="secondary" className="px-3 py-1">
            ID: {participantId}
          </Badge>
        </div>
      )}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Session 選択</h1>
        <p className="text-sm text-muted-foreground">
          ログイン済みの参加者IDで Session1 / Session2 へ進んでください。
        </p>
        {hasId && (
          <p className="text-xs text-muted-foreground">
            参加者ID: <span className="font-semibold text-foreground">{participantId}</span>
          </p>
        )}
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-medium">練習タスク</p>
          <p className="text-sm text-muted-foreground">
            誕生日会の料理準備について（アンケート → 音声対話 → アンケート）
          </p>
        </div>
        <Button asChild disabled={!hasId} variant="outline">
          <Link href="/practice">練習へ</Link>
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-medium">Session 1</p>
            <p className="text-sm text-muted-foreground">3タスク（1回目）</p>
          </div>
          <Button asChild disabled={!hasId || session1Done} variant={session1Done ? "secondary" : "default"}>
            <Link href="/s1">{session1Done ? "完了済み" : "Session1へ"}</Link>
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-medium">Session 2</p>
            <p className="text-sm text-muted-foreground">3タスク（2回目）</p>
          </div>
          <Button
            asChild
            disabled={!hasId || !session1Done || session2Done}
            variant={!session1Done ? "secondary" : session2Done ? "secondary" : "default"}
          >
            <Link href="/s2">
              {!session1Done
                ? "Session1完了後"
                : session2Done
                ? "完了済み"
                : "Session2へ"}
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
