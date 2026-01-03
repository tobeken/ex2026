"use server";

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const timingEventSchema = z.object({
  participantId: z.string().min(1),
  session: z.string().min(1),
  taskId: z.string().min(1),
  event: z.string().min(1),
  timestamp: z.string().or(z.date()),
  extra: z.any().optional(),
});

const bulkSchema = z.array(timingEventSchema);

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const events = bulkSchema.parse(json);

    const data = events.map((e) => ({
      participantId: e.participantId,
      session: e.session,
      taskId: e.taskId,
      event: e.event,
      timestamp: new Date(e.timestamp),
      extra: e.extra,
    }));

    await prisma.conversationTiming.createMany({ data });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("POST /api/conversation/timing error", msg);
    return NextResponse.json({ error: "Failed to store timings", detail: msg }, { status: 500 });
  }
}
