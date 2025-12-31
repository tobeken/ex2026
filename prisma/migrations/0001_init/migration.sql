-- CreateEnum
CREATE TYPE "TaskId" AS ENUM ('BIRTHDAY_GIFT', 'FAREWELL_PARTY', 'WEEKEND_TRIP');

-- CreateEnum
CREATE TYPE "ConditionId" AS ENUM ('NONE', 'SUMMARY', 'NARRATIVE');

-- CreateEnum
CREATE TYPE "LatinGroup" AS ENUM ('G1', 'G2', 'G3');

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "group" "LatinGroup" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "taskId" "TaskId" NOT NULL,
    "conditionId" "ConditionId" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackAsset" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "taskId" "TaskId" NOT NULL,
    "conditionId" "ConditionId" NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "durationMs" INTEGER,
    "sourceSessionId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaybackAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assignment_participantId_idx" ON "Assignment"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_participantId_orderIndex_key" ON "Assignment"("participantId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_participantId_taskId_key" ON "Assignment"("participantId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_participantId_conditionId_key" ON "Assignment"("participantId", "conditionId");

-- CreateIndex
CREATE INDEX "PlaybackAsset_participantId_idx" ON "PlaybackAsset"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybackAsset_participantId_taskId_conditionId_key" ON "PlaybackAsset"("participantId", "taskId", "conditionId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackAsset" ADD CONSTRAINT "PlaybackAsset_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

