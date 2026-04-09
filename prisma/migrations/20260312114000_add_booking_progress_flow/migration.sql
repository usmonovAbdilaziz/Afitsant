-- CreateEnum
CREATE TYPE "BookingProgressStatus" AS ENUM (
  'PENDING',
  'PREPARING',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "BookingItemStatus" AS ENUM (
  'PENDING',
  'PREPARING',
  'READY',
  'CANCELLED'
);

-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "progressStatus" "BookingProgressStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "readyForDeliveryAt" TIMESTAMP(3),
ADD COLUMN "deliveryClaimedAt" TIMESTAMP(3),
ADD COLUMN "deliveryAssignedStaffId" TEXT,
ADD COLUMN "deliveryAssignedRole" TEXT,
ADD COLUMN "deliveryAssignedName" TEXT,
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "deliveredByStaffId" TEXT,
ADD COLUMN "deliveredByRole" TEXT,
ADD COLUMN "deliveredByName" TEXT,
ADD COLUMN "preparationDelayWarningSentAt" TIMESTAMP(3),
ADD COLUMN "deliveryClaimWarningSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BookingItem"
ADD COLUMN "durationSnapshot" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" "BookingItemStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "responsiblePosition" TEXT,
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "readyAt" TIMESTAMP(3),
ADD COLUMN "preparedByStaffId" TEXT,
ADD COLUMN "preparedByName" TEXT,
ADD COLUMN "preparedByRole" TEXT;

-- Backfill booking item duration snapshot from current service duration
UPDATE "BookingItem" AS bi
SET "durationSnapshot" = COALESCE(s."duration", 0)
FROM "Service" AS s
WHERE s."id" = bi."productId";

-- Backfill booking progress from existing status
UPDATE "Booking"
SET "progressStatus" = CASE
  WHEN "status" = 'CANCELLED' THEN 'CANCELLED'::"BookingProgressStatus"
  WHEN "status" = 'COMPLETED' THEN 'DELIVERED'::"BookingProgressStatus"
  WHEN "status" = 'CONFIRMED' THEN 'PREPARING'::"BookingProgressStatus"
  ELSE 'PENDING'::"BookingProgressStatus"
END;

-- Backfill item state for cancelled bookings
UPDATE "BookingItem" AS bi
SET "status" = CASE
  WHEN b."status" = 'CANCELLED' THEN 'CANCELLED'::"BookingItemStatus"
  ELSE 'PENDING'::"BookingItemStatus"
END
FROM "Booking" AS b
WHERE b."id" = bi."bookingId";

-- CreateIndex
CREATE INDEX "Booking_progressStatus_idx" ON "Booking"("progressStatus");

-- CreateIndex
CREATE INDEX "Booking_readyForDeliveryAt_idx" ON "Booking"("readyForDeliveryAt");

-- CreateIndex
CREATE INDEX "Booking_deliveryAssignedStaffId_idx" ON "Booking"("deliveryAssignedStaffId");

-- CreateIndex
CREATE INDEX "BookingItem_status_idx" ON "BookingItem"("status");
