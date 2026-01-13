"use server";

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const GROUPS = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9"] as const;
type GroupId = (typeof GROUPS)[number];

const createSchema = z.object({
  id: z.string().min(1),
  group: z.enum(GROUPS).optional(),
});

const TASK_ORDERS = [
  ["BIRTHDAY_GIFT", "FAREWELL_PARTY", "WEEKEND_TRIP"],
  ["FAREWELL_PARTY", "WEEKEND_TRIP", "BIRTHDAY_GIFT"],
  ["WEEKEND_TRIP", "BIRTHDAY_GIFT", "FAREWELL_PARTY"],
] as const;

const CONDITION_ORDERS = [
  ["SUMMARY", "NARRATIVE", "NONE"],
  ["NARRATIVE", "NONE", "SUMMARY"],
  ["NONE", "SUMMARY", "NARRATIVE"],
] as const;

const buildPlan = (
  tasks: (typeof TASK_ORDERS)[number],
  conditions: (typeof CONDITION_ORDERS)[number]
) =>
  tasks.map((taskId, idx) => ({
    orderIndex: idx + 1,
    taskId,
    conditionId: conditions[idx],
  }));

const assignmentPlan: Record<GroupId, ReturnType<typeof buildPlan>> = {
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

export async function GET() {
  try {
    const participants = await prisma.participant.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(participants);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("GET /api/participants error:", errorMessage, errorStack ? "\n" + errorStack : "");
    return NextResponse.json(
      { error: "Failed to fetch participants", detail: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = createSchema.parse(json);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.participant.findUnique({
        where: { id: body.id },
      });

      let resolvedGroup = existing?.group;

      // 既存参加者はグループを維持して再登録扱い（上書きしない）
      if (!resolvedGroup) {
        // groupが未指定なら、現在の件数をもとにラウンドロビンで決定
        resolvedGroup = body.group;
        if (!resolvedGroup) {
          const counts = await tx.participant.groupBy({
            by: ["group"],
            _count: true,
          });
          const countMap: Record<GroupId, number> = {
            G1: 0,
            G2: 0,
            G3: 0,
            G4: 0,
            G5: 0,
            G6: 0,
            G7: 0,
            G8: 0,
            G9: 0,
          };
          counts.forEach((c) => {
            countMap[c.group as GroupId] = c._count;
          });
          // 最小件数のグループを優先（G1..G9の順でタイブレーク）
          const order = [...GROUPS].sort((a, b) => countMap[a] - countMap[b]);
          resolvedGroup = order[0];
        }
      }

      const assignments = assignmentPlan[resolvedGroup];

      // 既存ならそのまま返し、新規なら作成
      const participant =
        existing ??
        (await tx.participant.create({
          data: {
            id: body.id,
            group: resolvedGroup,
          },
        }));

      // 参加者ごとに3件の Assignment を upsert（ユニークキー participantId+taskId を利用）
      await Promise.all(
        assignments.map((a) =>
          tx.assignment.upsert({
            where: {
              participantId_taskId: {
                participantId: participant.id,
                taskId: a.taskId,
              },
            },
            update: {
              orderIndex: a.orderIndex,
              conditionId: a.conditionId,
            },
            create: {
              participantId: participant.id,
              orderIndex: a.orderIndex,
              taskId: a.taskId,
              conditionId: a.conditionId,
            },
          }),
        ),
      );

      // PlaybackAsset も participant × task × condition でプレースホルダを用意しておく
      await Promise.all(
        assignments.map((a) =>
          tx.playbackAsset.upsert({
            where: {
              participantId_taskId_conditionId: {
                participantId: participant.id,
                taskId: a.taskId,
                conditionId: a.conditionId,
              },
            },
            // 既存がある場合は audioUrl を上書きしない（手動セットを維持）
            update: {},
            create: {
              participantId: participant.id,
              taskId: a.taskId,
              conditionId: a.conditionId,
              audioUrl: "",
            },
          }),
        ),
      );

      return participant;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("POST /api/participants validation error", error.issues);
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("POST /api/participants error:", errorMessage, errorStack ? "\n" + errorStack : "");
    return NextResponse.json(
      { error: "Failed to create participant", detail: errorMessage },
      { status: 500 },
    );
  }
}
