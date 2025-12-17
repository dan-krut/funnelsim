import { memo, useState, useMemo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, DollarSign, Percent, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, calculateSensitivity } from "@/lib/funnelCalculations";

// Get revenue badge color based on revenue amount
const getRevenueBadgeColor = (revenue: number): string => {
  if (revenue >= 1000) return "bg-emerald-500 text-white"; // High profit - bright green
  if (revenue >= 500) return "bg-emerald-400 text-white"; // Good profit
  if (revenue >= 100) return "bg-teal-400 text-white"; // Moderate profit
  if (revenue > 0) return "bg-amber-400 text-amber-900"; // Low profit
  return "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300"; // Zero
};

interface FunnelNodeData {
  name: string;
  price: number;
  conversion: number;
  nodeType: "frontend" | "oto" | "downsell";
  traffic?: number;
  revenue?: number;
  buyersCount?: number;
  passCount?: number;
  onUpdate?: (nodeId: string, field: string, value: any) => void;
  onDelete?: (nodeId: string) => void;
  isExporting?: boolean;
  // For sensitivity calculation
  allNodes?: any[];
  allEdges?: any[];
  trafficSources?: any[];
}

export const FunnelNode = memo(({ id, data }: NodeProps<FunnelNodeData>) => {
  const {
    name,
    price,
    conversion,
    nodeType,
    onUpdate,
    onDelete,
    isExporting,
    revenue,
    buyersCount,
    passCount,
    allNodes,
    allEdges,
    trafficSources,
  } = data;

  const [isHovering, setIsHovering] = useState(false);

  // Calculate sensitivity only when hovering
  const sensitivity = useMemo(() => {
    if (!isHovering || !allNodes || !allEdges || !trafficSources) return 0;
    return calculateSensitivity(allNodes, allEdges, trafficSources, id);
  }, [isHovering, allNodes, allEdges, trafficSources, id]);

  const nodeColors = {
    frontend: "border-primary/50 bg-primary/20",
    oto: "border-emerald-500/50 bg-emerald-500/20",
    downsell: "border-orange-500/50 bg-orange-500/20",
  };

  const cardContent = (
    <Card
      className={`p-4 min-w-[280px] ${nodeColors[nodeType]} border-2 relative`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !w-3 !h-3"
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary flex-shrink-0" />
            {isExporting ? (
              <div className="text-sm font-semibold">{name}</div>
            ) : (
              <Input
                value={name}
                onChange={(e) => onUpdate?.(id, "name", e.target.value)}
                className="text-sm font-semibold border-0 p-0 h-auto bg-transparent nodrag"
                placeholder="Step name"
              />
            )}
          </div>
          {nodeType !== "frontend" && !isExporting && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onDelete?.(id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="space-y-1 flex-1">
            <Label className="text-xs flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Price
            </Label>
            {isExporting ? (
              <div className="text-sm h-8 px-3 py-2 rounded-md border border-input bg-background flex items-center">
                {price}
              </div>
            ) : (
              <Input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={price}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  if (value > 1000000) return;
                  onUpdate?.(id, "price", value);
                }}
                onInput={(e) => {
                  const input = e.target as HTMLInputElement;
                  const value = input.value.replace(".", "").replace("-", "");
                  if (value.length > 7) {
                    input.value = input.value.slice(0, -1);
                  }
                }}
                className="text-sm h-8 nodrag"
              />
            )}
          </div>

          <div className="space-y-1 w-20">
            <Label className="text-xs flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Conv %
            </Label>
            {isExporting ? (
              <div className="text-sm h-8 px-3 py-2 rounded-md border border-input bg-background flex items-center">
                {conversion}
              </div>
            ) : (
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={conversion}
                onChange={(e) => {
                  const value = e.target.value;
                  // Limit to 3 digits before decimal
                  if (value.replace(".", "").length > 5) return; // 3 digits + decimal + 1 decimal place
                  const numValue = parseFloat(value) || 0;
                  if (numValue > 100) return;
                  onUpdate?.(id, "conversion", numValue);
                }}
                onInput={(e) => {
                  const input = e.target as HTMLInputElement;
                  const value = input.value;
                  // Remove any characters beyond 3 digits (plus decimal)
                  if (value.replace(".", "").replace("-", "").length > 4) {
                    input.value = value.slice(0, -1);
                  }
                }}
                className="text-sm h-8 nodrag"
              />
            )}
          </div>
        </div>
      </div>

      {/* Revenue Badge - floating above top-right corner, color based on revenue */}
      {revenue !== undefined && (
        <div className="absolute -top-3 -right-2 z-10">
          <div className={`${getRevenueBadgeColor(revenue)} px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm`}>
            {formatCurrency(revenue)}
          </div>
        </div>
      )}

      {nodeType === "frontend" ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: "50%", background: "#10b981", transform: "translateX(-50%)" }}
            className="!w-3 !h-3"
          />
          {/* Buy label in flow, centered */}
          <div className="text-center mt-2 text-xs text-muted-foreground">
            Buy
          </div>
          {/* Traffic indicator below dot */}
          {buyersCount !== undefined && buyersCount > 0 && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap">
                {buyersCount} {buyersCount === 1 ? 'buyer' : 'buyers'}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: "30%", background: "#10b981", transform: "translateX(-50%)" }}
            className="!w-3 !h-3"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ left: "70%", background: "#ef4444", transform: "translateX(-50%)" }}
            className="!w-3 !h-3"
          />
          {/* Labels positioned to align with dots at 30% and 70% */}
          <div className="relative mt-2 text-xs text-muted-foreground h-4">
            <span className="absolute left-[30%] -translate-x-1/2">Buy</span>
            <span className="absolute left-[70%] -translate-x-1/2">No Thanks</span>
          </div>
          {/* Traffic indicators below dots */}
          {buyersCount !== undefined && buyersCount > 0 && (
            <div className="absolute -bottom-6 left-[30%] -translate-x-1/2 z-10">
              <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap">
                {buyersCount} {buyersCount === 1 ? 'buyer' : 'buyers'}
              </div>
            </div>
          )}
          {passCount !== undefined && passCount > 0 && (
            <div className="absolute -bottom-6 left-[70%] -translate-x-1/2 z-10">
              <div className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap">
                {passCount} pass
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );

  // Wrap with tooltip for sensitivity display when hovering
  if (allNodes && allEdges && trafficSources && sensitivity > 0) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip open={isHovering}>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent side="top" className="bg-background border shadow-lg">
            <p className="text-sm font-medium">
              +1% conversion = +{formatCurrency(sensitivity)} revenue
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
});

FunnelNode.displayName = "FunnelNode";
