import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  rowHref,
  emptyTitle = "No records found",
  emptyDescription,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const href = rowHref?.(row);
              return (
                <TableRow key={rowKey(row)} className={cn(href && "relative")}>
                  {columns.map((c, idx) => (
                    <TableCell key={c.key} className={c.className}>
                      {href && idx === 0 ? (
                        <Link href={href} className="absolute inset-0" aria-label="View details" />
                      ) : null}
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {data.map((row) => {
          const href = rowHref?.(row);
          const CardWrapper = href ? Link : "div";
          return (
            <CardWrapper
              key={rowKey(row)}
              // @ts-expect-error href only applies when CardWrapper is Link
              href={href}
              className="block space-y-2 rounded-lg border border-border bg-card p-4 active:bg-muted/50"
            >
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                    <span className="shrink-0 text-muted-foreground">{c.header}</span>
                    <span className="text-right font-medium">{c.cell(row)}</span>
                  </div>
                ))}
            </CardWrapper>
          );
        })}
      </div>
    </>
  );
}
