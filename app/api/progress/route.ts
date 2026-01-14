"use server";

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const sessionEnum = z.enum(["practice", "s1", "s2"]);
const stageEnum = z.enum(["survey", "voice", "post", "complete"]);

const getSchema = z.object({
  participantId: z.string().min(1),
  session: sessionEnum.optional(),
});

const upsertSchema = z.object({
  participantId: z.string().min(1),
  session: sessionEnum,
  taskIndex: z.number().int().min(0),
  stage: stageEnum,
  completed: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = getSchema.parse({
      participantId: url.searchParams.get("participantId"),
      session: url.searchParams.get("session") ?? undefined,
    });

    if (query.session) {
      const record = await prisma.participantProgress.findUnique({
        where: {
          participantId_session: {
            participantId: query.participantId,
            session: query.session,
          },
        },
      });
      return NextResponse.json(record);
    }

    const records = await prisma.participantProgress.findMany({
      where: { participantId: query.participantId },
      orderBy: { session: "asc" },
    });
    return NextResponse.json(records);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("GET /api/progress error", msg);
    return NextResponse.json({ error: "Failed to fetch progress", detail: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = upsertSchema.parse(json);

    const result = await prisma.participantProgress.upsert({
      where: {
        participantId_session: {
          participantId: body.participantId,
          session: body.session,
        },
      },
      update: {
        taskIndex: body.taskIndex,
        stage: body.stage,
        completed: body.completed ?? false,
      },
      create: {
        participantId: body.participantId,
        session: body.session,
        taskIndex: body.taskIndex,
        stage: body.stage,
        completed: body.completed ?? false,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("POST /api/progress error", msg);
    return NextResponse.json({ error: "Failed to store progress", detail: msg }, { status: 500 });
  }
}
