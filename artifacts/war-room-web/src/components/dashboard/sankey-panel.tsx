import { useGetSankeyData } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FlowNode {
  id: string;
  label: string;
  value: number;
  layer: number;
  direction?: string;
}

function SankeyLink({
  x1, y1a, y1b, x2, y2a, y2b, color, opacity = 0.7,
}: {
  x1: number; y1a: number; y1b: number;
  x2: number; y2a: number; y2b: number;
  color: string; opacity?: number;
}) {
  const mid = (x1 + x2) / 2;
  const d = [
    `M ${x1} ${y1a}`,
    `C ${mid} ${y1a}, ${mid} ${y2a}, ${x2} ${y2a}`,
    `L ${x2} ${y2b}`,
    `C ${mid} ${y2b}, ${mid} ${y1b}, ${x1} ${y1b}`,
    "Z",
  ].join(" ");
  return <path d={d} fill={color} fillOpacity={opacity} />;
}

function NodeRect({
  x, y, w = 18, h, color, label, labelAbove = true,
}: {
  x: number; y: number; w?: number; h: number;
  color: string; label: string; labelAbove?: boolean;
}) {
  const labelY = labelAbove ? y - 8 : y + h + 16;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={color} rx={2} />
      <text
        x={x + w / 2}
        y={labelY}
        textAnchor="middle"
        fill="currentColor"
        fontSize={10}
        fontFamily="Arial, sans-serif"
        fontWeight="600"
        letterSpacing="0.04em"
      >
        {label}
      </text>
      <text
        x={x + w / 2}
        y={labelAbove ? y - 20 : y + h + 30}
        textAnchor="middle"
        fill="currentColor"
        fontSize={9}
        fontFamily="Arial, sans-serif"
        opacity={0.6}
      >
        {/* value label set by parent */}
      </text>
    </g>
  );
}

const COLS = [60, 270, 480, 690];
const NODE_W = 18;
const PH_Y0 = 30;
const PH_H = 130;
const FIN_Y0 = 195;
const FIN_H = 130;
const SVG_H = 345;
const SVG_W = 780;

const PRIMARY = "#E85426";
const MUTED = "#8a8a8a";
const LOSS_COLOR = "#555555";

export function SankeyPanel() {
  const { data: rawData, isLoading } = useGetSankeyData();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const sankeyData = rawData as unknown as { data?: { physicalFlow?: FlowNode[]; financialFlow?: FlowNode[] } };
  const physicalFlow: FlowNode[] = sankeyData?.data?.physicalFlow ?? [];
  const financialFlow: FlowNode[] = sankeyData?.data?.financialFlow ?? [];

  // Aggregate layer 2 (DisCos) for physical
  const gencos = physicalFlow.find((n) => n.layer === 0);
  const tcn = physicalFlow.find((n) => n.layer === 1);
  const discoLayerNodes = physicalFlow.filter((n) => n.layer === 2);
  const discoTotal = discoLayerNodes.reduce((s, n) => s + n.value, 0);
  const customers = physicalFlow.find((n) => n.layer === 3);

  const maxPh = gencos?.value ?? 1;
  const phScale = (v: number) => (v / maxPh) * PH_H;

  const custH = customers ? phScale(customers.value) : PH_H * 0.6;
  const tcnH = tcn ? phScale(tcn.value) : PH_H * 0.95;
  const discoH = phScale(discoTotal > 0 ? discoTotal / discoLayerNodes.length * discoLayerNodes.length : tcn?.value ?? maxPh);

  // Physical node y positions (centered in section)
  const ph = [
    { h: PH_H, y: PH_Y0 },
    { h: Math.max(10, tcnH), y: PH_Y0 + (PH_H - Math.max(10, tcnH)) / 2 },
    { h: Math.max(10, discoH), y: PH_Y0 + (PH_H - Math.max(10, discoH)) / 2 },
    { h: Math.max(10, custH), y: PH_Y0 + (PH_H - Math.max(10, custH)) / 2 },
  ];

  // Financial flow nodes
  const custPay = financialFlow.find((n) => n.layer === 0);
  const discoColl = financialFlow.find((n) => n.layer === 1);
  const nbet = financialFlow.find((n) => n.layer === 2);
  const gencoPay = financialFlow.find((n) => n.layer === 3);
  const maxFin = custPay?.value ?? 1;
  const finScale = (v: number) => (v / maxFin) * FIN_H;

  const fin = [
    { h: FIN_H, y: FIN_Y0 }, // GenCo side (COLS[0])
    { h: Math.max(10, finScale(nbet?.value ?? maxFin * 0.9)), y: FIN_Y0 + (FIN_H - finScale(nbet?.value ?? maxFin * 0.9)) / 2 },
    { h: Math.max(10, finScale(discoColl?.value ?? maxFin * 0.95)), y: FIN_Y0 + (FIN_H - finScale(discoColl?.value ?? maxFin * 0.95)) / 2 },
    { h: FIN_H, y: FIN_Y0 }, // Customer side (COLS[3])
  ];

  const fmt = (v: number) =>
    v > 1e9 ? `₦${(v / 1e9).toFixed(0)}B` : v > 1e6 ? `₦${(v / 1e6).toFixed(0)}M` : `${v.toLocaleString()} MW`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: PRIMARY }} />
          Physical Flow (MWh)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: MUTED }} />
          Financial Flow (₦)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: LOSS_COLOR }} />
          Losses / Shortfall
        </span>
      </div>

      <div className="w-full overflow-x-auto rounded-sm border border-border bg-card">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ minWidth: 560 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Separator label */}
          <line x1={20} y1={170} x2={SVG_W - 20} y2={170} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="4 4" />
          <text x={SVG_W / 2} y={185} textAnchor="middle" fill="currentColor" fontSize={9} fontFamily="Arial" opacity={0.5} letterSpacing="0.1em">
            ↑ ELECTRONS   ·   NAIRA ↓
          </text>

          {/* Physical flow links */}
          <SankeyLink
            x1={COLS[0] + NODE_W} y1a={ph[0].y} y1b={ph[0].y + ph[0].h}
            x2={COLS[1]} y2a={ph[1].y} y2b={ph[1].y + ph[1].h}
            color={PRIMARY}
          />
          <SankeyLink
            x1={COLS[1] + NODE_W} y1a={ph[1].y} y1b={ph[1].y + ph[1].h}
            x2={COLS[2]} y2a={ph[2].y} y2b={ph[2].y + ph[2].h}
            color={PRIMARY}
          />
          <SankeyLink
            x1={COLS[2] + NODE_W} y1a={ph[2].y} y1b={ph[2].y + ph[2].h}
            x2={COLS[3]} y2a={ph[3].y} y2b={ph[3].y + ph[3].h}
            color={PRIMARY}
          />
          {/* Loss gap — disCo to customer */}
          {ph[3].h < ph[2].h && (
            <SankeyLink
              x1={COLS[2] + NODE_W} y1a={ph[2].y + ph[3].h + (ph[2].h - ph[3].h) / 2} y1b={ph[2].y + ph[2].h}
              x2={COLS[3]} y2a={ph[3].y + ph[3].h} y2b={ph[3].y + ph[3].h + (ph[2].h - ph[3].h) / 2}
              color={LOSS_COLOR} opacity={0.4}
            />
          )}

          {/* Physical nodes */}
          {[
            { label: "GenCos", val: gencos?.value ?? 0, idx: 0 },
            { label: "TCN", val: tcn?.value ?? 0, idx: 1 },
            { label: "DisCos", val: discoTotal, idx: 2 },
            { label: "Customers", val: customers?.value ?? 0, idx: 3 },
          ].map(({ label, val, idx }) => (
            <NodeRect
              key={label}
              x={COLS[idx]}
              y={ph[idx].y}
              h={ph[idx].h}
              color={PRIMARY}
              label={label}
              labelAbove
            />
          ))}

          {/* Physical value labels */}
          {[
            { val: gencos?.value ?? 0, idx: 0 },
            { val: tcn?.value ?? 0, idx: 1 },
            { val: discoTotal, idx: 2 },
            { val: customers?.value ?? 0, idx: 3 },
          ].map(({ val, idx }) => (
            <text
              key={`phlabel-${idx}`}
              x={COLS[idx] + NODE_W / 2}
              y={ph[idx].y - 20}
              textAnchor="middle"
              fill="currentColor"
              fontSize={8}
              fontFamily="Arial"
              opacity={0.55}
            >
              {val > 0 ? `${Math.round(val).toLocaleString()} MWh` : ""}
            </text>
          ))}

          {/* Financial flow links (right→left) */}
          <SankeyLink
            x1={COLS[3]} y1a={fin[3].y} y1b={fin[3].y + fin[3].h}
            x2={COLS[2] + NODE_W} y2a={fin[2].y} y2b={fin[2].y + fin[2].h}
            color={MUTED}
          />
          <SankeyLink
            x1={COLS[2]} y1a={fin[2].y} y1b={fin[2].y + fin[2].h}
            x2={COLS[1] + NODE_W} y2a={fin[1].y} y2b={fin[1].y + fin[1].h}
            color={MUTED}
          />
          <SankeyLink
            x1={COLS[1]} y1a={fin[1].y} y1b={fin[1].y + fin[1].h}
            x2={COLS[0] + NODE_W} y2a={fin[0].y} y2b={fin[0].y + fin[0].h}
            color={MUTED}
          />

          {/* Financial nodes */}
          {[
            { label: "GenCos", idx: 0 },
            { label: "NBET", idx: 1 },
            { label: "DisCos", idx: 2 },
            { label: "Customers", idx: 3 },
          ].map(({ label, idx }) => (
            <NodeRect
              key={`fin-${label}`}
              x={COLS[idx]}
              y={fin[idx].y}
              h={fin[idx].h}
              color={MUTED}
              label={label}
              labelAbove={false}
            />
          ))}

          {/* Financial value labels */}
          {[
            { val: gencoPay?.value, idx: 0 },
            { val: nbet?.value, idx: 1 },
            { val: discoColl?.value, idx: 2 },
            { val: custPay?.value, idx: 3 },
          ].map(({ val, idx }) => (
            <text
              key={`finlabel-${idx}`}
              x={COLS[idx] + NODE_W / 2}
              y={fin[idx].y + fin[idx].h + 30}
              textAnchor="middle"
              fill="currentColor"
              fontSize={8}
              fontFamily="Arial"
              opacity={0.55}
            >
              {val != null ? fmt(val) : ""}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
