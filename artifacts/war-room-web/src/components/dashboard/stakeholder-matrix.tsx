import { useGetValueChain } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface StakeholderEntry {
  id: string;
  role: string;
  title: string;
  escalationOrder: number;
  organisation?: { name?: string };
}

interface ValueChainLink {
  id: string;
  key: string;
  name: string;
  status: string;
  meta: string;
  order: number;
  stakeholders?: StakeholderEntry[];
}

interface ApiList<T> { data: T[] }

// Regulatory instruments per chain link key
const INSTRUMENTS: Record<string, string> = {
  gas:        "GSA / GTA",
  gen:        "Power Purchase Agreement (PPA)",
  tx:         "Grid Code / ATC",
  dist:       "Vesting Contract / MYTO",
  settlement: "PPA / Vesting Contract",
  customer:   "NERC Forum / Arbitration",
  offgrid:    "NEP / DARES",
  capex:      "EPC / PPP",
};

function statusBadge(status: string) {
  switch (status?.toUpperCase()) {
    case "G": return <Badge className="bg-primary text-primary-foreground text-[9px] px-1">NOMINAL</Badge>;
    case "A": return <Badge variant="outline" className="border-primary text-primary text-[9px] px-1">STRESSED</Badge>;
    default:  return <Badge variant="destructive" className="text-[9px] px-1">CRITICAL</Badge>;
  }
}

export function StakeholderMatrix() {
  const { data: rawData, isLoading } = useGetValueChain();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const response = rawData as unknown as ApiList<ValueChainLink>;
  const links: ValueChainLink[] = Array.isArray(response?.data)
    ? [...response.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Value Chain Link</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Key Operators</TableHead>
            <TableHead>Regulator</TableHead>
            <TableHead>Instrument</TableHead>
            <TableHead>Escalation Chain</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => {
            const stakeholders = link.stakeholders ?? [];
            const operators = stakeholders
              .filter((s) => s.role === "OPERATOR")
              .sort((a, b) => a.escalationOrder - b.escalationOrder);
            const regulators = stakeholders
              .filter((s) => s.role === "REGULATOR")
              .sort((a, b) => a.escalationOrder - b.escalationOrder);
            const escalationChain = [...operators, ...regulators]
              .sort((a, b) => a.escalationOrder - b.escalationOrder)
              .slice(0, 3)
              .map((s) => s.organisation?.name ?? s.title)
              .filter(Boolean);

            return (
              <TableRow key={link.id}>
                <TableCell className="font-bold text-primary uppercase text-xs tracking-wider whitespace-nowrap">
                  {link.name}
                </TableCell>
                <TableCell>{statusBadge(link.status)}</TableCell>
                <TableCell className="text-sm">
                  {operators.length > 0
                    ? operators.slice(0, 2).map((o) => o.organisation?.name ?? o.title).join(", ")
                    : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {regulators.length > 0
                    ? regulators[0].organisation?.name ?? regulators[0].title
                    : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {INSTRUMENTS[link.key] ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {escalationChain.join(" → ")}
                </TableCell>
              </TableRow>
            );
          })}
          {links.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No value chain data available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
