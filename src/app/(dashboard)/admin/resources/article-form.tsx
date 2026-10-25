"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ArticleFormState } from "./actions";

export interface ArticleDefaults {
  title: string;
  excerpt: string;
  body: string;
  category: "BLOG" | "STUDY_TIPS";
  topic: string;
  authorName: string;
  isPublished: boolean;
}

const EMPTY: ArticleDefaults = { title: "", excerpt: "", body: "", category: "BLOG", topic: "", authorName: "Head Mark Coaching", isPublished: false };

export function ArticleForm({
  action,
  defaults = EMPTY,
  topics,
}: {
  action: (prev: ArticleFormState, formData: FormData) => Promise<ArticleFormState>;
  defaults?: ArticleDefaults;
  topics: string[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [category, setCategory] = React.useState(defaults.category);
  // After a refused save, show what was typed rather than the empty form React leaves behind.
  const v = state.values;
  const initial = { title: v?.title ?? defaults.title, excerpt: v?.excerpt ?? defaults.excerpt, body: v?.body ?? defaults.body, topic: v?.topic ?? defaults.topic, authorName: v?.authorName ?? defaults.authorName, isPublished: v?.isPublished ?? defaults.isPublished };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        // Submitted by hand so a refused save keeps everything that was typed.
        e.preventDefault();
        const form = e.currentTarget;
        React.startTransition(() => formAction(new FormData(form)));
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={initial.title} required maxLength={140} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Where it appears *</Label>
          <Select name="category" value={category} onValueChange={(v) => setCategory(v as ArticleDefaults["category"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BLOG">Blog</SelectItem>
              <SelectItem value="STUDY_TIPS">Study Material (exam tips and tricks)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="topic">Topic (subject or theme)</Label>
          <Input id="topic" name="topic" defaultValue={initial.topic} list="topic-options" maxLength={40} placeholder="Physics, All subjects, Parents…" />
          <datalist id="topic-options">
            {topics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="excerpt">Short summary * (shown on the card)</Label>
        <Textarea id="excerpt" name="excerpt" defaultValue={initial.excerpt} required rows={2} maxLength={300} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Article *</Label>
        <Textarea id="body" name="body" defaultValue={initial.body} required rows={18} className="font-mono text-sm leading-relaxed" />
        <p className="text-xs text-muted-foreground">
          Leave a blank line between paragraphs. Use <code>## Heading</code> for a section title, <code>- item</code> for a bullet list, <code>1. step</code> for numbered steps,{" "}
          <code>&gt; text</code> for a highlighted tip, and <code>**bold**</code> for emphasis. Links: <code>[words](/enroll)</code> or <code>[words](https://…)</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="authorName">Author shown</Label>
          <Input id="authorName" name="authorName" defaultValue={initial.authorName} maxLength={80} />
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-lg border border-border px-3 py-2.5 text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={initial.isPublished} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Published (visible on the website)
        </label>
      </div>

      {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <SubmitButton pending={pending} />
        <Button asChild variant="outline">
          <Link href="/admin/resources">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save article"}
    </Button>
  );
}
