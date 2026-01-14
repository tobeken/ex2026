-- CreateTable
CREATE TABLE "TaskNote" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "taskId" "TaskId" NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskNote_participantId_taskId_key" ON "TaskNote"("participantId", "taskId");

-- CreateIndex
CREATE INDEX "TaskNote_participantId_idx" ON "TaskNote"("participantId");

-- AddForeignKey
ALTER TABLE "TaskNote" ADD CONSTRAINT "TaskNote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
