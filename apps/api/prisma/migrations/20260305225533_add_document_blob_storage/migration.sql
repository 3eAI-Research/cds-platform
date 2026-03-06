/*
  Warnings:

  - You are about to drop the column `storage_key` on the `provider_documents` table. All the data in the column will be lost.
  - Added the required column `file_data` to the `provider_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_size` to the `provider_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mime_type` to the `provider_documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "provider"."provider_documents" DROP COLUMN "storage_key",
ADD COLUMN     "file_data" BYTEA NOT NULL,
ADD COLUMN     "file_size" INTEGER NOT NULL,
ADD COLUMN     "mime_type" VARCHAR(100) NOT NULL,
ADD COLUMN     "rejection_reason" TEXT;
