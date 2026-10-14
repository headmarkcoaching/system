-- A staff exception that lets a student join live classes despite an overdue fee, until this time.
ALTER TABLE "students" ADD COLUMN "classAccessOverrideUntil" TIMESTAMP(3);
