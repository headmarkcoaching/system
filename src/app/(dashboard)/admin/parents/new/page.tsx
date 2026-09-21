import { PageHeader } from "@/components/shared/page-header";
import { NewParentForm } from "./new-parent-form";

export default function NewParentPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Add Parent" description="Create a new parent/guardian profile. Link children from the student's profile." />
      <NewParentForm />
    </div>
  );
}
