import "server-only";
import { db } from "@/lib/db";
import type { MaterialType } from "@prisma/client";

export function listStudyMaterial({ academicLevelId, subjectId }: { academicLevelId?: string; subjectId?: string }) {
  return db.studyMaterial.findMany({
    where: { ...(academicLevelId ? { academicLevelId } : {}), ...(subjectId ? { subjectId } : {}) },
    include: { academicLevel: true, subject: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface CreateStudyMaterialInput {
  title: string;
  type: MaterialType;
  academicLevelId: string;
  subjectId: string;
  chapter?: string;
  fileId: string;
  uploadedById: string;
}

export function createStudyMaterial(input: CreateStudyMaterialInput) {
  return db.studyMaterial.create({ data: input });
}

export function deleteStudyMaterial(id: string) {
  return db.studyMaterial.delete({ where: { id } });
}
