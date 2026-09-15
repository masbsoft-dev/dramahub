-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE');

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "seasonId" TEXT;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "dramaId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "title" TEXT,
    "posterUrl" TEXT,
    "synopsis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastMember" (
    "id" TEXT NOT NULL,
    "dramaId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "roleName" TEXT,
    "photoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CastMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoundtrackTrack" (
    "id" TEXT NOT NULL,
    "dramaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artistName" TEXT,
    "audioUrl" TEXT,
    "durationSeconds" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SoundtrackTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDramaReaction" (
    "userId" TEXT NOT NULL,
    "dramaId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDramaReaction_pkey" PRIMARY KEY ("userId","dramaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_dramaId_seasonNumber_key" ON "Season"("dramaId", "seasonNumber");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastMember" ADD CONSTRAINT "CastMember_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoundtrackTrack" ADD CONSTRAINT "SoundtrackTrack_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDramaReaction" ADD CONSTRAINT "UserDramaReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDramaReaction" ADD CONSTRAINT "UserDramaReaction_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE;
