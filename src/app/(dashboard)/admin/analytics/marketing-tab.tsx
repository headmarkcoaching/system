import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { SimpleBarChart } from "@/components/shared/charts/simple-bar-chart";
import { Sparkles } from "lucide-react";
import type { marketingAnalytics } from "@/lib/services/analytics";

function sourceLabel(source: string) {
  return source
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

interface Row {
  key: string;
  count: number;
  enrolled: number;
  conversionPercent: number;
}

export function MarketingTab({ data }: { data: Awaited<ReturnType<typeof marketingAnalytics>> }) {
  const sourceColumns: DataTableColumn<Row>[] = [
    { key: "source", header: "Source", cell: (r) => sourceLabel(r.key) },
    { key: "leads", header: "Leads", cell: (r) => r.count },
    { key: "enrollments", header: "Enrollments", cell: (r) => r.enrolled },
    { key: "conversion", header: "Conversion", cell: (r) => `${r.conversionPercent}%` },
  ];

  const campaignColumns: DataTableColumn<Row>[] = [
    { key: "campaign", header: "Campaign", cell: (r) => r.key },
    { key: "leads", header: "Leads", cell: (r) => r.count },
    { key: "enrollments", header: "Enrollments", cell: (r) => r.enrolled },
    { key: "conversion", header: "Conversion", cell: (r) => `${r.conversionPercent}%` },
  ];

  return (
    <div className="space-y-6">
      {data.bestCampaign && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Sparkles className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium">
                Best performing campaign: <span className="font-semibold">{data.bestCampaign.key}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {data.bestCampaign.conversionPercent}% conversion across {data.bestCampaign.count} leads
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads by Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SimpleBarChart data={data.bySource.map((s) => ({ name: sourceLabel(s.key), count: s.count }))} xKey="name" yKey="count" />
          <DataTable columns={sourceColumns} data={data.bySource} rowKey={(r) => r.key} emptyTitle="No leads yet" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads by Campaign</CardTitle>
          <CardDescription>Only leads with a campaign tag. Ad spend / CPL / CAC aren&apos;t tracked yet — no campaign budget data exists in this build.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={campaignColumns}
            data={data.byCampaign}
            rowKey={(r) => r.key}
            emptyTitle="No campaign-tagged leads yet"
            emptyDescription="Tag a lead's campaign field when creating it to see it here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
