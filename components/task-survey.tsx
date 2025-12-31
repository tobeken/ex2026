"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Option = {
  value: string;
  label: string;
};

const likertOptions: Option[] = [
  { value: "1", label: "まったくそう思わない" },
  { value: "2", label: "あまりそう思わない" },
  { value: "3", label: "どちらともいえない" },
  { value: "4", label: "ややそう思う" },
  { value: "5", label: "かなりそう思う" },
];

type Question = {
  id: string;
  text: string;
};

const defaultQuestions: Question[] = [
  { id: "interest", text: "Q. このトピックに興味があると思いますか？" },
  { id: "familiar", text: "Q. このトピックに自分が詳しいと思いますか？" },
  { id: "difficulty", text: "Q. このトピックに関する情報を調べることは難しそうだと思いますか？" },
];

type TaskSurveyProps = {
  topic: string;
  scenario: string;
  onSubmit: (answers: Record<string, string>) => void;
};

export function TaskSurvey({ topic, scenario, onSubmit }: TaskSurveyProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const canSubmit = defaultQuestions.every((q) => !!answers[q.id]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(answers);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          以下のトピックとシナリオを読んでから、アンケートに回答してください。
        </p>
        <p className="text-base font-semibold">{topic}</p>
        <p className="text-sm text-muted-foreground leading-6">{scenario}</p>
      </div>

      <div className="space-y-4">
        {defaultQuestions.map((q) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-medium">{q.text}</p>
            <div className="flex flex-wrap gap-3">
              {likertOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.value}
                    checked={answers[q.id] === opt.value}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          送信
        </Button>
      </div>
    </Card>
  );
}

export default TaskSurvey;
