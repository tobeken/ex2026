"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

export default function ImpressionsPage() {
  const router = useRouter();
  const [notes, setNotes] = useState({
    t1: "",
    t2: "",
    t3: "",
  });

  const handleSubmit = () => {
    if (!notes.t1.trim() || !notes.t2.trim() || !notes.t3.trim()) {
      alert("各タスクの感想を入力してください。");
      return;
    }
    // TODO: submit to backend if needed
    router.push("/s2/complete");
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
