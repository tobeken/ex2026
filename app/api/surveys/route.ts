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
