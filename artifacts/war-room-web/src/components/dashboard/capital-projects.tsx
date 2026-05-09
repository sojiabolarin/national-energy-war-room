import { useState, Fragment } from "react";
import { useGetCapitalProjects } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CapitalProject {
  id: string;
  name: string;
  category: string;
  capex: string | number;
  status: string;
  completionPct: string | number;
  contractor?: string;
  expectedCompletion?: string | null;
  notes?: string | null;
}

interface ApiList<T> { data: T[] }

function statusBadge(status: string) {
  const s = status?.toUpperCase();
  if (s === "ON TRACK" || s === "COMPLETED") {
    return <Badge className="bg-primary text-primary-foreground text-[10px]">{status}</Badge>;
  }
  if (s === "DELAYED" || s === "STALLED") {
    return <Badge variant="destructive" className="text-[10px]">{status}</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
}

export function CapitalProjects() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { data: rawData, isLoading } = useGetCapitalProjects();

  const response = rawData as unknown as ApiList<CapitalProject>;
  const projects: CapitalProject[] = Array.isArray(response?.data) ? response.data : [];

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 border border-border rounded-sm border-dashed">
        No capital projects data available.
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Project</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">CAPEX (₦B)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-48">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const isOpen = expanded.has(project.id);
            const pct = Number(project.completionPct ?? 0);
            return (
              <Fragment key={project.id}>
                <TableRow
                  className="cursor-pointer hover:bg-secondary/20"
                  onClick={() => toggle(project.id)}
                >
                  <TableCell className="pr-0">
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{project.category}</TableCell>
                  <TableCell className="text-right font-mono">
                    {(Number(project.capex) / 1e9).toFixed(2)}
                  </TableCell>
                  <TableCell>{statusBadge(project.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs font-mono w-10 text-right">{pct}%</span>
                    </div>
                  </TableCell>
                </TableRow>

                {isOpen && (
                  <TableRow key={`${project.id}-detail`} className="bg-secondary/10">
                    <TableCell colSpan={6} className="py-3">
                      <div className="pl-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">Contractor</div>
                          <div>{project.contractor ?? "Not assigned"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">Expected Completion</div>
                          <div className="font-mono">
                            {project.expectedCompletion
                              ? new Date(project.expectedCompletion).toLocaleDateString()
                              : "TBD"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">Notes</div>
                          <div className="text-muted-foreground">{project.notes ?? "No notes."}</div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
