"use client";

import { Button } from "@/components/ui/button";

const applicationNumber = "XXXXXXXX";

export default function CompletePage() {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(applicationNumber);
      alert("終了コードをコピーしました。");
    } catch (e) {
      alert("コピーできませんでした。手動でコピーしてください。");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-2xl font-semibold">完了</h1>
      <div className="space-y-3 text-sm leading-7">
        <p>
          終了コードは「{applicationNumber}」です．GoogleChatにて担当者に送信してください．
        </p>
        <p>終了コードをコピーした後に，ログアウトください．</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleCopy}>終了コードをコピー</Button>
        <Button asChild variant="outline">
          <a href="/logout">ログアウトへ</a>
        </Button>
      </div>
    </div>
  );
}
