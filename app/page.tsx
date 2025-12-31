import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-16 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">実験エントリー</h1>
        <p className="text-sm text-muted-foreground">
          必要なページだけに絞りました。Session1 / Session2 へ進んでください。
        </p>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-medium">Session 1</p>
          <p className="text-sm text-muted-foreground">検索のみ（1回目）</p>
        </div>
        <Button asChild>
          <Link href="/s1">Session1へ</Link>
        </Button>
      </Card>

      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-medium">Session 2</p>
          <p className="text-sm text-muted-foreground">3タスク連続（2回目）</p>
        </div>
        <Button asChild>
          <Link href="/s2">Session2へ</Link>
        </Button>
      </Card>
    </div>
  );
}
