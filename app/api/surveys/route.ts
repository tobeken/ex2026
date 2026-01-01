"use server";

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const createSchema = z.object({
  participantId: z.string().min(1),
  session: z.enum(["practice", "s1", "s2"]),
  taskId: z.string().optional(), // e.g., BIRTHDAY_GIFT
  stage: z.string().min(1), // e.g., pre, post, followup
  condition: z.string().optional(),
  answers: z.any(),
});

const querySchema = z.object({
  participantId: z.string().optional(),
  session: z.string().optional(),
  stage: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = createSchema.parse(json);

    const created = await prisma.surveyResponse.create({
      data: {
        participantId: body.participantId,
        session: body.session,
        taskId: body.taskId,
        stage: body.stage,
        condition: body.condition,
        answers: body.answers,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("POST /api/surveys validation error", error.issues);
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("POST /api/surveys error", msg);
    return NextResponse.json({ error: "Failed to store survey", detail: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = querySchema.parse({
      participantId: url.searchParams.get("participantId") ?? undefined,
      session: url.searchParams.get("session") ?? undefined,
      stage: url.searchParams.get("stage") ?? undefined,
    });

    const where: Record<string, any> = {};
    if (query.participantId) where.participantId = query.participantId;
    if (query.session) where.session = query.session;
    if (query.stage) where.stage = query.stage;

    const responses = await prisma.surveyResponse.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(responses);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("GET /api/surveys validation error", error.issues);
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("GET /api/surveys error", msg);
    return NextResponse.json({ error: "Failed to fetch surveys", detail: msg }, { status: 500 });
  }
}
