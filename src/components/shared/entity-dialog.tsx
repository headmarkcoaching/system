"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type FieldValue = string | number | boolean | undefined;

export type FieldDef =
  | { type: "text"; name: string; label: string; required?: boolean; placeholder?: string }
  | { type: "textarea"; name: string; label: string; required?: boolean; placeholder?: string }
  | { type: "number"; name: string; label: string; required?: boolean }
  | { type: "select"; name: string; label: string; required?: boolean; options: { value: string; label: string }[] }
  | { type: "checkbox"; name: string; label: string };

export function EntityDialog({
  trigger,
  title,
  description,
  fields,
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel = "Save",
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  fields: FieldDef[];
  defaultValues?: Record<string, FieldValue>;
  onSubmit: (data: Record<string, FieldValue>) => Promise<{ error?: string } | void>;
  /** Called after a successful submit (no `error` in the result), once the dialog has closed. Use for navigation etc. */
  onSuccess?: (result: unknown) => void;
  submitLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, FieldValue>>(defaultValues ?? {});

  React.useEffect(() => {
    if (open) setValues(defaultValues ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await onSubmit(values);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Saved successfully");
        setOpen(false);
        onSuccess?.(result);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(v) => setValues((s) => ({ ...s, [field.name]: v }))}
            />
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <Label htmlFor={field.name}>{field.label}</Label>
        <Switch id={field.name} checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.name}>
          {field.label} {field.required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={value ? String(value) : undefined} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={field.name}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.name}>
          {field.label} {field.required && <span className="text-destructive">*</span>}
        </Label>
        <textarea
          id={field.name}
          required={field.required}
          placeholder={field.placeholder}
          value={value ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={field.name}
        type={field.type === "number" ? "number" : "text"}
        required={field.required}
        placeholder={field.type === "text" ? field.placeholder : undefined}
        value={value === undefined ? "" : String(value)}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
      />
    </div>
  );
}
