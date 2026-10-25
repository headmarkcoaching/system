-- Who filled in the public form, the family's optional email, and the other children named on it.
CREATE TYPE "LeadFilledBy" AS ENUM ('PARENT', 'STUDENT');

ALTER TABLE "leads" ADD COLUMN "filledBy" "LeadFilledBy",
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "siblingNames" TEXT[] DEFAULT ARRAY[]::TEXT[];
