-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PlaylistItemKind" AS ENUM ('CHANNEL', 'MOVIE', 'SERIES', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PlaylistItemStatus" AS ENUM ('PENDING', 'IMPORTED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Drama" ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "PlaylistImport" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistImportItem" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "kind" "PlaylistItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "groupTitle" TEXT,
    "logoUrl" TEXT,
    "streamUrl" TEXT NOT NULL,
    "tvgId" TEXT,
    "status" "PlaylistItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdDramaId" TEXT,

    CONSTRAINT "PlaylistImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaylistImportItem_importId_kind_idx" ON "PlaylistImportItem"("importId", "kind");

-- CreateIndex
CREATE INDEX "PlaylistImportItem_importId_status_idx" ON "PlaylistImportItem"("importId", "status");

-- CreateIndex
CREATE INDEX "Drama_status_idx" ON "Drama"("status");

-- AddForeignKey
ALTER TABLE "PlaylistImport" ADD CONSTRAINT "PlaylistImport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistImportItem" ADD CONSTRAINT "PlaylistImportItem_importId_fkey" FOREIGN KEY ("importId") REFERENCES "PlaylistImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistImportItem" ADD CONSTRAINT "PlaylistImportItem_createdDramaId_fkey" FOREIGN KEY ("createdDramaId") REFERENCES "Drama"("id") ON DELETE SET NULL ON UPDATE CASCADE;
