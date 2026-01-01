-- CreateTable
CREATE TABLE "ConversationTurn" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationTiming" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationTiming_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSummary" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userUtteranceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationTurn_participantId_idx" ON "ConversationTurn"("participantId");
CREATE INDEX "ConversationTurn_session_taskId_idx" ON "ConversationTurn"("session", "taskId");
CREATE INDEX "ConversationTurn_participantId_session_taskId_turnIndex_idx" ON "ConversationTurn"("participantId", "session", "taskId", "turnIndex");

-- CreateIndex
CREATE INDEX "ConversationTiming_participantId_idx" ON "ConversationTiming"("participantId");
CREATE INDEX "ConversationTiming_session_taskId_idx" ON "ConversationTiming"("session", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSummary_participantId_session_taskId_key" ON "ConversationSummary"("participantId", "session", "taskId");
CREATE INDEX "ConversationSummary_participantId_idx" ON "ConversationSummary"("participantId");
CREATE INDEX "ConversationSummary_session_taskId_idx" ON "ConversationSummary"("session", "taskId");

-- AddForeignKey
ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTiming" ADD CONSTRAINT "ConversationTiming_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
