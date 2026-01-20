"use server";

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const turnSchema = z.object({
  participantId: z.string().min(1),
  session: z.string().min(1),
  taskId: z.string().min(1),
  turnIndex: z.number().int(),
  role: z.enum(["user", "assistant"]),
  text: z.string().optional(),
  audioUrl: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  startedAt: z.string().or(z.date()),
  endedAt: z.string().or(z.date()),
});

const bulkSchema = z.array(turnSchema);
const querySchema = z.object({
  participantId: z.string().min(1),
  session: z.string().min(1),
  taskId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = querySchema.parse({
      participantId: url.searchParams.get("participantId"),
      session: url.searchParams.get("session"),
      taskId: url.searchParams.get("taskId"),
    });

    const turns = await prisma.conversationTurn.findMany({
      where: {
        participantId: query.participantId,
        session: query.session,
        taskId: query.taskId,
        text: { not: null },
      },
      orderBy: [{ turnIndex: "asc" }],
      select: {
        role: true,
        text: true,
        startedAt: true,
        endedAt: true,
      },
    });

    return NextResponse.json(turns);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("GET /api/conversation/turns error", msg);
    return NextResponse.json({ error: "Failed to fetch turns", detail: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const turns = bulkSchema.parse(json);

    const data = turns.map((t) => ({
      participantId: t.participantId,
      session: t.session,
      taskId: t.taskId,
      turnIndex: t.turnIndex,
      role: t.role,
      text: t.text ?? null,
      audioUrl: t.audioUrl ?? null,
      startedAt: new Date(t.startedAt),
      endedAt: new Date(t.endedAt),
      durationMs:
        typeof t.durationMs === "number"
          ? Math.max(0, t.durationMs)
          : new Date(t.endedAt).getTime() - new Date(t.startedAt).getTime(),
    }));

    // 直前のロールを取得し、assistant連続を1クエリとみなしてカウント
    const first = data[0];
    const lastTurn = await prisma.conversationTurn.findFirst({
      where: {
        participantId: first.participantId,
        session: first.session,
        taskId: first.taskId,
      },
      orderBy: { turnIndex: "desc" },
      select: { role: true },
    });

    await prisma.conversationTurn.createMany({ data });

    let prevRole: string | null = lastTurn?.role ?? null;
    let assistantStarts = 0;
    for (const t of data) {
      if (t.role === "assistant" && prevRole !== "assistant") {
        assistantStarts += 1;
      }
      prevRole = t.role;
    }

    if (assistantStarts > 0) {
      await prisma.conversationSummary.upsert({
        where: {
          participantId_session_taskId: {
            participantId: first.participantId,
            session: first.session,
            taskId: first.taskId,
          },
        },
        update: { userUtteranceCount: { increment: assistantStarts } },
        create: {
          participantId: first.participantId,
          session: first.session,
          taskId: first.taskId,
          userUtteranceCount: assistantStarts,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("POST /api/conversation/turns error", msg);
    return NextResponse.json({ error: "Failed to store turns", detail: msg }, { status: 500 });
  }
}
