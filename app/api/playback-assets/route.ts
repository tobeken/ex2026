"use server";

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const querySchema = z.object({
  participantId: z.string().min(1),
  taskId: z.string().min(1),
  conditionId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.parse({
      participantId: url.searchParams.get("participantId"),
      taskId: url.searchParams.get("taskId"),
      conditionId: url.searchParams.get("conditionId"),
    });

    const asset = await prisma.playbackAsset.findUnique({
      where: {
        participantId_taskId_conditionId: {
          participantId: parsed.participantId,
          taskId: parsed.taskId,
          conditionId: parsed.conditionId,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("GET /api/playback-assets error", msg);
    return NextResponse.json({ error: "Failed to fetch playback asset", detail: msg }, { status: 500 });
  }
}
