import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  publishedAt: Date;
}

export function AnnouncementsCard({ announcements }: { announcements: AnnouncementItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Announcements</CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <EmptyState title="No announcements right now" className="py-6" />
        ) : (
          <ul className="space-y-2">
            {announcements.slice(0, 5).map((a) => (
              <li key={a.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(a.publishedAt)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
