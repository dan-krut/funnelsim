import { Card } from "@/components/ui/card";
import { DollarSign, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StepMetric {
  name: string;
  trafficIn: number;
  conversions: number;
  revenue: number;
  epc: number;
}

interface FunnelMetricsTableProps {
  steps: StepMetric[];
  totalTraffic: number;
  totalRevenue: number;
  cost: number;
}

export const FunnelMetricsTable = ({
  steps,
  totalTraffic,
  totalRevenue,
  cost,
}: FunnelMetricsTableProps) => {
  const profit = totalRevenue - cost;
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="absolute bottom-4 left-4 p-4 bg-card border-border shadow-lg z-10 w-[450px] overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Funnel Metrics
          </h3>
          <CollapsibleTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="space-y-3">
        <div className="text-xs">
          <span className="text-muted-foreground">Total Traffic In: </span>
          <span className="font-semibold text-foreground">{totalTraffic.toLocaleString()}</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Step</TableHead>
              <TableHead className="text-xs text-right">Conversions</TableHead>
              <TableHead className="text-xs text-right">Revenue</TableHead>
              <TableHead className="text-xs text-right">EPC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((step, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-xs font-medium">{step.name}</TableCell>
                <TableCell className="text-xs text-right">{step.conversions.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right">
                  ${step.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-xs text-right">
                  ${step.epc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
            
            <TableRow className="border-t-2">
              <TableCell className="text-xs font-bold">Sub Total</TableCell>
              <TableCell className="text-xs"></TableCell>
              <TableCell className="text-xs text-right font-bold">
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-xs text-right font-bold">
                ${totalTraffic > 0 ? (totalRevenue / totalTraffic).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="text-xs text-destructive font-medium">Costs</TableCell>
              <TableCell className="text-xs"></TableCell>
              <TableCell className="text-xs text-right text-destructive">
                -${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-xs"></TableCell>
            </TableRow>

            <TableRow className="border-t-2">
              <TableCell className="text-sm font-bold" colSpan={2}>Total Profit</TableCell>
              <TableCell className={`text-sm text-right font-bold ${profit < 0 ? 'text-destructive' : 'text-green-600'}`}>
                {profit < 0
                  ? `-$${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              </TableCell>
              <TableCell className="text-xs"></TableCell>
            </TableRow>
          </TableBody>
          </Table>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
