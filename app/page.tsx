"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function HomePage() {
  const [participantId, setParticipantId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const canProceed = participantId.trim().length > 0;

  const handleLogin = async () => {
    if (!canProceed || loading) return;
    setLoading(true);
    const pid = participantId.trim();
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pid }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("参加者登録に失敗しました", {
          description: err?.error || res.statusText,
        });
        setLoading(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("participantId", pid);
        if (data?.group) {
          window.sessionStorage.setItem("participantGroup", data.group);
        }
      }
      router.push("/sessions");
    } catch (error: any) {
      toast.error("参加者登録に失敗しました", {
        description: error?.message || "Network error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-12">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4 text-sm leading-7">
          <h1 className="text-2xl font-semibold mb-2">タスク参加にあたって</h1>
          <p>
            ランサーズ掲載「音声チャットボットを使った調べ物タスク」開始にあたり、本ウェブサイトは
            ランサーズに掲載中の「音声チャットボットを使った調べ物タスク」を行うためのサイトです。
          </p>
          <p>
            本タスクは、兵庫県立大学山本研究室が実施する研究プロジェクトの一環として行われます。タスク
            依頼者が用意した音声チャットボットを用いて調べ物をしながら、あるトピックに対する調べたことをまとめていただきます。
          </p>
          <p>
            本タスクは 2 つのトピックについて音声チャットボットと会話をしながら調べ物をしていただきます。
            調べ物が終了後、トピックについてあなたの調べた結果やシステムに関するアンケートに答えていただきます。
          </p>
          <p className="font-semibold">
            途中で辞めた場合は、一旦我々のシステムにデータが保存されますが、データ回収時に、当該データを削除します。
          </p>
          <p className="font-semibold">
            本タスクは PC のみで行うことができます。スマートフォンやタブレットからご参加することはできません。
          </p>
          <p>
            収集したデータは匿名化され、学術研究活動以外の目的で使用することはありません。アンケートが終了し、報酬が支払われたあとは、同意の撤回・データの削除はできませんのでご了承ください。
          </p>
          <p className="font-semibold">
            以上をお読みになり同意いただける方のみ、ログインボタンをクリックしてタスクを開始してください。
          </p>
        </div>

        <div className="md:col-span-1 flex md:justify-end">
          <Card className="p-6 space-y-4 w-full max-w-sm shadow-lg">
            <div className="space-y-2">
              <Label htmlFor="participantId" className="text-sm font-medium">
                参加者ID
              </Label>
              <Input
                id="participantId"
                value={participantId}
                placeholder="例: test01@example.com"
                onChange={(e) => setParticipantId(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button className="w-full" onClick={handleLogin} disabled={!canProceed || loading}>
                ログイン
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              参加者IDを入力してログインすると Session 選択画面に進みます。
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
