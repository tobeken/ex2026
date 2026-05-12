"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

const ageOptions = ["10代", "20代", "30代", "40代", "50代", "60代以上", "回答を控える"];
const genderOptions = ["男性", "女性", "その他", "答えたくない"];

type TaskId = "BIRTHDAY_GIFT" | "FAREWELL_PARTY" | "WEEKEND_TRIP";
type GroupId = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7" | "G8" | "G9";

const TASK_LABELS: Record<TaskId, string> = {
  BIRTHDAY_GIFT: "誕生日プレゼントのサーチヒストリー",
  FAREWELL_PARTY: "送別会の計画のサーチヒストリー",
  WEEKEND_TRIP: "休日旅行の計画のサーチヒストリー",
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
] as const;

const buildPlan = (tasks: TaskId[], conditions: (typeof CONDITION_ORDERS)[number]) =>
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

export default function ImpressionsPage() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [participantGroup, setParticipantGroup] = useState<GroupId>("G1");
  const [q1, setQ1] = useState<string>(ageOptions[0]);
  const [q2, setQ2] = useState<string>(genderOptions[0]);
  const [q3, setQ3] = useState<string[]>([]);
  const [q4, setQ4] = useState<string[]>([]);
  const [q5, setQ5] = useState("");
  const [q6, setQ6] = useState<number>(0);
  const [q7, setQ7] = useState("");
  const [q8, setQ8] = useState<TaskId | "">("");
  const [q9, setQ9] = useState("");

  const q8OptionsInSessionOrder = useMemo(() => {
    const plan = ASSIGNMENT_PLAN[participantGroup] || ASSIGNMENT_PLAN.G1;
    return plan.map(({ taskId }) => taskId);
  }, [participantGroup]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("participantId") || "";
      setParticipantId(stored);
      const storedGroup =
        (window.sessionStorage.getItem("participantGroup") as GroupId | null) || "G1";
      setParticipantGroup(storedGroup);
    }
  }, []);

  const handleSubmit = async () => {
    if (!participantId) {
      alert("兵庫県立大学のメールアドレスがありません。ログインからやり直してください。");
      return;
    }
    if (!q8 || !q9.trim()) {
      alert("Q8およびQ9にすべて回答してください。");
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
          answers: {
            q1,
            q2,
            q3,
            q4,
            q5,
            q6,
            q7,
            q8,
            q9,
          },
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
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId,
            session: "s2",
            taskIndex: 2,
            stage: "complete",
            completed: true,
          }),
        });
      } catch (e) {
        console.warn("failed to mark s2 complete", e);
      }
      router.push("/s2/complete");
    } catch (e) {
      console.error("s2 impressions submit error", e);
      alert("送信に失敗しました。ネットワークを確認してください。");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">以下のアンケートに回答してください</h1>
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Q1. あなたの年代を選択してください
          </p>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={q1}
            onChange={(e) => setQ1(e.target.value)}
          >
            {ageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Q2. 性別について教えてください</p>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={q2}
            onChange={(e) => setQ2(e.target.value)}
          >
            {genderOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Q3. 利用したことのある音声対話型検索システムについて教えてください（複数選択可）
          </p>
          <div className="flex flex-col gap-2 text-sm">
            {["Alexa", "GoogleHome", "Siri", "生成AI（ChatGPT、Geminiなど）の音声対話", "その他", "利用したことがない"].map((label) => (
              <label key={label} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={label}
                  checked={q3.includes(label)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setQ3((prev) =>
                      checked ? [...prev, label] : prev.filter((v) => v !== label)
                    );
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Q4. 音声対話型検索システムの利用目的について教えてください（複数選択可）
          </p>
          <div className="flex flex-col gap-2 text-sm">
            {[
              "天気予報の確認",
              "音楽を聴く",
              "音声入力",
              "テキストやメールの送信",
              "交通情報",
              "家電のコントロール",
              "デスクトップと同じ情報検索",
              "使ったことがないのでわからない",
              "その他",
            ].map((label) => (
              <label key={label} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={label}
                  checked={q4.includes(label)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setQ4((prev) =>
                      checked ? [...prev, label] : prev.filter((v) => v !== label)
                    );
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Q5. 音声対話型検索システムの利用頻度について教えてください
          </p>
          <div className="flex flex-col gap-2 text-sm">
            {["毎日", "週4〜5回", "週2〜3回", "週1回", "週1回未満", "使ったことがない"].map(
              (label, idx) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="q5"
                    value={label}
                    checked={q5 === label}
                    onChange={(e) => setQ5(e.target.value)}
                  />
                  {label}
                </label>
              )
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Q6. 音声対話型検索システムへの信頼度について5段階で教えてください
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            {[
              [1, "全く信頼していない"],
              [2, "あまり信頼していない"],
              [3, "どちらでもない"],
              [4, "まあ信頼している"],
              [5, "とても信頼している"],
            ].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="q6"
                    value={val}
                    checked={q6 === val}
                    onChange={(e) => setQ6(Number(e.target.value))}
                  />
                  {label}
                </label>
              ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Q7. ３つのトピックで聞いたサーチヒストリー音声について感じたことを自由に記述してください
          </p>
          <Textarea
            value={q7}
            onChange={(e) => setQ7(e.target.value)}
            placeholder="自由記述"
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Q8. 実験2回目において、音声での検索を最も始めやすかったと感じたサーチヒストリー音声はどれですか？
          </p>
          <p className="text-xs text-muted-foreground">
            以下は、実験2回目でトピックが提示された順番です。
          </p>
          <div className="flex flex-col gap-2 text-sm">
            {q8OptionsInSessionOrder.map((taskId) => (
              <label key={taskId} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="q8"
                  value={taskId}
                  checked={q8 === taskId}
                  onChange={() => setQ8(taskId)}
                />
                {TASK_LABELS[taskId]}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Q9. Q8で答えた理由を記述してください
          </p>
          <Textarea
            value={q9}
            onChange={(e) => setQ9(e.target.value)}
            placeholder="自由記述"
            rows={6}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit}>送信</Button>
        </div>
      </Card>
    </div>
  );
}
