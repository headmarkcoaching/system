"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createUserAction, type CreateUserState } from "./actions";

const initialState: CreateUserState = {};

export function NewUserDialog({ canCreateSuperAdmin }: { canCreateSuperAdmin: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState(createUserAction, initialState);
  const submittedRef = React.useRef(false);

  React.useEffect(() => {
    if (submittedRef.current) {
      submittedRef.current = false;
      if (!state.error) setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Staff User</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4" onSubmit={() => (submittedRef.current = true)}>
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input name="email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input name="phone" placeholder="03xx-xxxxxxx" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Initial Password *</Label>
            <Input name="password" required placeholder="Minimum 6 characters" />
          </div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select name="role" defaultValue="TEACHER">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TEACHER">Teacher</SelectItem>
                <SelectItem value="COUNSELOR">Admission Counselor</SelectItem>
                <SelectItem value="ADMIN">Admin / Operations</SelectItem>
                {canCreateSuperAdmin && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating…" : "Create User"}
    </Button>
  );
}
