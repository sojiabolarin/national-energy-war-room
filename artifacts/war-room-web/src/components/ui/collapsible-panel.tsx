import { useState, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsiblePanel({ id, title, children, defaultExpanded = true }: CollapsiblePanelProps) {
  const storageKey = `war-room-panel-${id}`;
  
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === "true" : defaultExpanded;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, isExpanded.toString());
  }, [isExpanded, storageKey]);

  useEffect(() => {
    const handleToggleAll = (e: CustomEvent) => {
      setIsExpanded(e.detail.expanded);
    };
    window.addEventListener("war-room-toggle-all", handleToggleAll as EventListener);
    return () => window.removeEventListener("war-room-toggle-all", handleToggleAll as EventListener);
  }, []);

  return (
    <div className="bg-card border border-border rounded-sm overflow-hidden flex flex-col mb-4">
      <div 
        className="flex items-center justify-between p-3 bg-secondary/50 border-b border-border cursor-pointer select-none hover:bg-secondary/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-bold text-sm tracking-wider uppercase text-foreground">{title}</h3>
        <ChevronDown 
          className={cn(
            "w-5 h-5 text-primary transition-transform duration-200",
            isExpanded ? "rotate-180" : ""
          )} 
        />
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-card">
          {children}
        </div>
      )}
    </div>
  );
}

export function PanelHeader() {
  const handleToggle = (expanded: boolean) => {
    window.dispatchEvent(new CustomEvent("war-room-toggle-all", { detail: { expanded } }));
  };

  return (
    <div className="flex justify-end gap-2 mb-4">
      <button 
        onClick={() => handleToggle(true)}
        className="text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors font-bold"
      >
        Expand All
      </button>
      <span className="text-muted-foreground">|</span>
      <button 
        onClick={() => handleToggle(false)}
        className="text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors font-bold"
      >
        Collapse All
      </button>
    </div>
  );
}
