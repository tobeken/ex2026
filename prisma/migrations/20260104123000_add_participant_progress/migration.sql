-- CreateTable
CREATE TABLE "ParticipantProgress" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "taskIndex" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'survey',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantProgress_participantId_session_key" ON "ParticipantProgress"("participantId", "session");

-- CreateIndex
CREATE INDEX "ParticipantProgress_participantId_idx" ON "ParticipantProgress"("participantId");

-- AddForeignKey
ALTER TABLE "ParticipantProgress" ADD CONSTRAINT "ParticipantProgress_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
