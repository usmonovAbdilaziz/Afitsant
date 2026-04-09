-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "confirmedByType" TEXT,
ADD COLUMN "confirmedByName" TEXT,
ADD COLUMN "confirmedByUserId" TEXT,
ADD COLUMN "confirmedByStaffId" TEXT;
