 "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const ageOptions = ["10代", "20代", "30代", "40代", "50代", "60代以上", "回答を控える"];
const occupationOptions = [
  "会社員",
  "自営業",
  "専業主婦（主夫）",
  "学生",
  "該当なし",
  "回答を控える",
];
const educationOptions = [
  "中学校卒業",
  "高校卒業",
  "大学学部相当卒業",
  "大学院相当卒業",
  "その他",
  "回答を控える",
];
const genderOptions = ["男性", "女性", "その他", "答えたくない"];

export default function DemographicsPage() {
  const [age, setAge] = useState<string>(ageOptions[0]);
  const [occupation, setOccupation] = useState<string>(occupationOptions[0]);
  const [education, setEducation] = useState<string>(educationOptions[0]);
  const [gender, setGender] = useState<string>(genderOptions[0]);
  const [freeText, setFreeText] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    // TODO: send to backend when ready
    router.push("/s1/complete");
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">最後に、以下のアンケートに回答してください。</h1>

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Q1. 自由記述（必要に応じて記入してください）</p>
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="自由に記載してください"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Q2. あなたの年代を選択してください:</p>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          >
            {ageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4 border p-4 rounded-md">
          <div className="space-y-2">
            <p className="text-sm font-semibold">あなたの職業について教えてください</p>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            >
              {occupationOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">あなたの最終学歴を教えてください</p>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            >
              {educationOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">性別について教えてください</p>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              {genderOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit}>アンケート送信</Button>
        </div>
      </Card>
    </div>
  );
}
