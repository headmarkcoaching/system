"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { LeadFormValues } from "@/lib/lead-contact";

const MAX_OTHER_CHILDREN = 4;

/**
 * The first part of every public booking form: who is filling it in (a parent or the student), then the names,
 * the parent's phone, an optional email, and, when a parent says another child is coming too, that child's name.
 * The wording of each label follows who is filling the form in.
 *
 * `sibling` can be controlled by the parent form (the Buy Now form needs it to price the sibling discount); the
 * free-trial and referral forms let this component show its own tick-box.
 */
export function LeadContactFields({
  values,
  sibling,
  onSiblingChange,
  siblingToggle,
  siblingToggleLabel,
}: {
  values?: LeadFormValues;
  sibling?: boolean;
  onSiblingChange?: (value: boolean) => void;
  /** Show this component's own "another child" tick-box. Leave off when the form already has one. */
  siblingToggle?: boolean;
  siblingToggleLabel?: (filledBy: string) => { title: string; hint?: string };
}) {
  const [filledBy, setFilledBy] = React.useState<"" | "PARENT" | "STUDENT">("");
  const [ownSibling, setOwnSibling] = React.useState(false);
  const [names, setNames] = React.useState<string[]>([""]);
  const siblingOn = sibling ?? ownSibling;
  const isStudent = filledBy === "STUDENT";

  function setSibling(v: boolean) {
    if (onSiblingChange) onSiblingChange(v);
    else setOwnSibling(v);
  }

  const toggle = siblingToggleLabel?.(filledBy) ?? {
    title: isStudent ? "My brother or sister wants to try a class too" : "My other child wants to try a class too",
  };

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Who is filling in this form? *</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["PARENT", "A parent"],
              ["STUDENT", "The student"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                "flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold transition-colors",
                "hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
              )}
            >
              <input
                type="radio"
                name="filledBy"
                value={value}
                checked={filledBy === value}
                onChange={() => setFilledBy(value)}
                required
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="studentName">{isStudent ? "Your name *" : "Student's name *"}</Label>
        <Input id="studentName" name="studentName" defaultValue={values?.studentName} required autoComplete={isStudent ? "name" : "off"} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="parentName">{isStudent ? "Parent or guardian's name *" : "Parent's name *"}</Label>
        <Input id="parentName" name="parentName" defaultValue={values?.parentName} required autoComplete={isStudent ? "off" : "name"} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="parentPhone">{isStudent ? "Parent or guardian's phone / WhatsApp *" : "Parent's phone / WhatsApp *"}</Label>
        <Input id="parentPhone" name="parentPhone" placeholder="03xx-xxxxxxx" inputMode="tel" autoComplete="tel" defaultValue={values?.parentPhone} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{isStudent ? "Your email (optional)" : "Email (optional)"}</Label>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" defaultValue={values?.email} />
      </div>

      {siblingToggle && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/[0.06]">
          <input
            type="checkbox"
            name="sibling"
            value="1"
            checked={siblingOn}
            onChange={(e) => setSibling(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
          />
          <span>
            {toggle.title}
            {toggle.hint && <span className="block text-xs text-muted-foreground">{toggle.hint}</span>}
          </span>
        </label>
      )}

      {siblingOn && (
        <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-sm font-medium">{names.length > 1 ? "Names of your other children *" : "Your other child's name *"}</p>
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                name="siblingNames"
                value={name}
                onChange={(e) => setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
                placeholder="Full name"
                aria-label={`Other child ${i + 1}, name`}
                maxLength={60}
                required={i === 0}
              />
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => setNames((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove other child ${i + 1}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {names.length < MAX_OTHER_CHILDREN && (
            <button
              type="button"
              onClick={() => setNames((prev) => [...prev, ""])}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus aria-hidden="true" className="h-4 w-4" /> Add another child
            </button>
          )}
        </div>
      )}
    </div>
  );
}
