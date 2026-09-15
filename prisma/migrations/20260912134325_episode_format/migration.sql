-- CreateEnum
CREATE TYPE "MediaFormat" AS ENUM ('HLS', 'MP4', 'DASH');

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "format" "MediaFormat" NOT NULL DEFAULT 'HLS';
