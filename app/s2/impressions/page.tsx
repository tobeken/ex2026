"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

export default function ImpressionsPage() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [notes, setNotes] = useState({
    t1: "",
    t2: "",
    t3: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("participantId") || "";
      setParticipantId(stored);
    }
  }, []);

  const handleSubmit = async () => {
    if (!notes.t1.trim() || !notes.t2.trim() || !notes.t3.trim()) {
      alert("各タスクの感想を入力してください。");
      return;
    }
    if (!participantId) {
      alert("参加者IDがありません。ログインからやり直してください。");
      return;
    }

    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          session: "s2",
          taskId: "S2_IMPRESSIONS",
          stage: "impressions",
          condition: "NONE",
          answers: notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("s2 impressions submit failed", err);
        alert("送信に失敗しました。もう一度お試しください。");
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("session2Done", "true");
      }
      router.push("/s2/complete");
    } catch (e) {
      console.error("s2 impressions submit error", e);
      alert("送信に失敗しました。ネットワークを確認してください。");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">検索過程の感想（タスク1〜3）</h1>
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold">タスク1の感想</p>
          <Textarea
            value={notes.t1}
            onChange={(e) => setNotes((prev) => ({ ...prev, t1: e.target.value }))}
            placeholder="箇条書きで記入してください"
            className="min-h-[120px]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">タスク2の感想</p>
          <Textarea
            value={notes.t2}
            onChange={(e) => setNotes((prev) => ({ ...prev, t2: e.target.value }))}
            placeholder="箇条書きで記入してください"
            className="min-h-[120px]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">タスク3の感想</p>
          <Textarea
            value={notes.t3}
            onChange={(e) => setNotes((prev) => ({ ...prev, t3: e.target.value }))}
            placeholder="箇条書きで記入してください"
            className="min-h-[120px]"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>送信</Button>
        </div>
      </Card>
    </div>
  );
}
