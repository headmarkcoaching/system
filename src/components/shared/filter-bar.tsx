"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FilterBar({
  children,
  searchPlaceholder = "Search…",
  defaultQuery = "",
}: {
  children?: React.ReactNode;
  searchPlaceholder?: string;
  defaultQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => updateParam("q", value), 350);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input defaultValue={defaultQuery} onChange={onSearchChange} placeholder={searchPlaceholder} className="pl-9" />
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function FilterSelect({
  paramKey,
  defaultValue,
  placeholder,
  options,
}: {
  paramKey: string;
  defaultValue?: string;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function onChange(value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") params.set(paramKey, value);
    else params.delete(paramKey);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select defaultValue={defaultValue ?? "all"} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
