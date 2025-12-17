import { Card } from "@/components/ui/card";
import { TrendingUp, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/funnelCalculations";

interface BreakevenPanelProps {
  totalCost: number;
  totalRevenue: number;
  totalTraffic: number;
  epc: number;
}

export const BreakevenPanel = ({
  totalCost,
  totalRevenue,
  totalTraffic,
  epc,
}: BreakevenPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);

  // Calculate breakeven visitors
  // Breakeven = totalCost / epc
  const breakevenVisitors = epc > 0 ? Math.ceil(totalCost / epc) : null;
  const costPerVisitor = totalTraffic > 0 ? totalCost / totalTraffic : 0;
  const profit = totalRevenue - totalCost;
  const isProfitable = profit >= 0;

  // Format numbers compactly
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="absolute top-4 right-4 p-4 bg-card border-border shadow-lg z-10 w-[280px] overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Breakeven Analysis
          </h3>
          <CollapsibleTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="space-y-4 mt-4">
            {/* Breakeven Indicator */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Breakeven Point</div>
              {breakevenVisitors !== null ? (
                <div className="text-lg font-bold text-foreground">
                  {formatNumber(breakevenVisitors)} visitors
                </div>
              ) : (
                <div className="text-lg font-bold text-muted-foreground">N/A</div>
              )}
              {epc > 0 && (
                <div className="text-xs text-muted-foreground">
                  @ {formatCurrency(epc)}/visitor EPC
                </div>
              )}
            </div>

            {/* Key Metrics */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Revenue</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(totalRevenue)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Cost</span>
                <span className="text-sm font-semibold text-destructive">
                  -{formatCurrency(totalCost)}
                </span>
              </div>

              <div className="border-t border-border pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-foreground">
                    {isProfitable ? "Profit" : "Loss"}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      isProfitable ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {isProfitable ? "+" : ""}
                    {formatCurrency(profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <div>
                <div className="text-xs text-muted-foreground">Current EPC</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(epc)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cost/Visitor</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(costPerVisitor)}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              {breakevenVisitors !== null && totalTraffic > 0 && (
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    totalTraffic >= breakevenVisitors
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {totalTraffic >= breakevenVisitors
                    ? "Above Breakeven"
                    : `Need ${formatNumber(breakevenVisitors - totalTraffic)} more visitors`}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
