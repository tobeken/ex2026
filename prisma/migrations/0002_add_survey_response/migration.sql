-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "taskId" TEXT,
    "stage" TEXT NOT NULL,
    "condition" TEXT,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyResponse_participantId_idx" ON "SurveyResponse"("participantId");
CREATE INDEX "SurveyResponse_session_idx" ON "SurveyResponse"("session");
CREATE INDEX "SurveyResponse_taskId_idx" ON "SurveyResponse"("taskId");

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
