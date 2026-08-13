-- CreateTable
CREATE TABLE "documentation_photos" (
    "id" TEXT NOT NULL,
    "weeklyReportId" TEXT NOT NULL,
    "dailyLogId" TEXT,
    "cloudinaryPublicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentation_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentation_photos_weeklyReportId_idx" ON "documentation_photos"("weeklyReportId");

-- CreateIndex
CREATE INDEX "documentation_photos_dailyLogId_idx" ON "documentation_photos"("dailyLogId");

-- AddForeignKey
ALTER TABLE "documentation_photos" ADD CONSTRAINT "documentation_photos_weeklyReportId_fkey" FOREIGN KEY ("weeklyReportId") REFERENCES "weekly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentation_photos" ADD CONSTRAINT "documentation_photos_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "daily_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
