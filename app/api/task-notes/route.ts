"use server";

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const getSchema = z.object({
  participantId: z.string().min(1),
});

const upsertSchema = z.object({
  participantId: z.string().min(1),
  taskId: z.enum(["BIRTHDAY_GIFT", "FAREWELL_PARTY", "WEEKEND_TRIP"]),
  note: z.string(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = getSchema.parse({
      participantId: url.searchParams.get("participantId"),
    });

    const notes = await prisma.taskNote.findMany({
      where: { participantId: query.participantId },
      orderBy: { taskId: "asc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("GET /api/task-notes error", msg);
    return NextResponse.json({ error: "Failed to fetch task notes", detail: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = upsertSchema.parse(json);

    const note = await prisma.taskNote.upsert({
      where: {
        participantId_taskId: {
          participantId: body.participantId,
          taskId: body.taskId,
        },
      },
      update: {
        note: body.note,
      },
      create: {
        participantId: body.participantId,
        taskId: body.taskId,
        note: body.note,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("POST /api/task-notes error", msg);
    return NextResponse.json({ error: "Failed to store task note", detail: msg }, { status: 500 });
  }
}
