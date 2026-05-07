import { useState } from "react";
import { useGetValueChain } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

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

function healthScore(status: string): number {
  switch (status?.toUpperCase()) {
    case "G": return 80;
    case "A": return 55;
    default:  return 35;
  }
}

function healthDot(score: number): string {
  if (score < 50) return "bg-destructive";
  if (score < 70) return "bg-primary";
  return "bg-muted-foreground";
}

function healthTextClass(score: number): string {
  if (score < 50) return "text-destructive";
  if (score < 70) return "text-primary";
  return "text-foreground";
}

export function ValueChain() {
  const { data: rawData, isLoading } = useGetValueChain();
  const response = rawData as unknown as ApiList<ValueChainLink>;
  const links: ValueChainLink[] = Array.isArray(response?.data)
    ? [...response.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const [selectedKey, setSelectedKey] = useState<string>("");

  // Auto-select the first link once loaded
  const effectiveKey = selectedKey || (links[0]?.key ?? "");
  const selectedLink = links.find((l) => l.key === effectiveKey) ?? links[0];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (links.length === 0) {
    return <div className="text-muted-foreground text-center py-12">No value chain data available.</div>;
  }

  const operators = (selectedLink?.stakeholders ?? [])
    .filter((s) => s.role === "OPERATOR")
    .sort((a, b) => a.escalationOrder - b.escalationOrder);
  const regulators = (selectedLink?.stakeholders ?? [])
    .filter((s) => s.role === "REGULATOR")
    .sort((a, b) => a.escalationOrder - b.escalationOrder);
  const escalation = (selectedLink?.stakeholders ?? [])
    .sort((a, b) => a.escalationOrder - b.escalationOrder)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Chain strip — scrollable on narrow screens */}
      <div className="flex items-center gap-1 border border-border p-2 bg-secondary/20 rounded-sm overflow-x-auto">
        {links.map((link, i) => {
          const score = healthScore(link.status);
          const isActive = link.key === effectiveKey;
          return (
            <div key={link.key} className="flex items-center shrink-0">
              <button
                onClick={() => setSelectedKey(link.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors ${
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${healthDot(score)}`} />
                {link.name}
                <span className={`font-mono ${healthTextClass(score)}`}>{score}</span>
              </button>
              {i < links.length - 1 && (
                <span className="text-muted-foreground mx-1 shrink-0 text-xs">→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Health legend */}
      <div className="flex gap-4 text-[10px] text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" /> 70-100 Nominal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" /> 50-69 Stressed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive inline-block" /> &lt;50 Critical
        </span>
      </div>

      {/* Detail panel */}
      {selectedLink && (
        <div className="border border-border rounded-sm p-4 bg-card space-y-4">
          {/* Meta description */}
          <p className="text-sm text-muted-foreground leading-relaxed border-b border-border pb-4">
            {selectedLink.meta}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Operators */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground border-b border-border pb-2">
                Key Operators
              </h4>
              {operators.length > 0 ? operators.slice(0, 3).map((op) => (
                <div key={op.id} className="bg-secondary/50 p-3 rounded-sm border border-border">
                  <div className="font-bold text-sm">{op.organisation?.name ?? op.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{op.title}</div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No operator data.</p>
              )}
            </div>

            {/* Regulatory */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground border-b border-border pb-2">
                Regulatory Framework
              </h4>
              {regulators.length > 0 ? regulators.slice(0, 2).map((reg) => (
                <div key={reg.id} className="bg-secondary/50 p-3 rounded-sm border border-border">
                  <div className="font-bold text-sm">{reg.organisation?.name ?? reg.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{reg.title}</div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No regulator data.</p>
              )}
            </div>

            {/* Escalation Tree */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground border-b border-border pb-2">
                Escalation Tree
              </h4>
              <ol className="space-y-2">
                {escalation.map((step, i) => (
                  <li key={step.id} className="flex items-start gap-2 text-sm">
                    <span className="font-mono text-primary font-bold shrink-0">{i + 1}.</span>
                    <div>
                      <div className="font-medium">{step.organisation?.name ?? step.title}</div>
                      <div className="text-xs text-muted-foreground">{step.title}</div>
                    </div>
                  </li>
                ))}
                {escalation.length === 0 && (
                  <p className="text-sm text-muted-foreground">No escalation data.</p>
                )}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
