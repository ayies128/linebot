/*
  Warnings:

  - You are about to drop the column `content` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `replyToken` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `reminderMinutes` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lineMessageId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `roomId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Message_userId_timestamp_idx";

-- DropIndex
DROP INDEX "User_lineUserId_idx";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "content",
DROP COLUMN "replyToken",
ADD COLUMN     "lineMessageId" TEXT,
ADD COLUMN     "rawContent" TEXT,
ADD COLUMN     "roomId" TEXT NOT NULL,
ADD COLUMN     "textContent" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "reminderMinutes";

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "lineRoomId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_lineRoomId_key" ON "Room"("lineRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_lineMessageId_key" ON "Message"("lineMessageId");

-- CreateIndex
CREATE INDEX "Message_roomId_userId_timestamp_idx" ON "Message"("roomId", "userId", "timestamp");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
