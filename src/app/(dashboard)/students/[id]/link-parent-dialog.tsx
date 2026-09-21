"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { linkParentAction } from "@/app/(dashboard)/admin/students/actions";

const RELATIONSHIPS = [
  { value: "FATHER", label: "Father" },
  { value: "MOTHER", label: "Mother" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "OTHER", label: "Other" },
];

export function LinkParentDialog({ studentId, parents }: { studentId: string; parents: { id: string; fullName: string; phone: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [parentId, setParentId] = React.useState("");
  const [relationship, setRelationship] = React.useState("GUARDIAN");
  const [isPrimary, setIsPrimary] = React.useState(false);

  async function handleSubmit() {
    if (!parentId) {
      toast.error("Select a parent to link.");
      return;
    }
    setPending(true);
    try {
      await linkParentAction(studentId, parentId, relationship, isPrimary);
      toast.success("Parent linked");
      setOpen(false);
      setParentId("");
    } catch {
      toast.error("Could not link parent.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Link Parent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link a Parent / Guardian</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Parent</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger><SelectValue placeholder="Select an existing parent" /></SelectTrigger>
              <SelectContent>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName} — {p.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Don&apos;t see the parent? Add them first from the Parents page.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Relationship</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isPrimary" checked={isPrimary} onCheckedChange={(c) => setIsPrimary(Boolean(c))} />
            <Label htmlFor="isPrimary">Primary contact</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Linking…" : "Link Parent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
