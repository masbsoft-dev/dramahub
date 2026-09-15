-- DropIndex
DROP INDEX "Episode_dramaId_episodeNumber_key";

-- AlterTable
ALTER TABLE "Episode" ALTER COLUMN "seasonId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seasonId_episodeNumber_key" ON "Episode"("seasonId", "episodeNumber");

