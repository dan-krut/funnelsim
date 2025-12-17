import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingDown } from "lucide-react";

interface FunnelStepProps {
  id: string;
  name: string;
  price: number;
  conversion: number;
  trafficIn: number;
  onUpdate: (id: string, field: string, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const FunnelStep = ({
  id,
  name,
  price,
  conversion,
  trafficIn,
  onUpdate,
  onRemove,
  canRemove,
}: FunnelStepProps) => {
  const conversions = Math.floor((trafficIn * conversion) / 100);
  const revenue = conversions * price;

  return (
    <Card className="p-6 relative overflow-hidden bg-card border-border transition-all hover:shadow-lg">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Label htmlFor={`${id}-name`} className="text-sm font-semibold text-muted-foreground">
            Step Name
          </Label>
          <Input
            id={`${id}-name`}
            value={name}
            onChange={(e) => onUpdate(id, "name", e.target.value)}
            className="mt-1 font-semibold text-lg border-input bg-background"
            placeholder="e.g., Front End, OTO 1"
          />
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(id)}
            className="ml-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor={`${id}-price`} className="text-sm text-muted-foreground">
            Price ($)
          </Label>
          <Input
            id={`${id}-price`}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => onUpdate(id, "price", e.target.value)}
            className="mt-1 border-input bg-background"
          />
        </div>
        <div>
          <Label htmlFor={`${id}-conversion`} className="text-sm text-muted-foreground">
            Conversion Rate (%)
          </Label>
          <Input
            id={`${id}-conversion`}
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={conversion}
            onChange={(e) => onUpdate(id, "conversion", e.target.value)}
            className="mt-1 border-input bg-background"
          />
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Traffic In</span>
          <span className="font-semibold text-foreground">{trafficIn.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Conversions
          </span>
          <span className="font-semibold text-primary">{conversions.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-semibold text-foreground">Revenue</span>
          <span className="text-xl font-bold text-accent">
            ${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </Card>
  );
};
