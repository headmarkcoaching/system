"use client";

import { useRouter, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ChildSwitcher({ options, selectedId }: { options: { id: string; fullName: string }[]; selectedId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  if (options.length <= 1) return null;

  return (
    <Select value={selectedId} onValueChange={(v) => router.push(`${pathname}?child=${v}`)}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
