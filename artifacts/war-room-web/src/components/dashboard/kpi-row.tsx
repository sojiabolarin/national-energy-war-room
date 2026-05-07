import { useGetSectorKpis } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Zap, TrendingDown, Gauge } from "lucide-react";

export function KpiRow() {
  const { data: kpis, isLoading } = useGetSectorKpis();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-sm bg-secondary" />
        ))}
      </div>
    );
  }

  const items = [
    {
      title: "Available Generation",
      value: kpis?.data?.availableGenerationMw != null ? Number(kpis.data.availableGenerationMw).toLocaleString() : "---",
      unit: "MW",
      icon: <Activity className="w-5 h-5 text-primary" />,
    },
    {
      title: "Hourly Generation",
      value: kpis?.data?.hourlyGenerationMwh != null ? Number(kpis.data.hourlyGenerationMwh).toLocaleString() : "---",
      unit: "MWh",
      icon: <Zap className="w-5 h-5 text-primary" />,
    },
    {
      title: "ATC&C Loss",
      value: kpis?.data?.atccLossPct != null ? Number(kpis.data.atccLossPct).toFixed(1) : "---",
      unit: "%",
      icon: <TrendingDown className="w-5 h-5 text-destructive" />,
    },
    {
      title: "Metering Rate",
      value: kpis?.data?.meteringRatePct != null ? Number(kpis.data.meteringRatePct).toFixed(1) : "---",
      unit: "%",
      icon: <Gauge className="w-5 h-5 text-primary" />,
    },
  ];

  return (
    <div className="mb-6 space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <Card key={i} className="bg-card border-border rounded-sm">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  {item.title}
                </span>
                {item.icon}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl md:text-3xl font-bold text-foreground font-mono">
                  {item.value}
                </span>
                <span className="text-sm text-muted-foreground font-bold">{item.unit}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="text-right text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
        Source: {kpis?.data?.source || "NERC Q1 2025"}
      </div>
    </div>
  );
}
