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
  // For scenario calculations - gross revenue at different conversion multipliers
  scenarioRevenues?: { pessimistic: number; optimistic: number };
}

export const BreakevenPanel = ({
  totalCost,
  totalRevenue,
  totalTraffic,
  epc,
  scenarioRevenues,
}: BreakevenPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [refundRate, setRefundRate] = useState(5);
  const [processingFee, setProcessingFee] = useState(3);
  const [monthlyGoal, setMonthlyGoal] = useState(0);

  const deductionMultiplier = (1 - refundRate / 100) * (1 - processingFee / 100);

  // Realistic (current)
  const netRevenue = totalRevenue * deductionMultiplier;
  const profit = netRevenue - totalCost;
  const isProfitable = profit >= 0;
  const netEpc = totalTraffic > 0 ? netRevenue / totalTraffic : 0;
  const costPerVisitor = totalTraffic > 0 ? totalCost / totalTraffic : 0;
  const roas = totalCost > 0 ? netRevenue / totalCost : 0;
  const breakevenVisitors = netEpc > 0 ? Math.ceil(totalCost / netEpc) : null;

  // Scenarios
  const pessNet = (scenarioRevenues?.pessimistic ?? totalRevenue * 0.5) * deductionMultiplier;
  const optNet = (scenarioRevenues?.optimistic ?? totalRevenue * 1.67) * deductionMultiplier;
  const pessProfit = pessNet - totalCost;
  const optProfit = optNet - totalCost;

  // Reverse funnel
  const profitPerVisitor = totalTraffic > 0 ? profit / totalTraffic : 0;
  const requiredDailyVisitors = monthlyGoal > 0 && profitPerVisitor > 0
    ? Math.ceil((monthlyGoal / 30) / profitPerVisitor)
    : null;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const profitColor = (p: number) => p >= 0 ? "text-green-600" : "text-destructive";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="absolute top-4 right-4 p-4 bg-card border-border shadow-lg z-10 w-[300px] overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Profit Analysis
          </h3>
          <CollapsibleTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="space-y-3 mt-3">

            {/* Scenario Bands */}
            <div className="rounded-lg overflow-hidden border border-border">
              <div className="grid grid-cols-3 text-center text-[10px] font-medium bg-muted/50 py-1.5">
                <span className="text-amber-500">Pessimistic</span>
                <span className="text-foreground">Realistic</span>
                <span className="text-emerald-500">Optimistic</span>
              </div>
              <div className="grid grid-cols-3 text-center py-2 gap-0.5">
                <span className={`text-sm font-bold ${profitColor(pessProfit)}`}>
                  {formatCurrency(pessProfit)}
                </span>
                <span className={`text-sm font-bold ${profitColor(profit)}`}>
                  {formatCurrency(profit)}
                </span>
                <span className={`text-sm font-bold ${profitColor(optProfit)}`}>
                  {formatCurrency(optProfit)}
                </span>
              </div>
              <div className="text-center text-[9px] text-muted-foreground pb-1.5">
                50% / 100% / 167% of your conversion rates
              </div>
            </div>

            {/* Deductions */}
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

            {/* Revenue Breakdown */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Gross Revenue</span>
                <span className="text-xs font-semibold text-foreground">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">After Deductions</span>
                <span className="text-xs font-semibold text-foreground">{formatCurrency(netRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Ad Spend</span>
                <span className="text-xs font-semibold text-destructive">-{formatCurrency(totalCost)}</span>
              </div>
              <div className="border-t border-border pt-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">{isProfitable ? "Net Profit" : "Net Loss"}</span>
                  <span className={`text-sm font-bold ${profitColor(profit)}`}>
                    {isProfitable ? "+" : ""}{formatCurrency(profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-border">
              <div>
                <div className="text-[10px] text-muted-foreground">EPC</div>
                <div className="text-xs font-semibold">{formatCurrency(netEpc)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">CPA</div>
                <div className="text-xs font-semibold">{formatCurrency(costPerVisitor)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">ROAS</div>
                <div className="text-xs font-semibold">{roas > 0 ? `${roas.toFixed(1)}x` : "N/A"}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">B/E</div>
                <div className="text-xs font-semibold">{breakevenVisitors ? formatNumber(breakevenVisitors) : "N/A"}</div>
              </div>
            </div>

            {/* Goal Planner */}
            <div className="pt-1 border-t border-border space-y-1.5">
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
                  <div className="text-lg font-bold text-foreground">{formatNumber(requiredDailyVisitors)}/day</div>
                  <div className="text-xs text-muted-foreground">visitors to hit your goal</div>
                </div>
              )}
            </div>

            {/* Status */}
            {breakevenVisitors !== null && totalTraffic > 0 && (
              <div className="flex justify-center">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  totalTraffic >= breakevenVisitors
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }`}>
                  {totalTraffic >= breakevenVisitors
                    ? "Above Breakeven"
                    : `Need ${formatNumber(breakevenVisitors - totalTraffic)} more visitors`}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
