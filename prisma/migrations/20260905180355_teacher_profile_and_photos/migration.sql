-- AlterEnum
ALTER TYPE "FilePurpose" ADD VALUE 'PROFILE_PHOTO';

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "specialization" TEXT;
