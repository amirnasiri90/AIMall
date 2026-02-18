-- AlterTable: SupportTicket default status and TicketMessage attachment
ALTER TABLE "SupportTicket" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;

-- Optional: set existing OPEN tickets to IN_PROGRESS (one-time)
UPDATE "SupportTicket" SET "status" = 'IN_PROGRESS' WHERE "status" = 'OPEN';
