"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { updateTeacherProfileAction } from "./actions";

const fields: FieldDef[] = [
  { type: "text", name: "qualification", label: "Qualification", placeholder: "e.g. M.Phil Mathematics, University of Punjab" },
  { type: "number", name: "experienceYears", label: "Years of Teaching Experience" },
  { type: "text", name: "specialization", label: "Specialization", placeholder: "e.g. O/A Level Mathematics, Calculus" },
  { type: "textarea", name: "bio", label: "Bio", placeholder: "A short introduction shown on the profile" },
];

export function EditTeacherProfileDialog({
  teacherId,
  qualification,
  experienceYears,
  specialization,
  bio,
}: {
  teacherId: string;
  qualification: string | null;
  experienceYears: number | null;
  specialization: string | null;
  bio: string | null;
}) {
  return (
    <EntityDialog
      trigger={
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
        </Button>
      }
      title="Edit Teacher Profile"
      fields={fields}
      defaultValues={{
        qualification: qualification ?? "",
        experienceYears: experienceYears ?? undefined,
        specialization: specialization ?? "",
        bio: bio ?? "",
      }}
      onSubmit={(data) => updateTeacherProfileAction(teacherId, data)}
    />
  );
}
