import { Card } from "@/components/ui/card";
import { TrendingUp, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [refundRate, setRefundRate] = useState(5);
  const [processingFee, setProcessingFee] = useState(3);
  const [monthlyGoal, setMonthlyGoal] = useState(0);

  // Net revenue after refunds and processing fees
  const netRevenue = totalRevenue * (1 - refundRate / 100) * (1 - processingFee / 100);
  const netEpc = totalTraffic > 0 ? netRevenue / totalTraffic : 0;

  // Calculate breakeven visitors
  const breakevenVisitors = netEpc > 0 ? Math.ceil(totalCost / netEpc) : null;
  const costPerVisitor = totalTraffic > 0 ? totalCost / totalTraffic : 0;
  const profit = netRevenue - totalCost;
  const isProfitable = profit >= 0;
  const roas = totalCost > 0 ? netRevenue / totalCost : 0;

  // Reverse funnel: required daily visitors for monthly goal
  const profitPerVisitor = totalTraffic > 0 ? profit / totalTraffic : 0;
  const requiredDailyVisitors = monthlyGoal > 0 && profitPerVisitor > 0
    ? Math.ceil((monthlyGoal / 30) / profitPerVisitor)
    : null;

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

            {/* Profit Adjustments */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Refund %</Label>
                <Input
                  type="number" min="0" max="100" step="1"
                  value={refundRate}
                  onChange={(e) => setRefundRate(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs nodrag"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Processing %</Label>
                <Input
                  type="number" min="0" max="100" step="0.1"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs nodrag"
                />
              </div>
            </div>

            {/* Key Metrics */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Gross Revenue</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(totalRevenue)}
                </span>
              </div>

              {(refundRate > 0 || processingFee > 0) && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Net Revenue</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(netRevenue)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Ad Spend</span>
                <span className="text-sm font-semibold text-destructive">
                  -{formatCurrency(totalCost)}
                </span>
              </div>

              <div className="border-t border-border pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-foreground">
                    {isProfitable ? "Net Profit" : "Net Loss"}
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
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
              <div>
                <div className="text-xs text-muted-foreground">EPC</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(netEpc)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cost/Visit</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(costPerVisitor)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">ROAS</div>
                <div className="text-sm font-semibold text-foreground">
                  {roas > 0 ? `${roas.toFixed(1)}x` : "N/A"}
                </div>
              </div>
            </div>

            {/* Reverse Funnel - Goal */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Monthly Profit Goal ($)</Label>
                <Input
                  type="number" min="0" step="100"
                  value={monthlyGoal || ""}
                  onChange={(e) => setMonthlyGoal(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                  className="h-7 text-xs nodrag"
                />
              </div>
              {requiredDailyVisitors !== null && (
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">You need</div>
                  <div className="text-lg font-bold text-foreground">
                    {formatNumber(requiredDailyVisitors)}/day
                  </div>
                  <div className="text-xs text-muted-foreground">visitors to hit your goal</div>
                </div>
              )}
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
