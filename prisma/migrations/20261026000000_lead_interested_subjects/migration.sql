-- The subject(s) a family chose when booking a free class.
ALTER TABLE "leads" ADD COLUMN "interestedSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[];
