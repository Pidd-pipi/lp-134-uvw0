-- CreateEnum
CREATE TYPE "GroupMemberStatus" AS ENUM ('ACTIVE', 'LEFT');

-- AlterTable
ALTER TABLE "group_members" ADD COLUMN "status" "GroupMemberStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "leftAt" TIMESTAMP(3);
