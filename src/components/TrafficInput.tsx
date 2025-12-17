import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2, Minus } from "lucide-react";
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

interface TrafficSource {
  id: string;
  type: string;
  visits: number;
  cost: number;
}

interface TrafficInputProps {
  sources: TrafficSource[];
  onSourcesChange: (sources: TrafficSource[]) => void;
}

export const TrafficInput = ({ sources, onSourcesChange }: TrafficInputProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const addSource = () => {
    const newSource: TrafficSource = {
      id: Date.now().toString(),
      type: "",
      visits: 0,
      cost: 0,
    };
    onSourcesChange([...sources, newSource]);
  };

  const removeSource = (id: string) => {
    if (sources.length === 1) return; // Keep at least one row
    onSourcesChange(sources.filter((s) => s.id !== id));
  };

  const updateSource = (id: string, field: keyof TrafficSource, value: string | number) => {
    onSourcesChange(
      sources.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const totalVisits = sources.reduce((sum, s) => sum + s.visits, 0);
  const totalCost = sources.reduce((sum, s) => sum + s.cost, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="absolute top-4 left-4 p-4 bg-card border-border shadow-lg z-10 w-[450px]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Initial Traffic
          </h3>
          <CollapsibleTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Traffic Type</TableHead>
            <TableHead className="text-xs text-right w-20">Visits</TableHead>
            <TableHead className="text-xs text-right w-20">$ Cost</TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <TableRow key={source.id}>
              <TableCell className="p-1">
                <Input
                  type="text"
                  value={source.type}
                  onChange={(e) => updateSource(source.id, "type", e.target.value)}
                  className="text-xs h-7 nodrag"
                  placeholder="FB Ads"
                />
              </TableCell>
              <TableCell className="p-1">
                <Input
                  type="number"
                  min="0"
                  value={source.visits}
                  onChange={(e) => updateSource(source.id, "visits", parseInt(e.target.value) || 0)}
                  className="text-xs h-7 text-right nodrag [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </TableCell>
              <TableCell className="p-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={source.cost}
                  onChange={(e) => updateSource(source.id, "cost", parseFloat(e.target.value) || 0)}
                  className="text-xs h-7 text-right nodrag [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0.00"
                />
              </TableCell>
              <TableCell className="p-1">
                {sources.length > 1 && (
                  <Button
                    onClick={() => removeSource(source.id)}
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2">
            <TableCell className="text-xs font-bold p-2">Total</TableCell>
            <TableCell className="text-xs font-bold text-right p-2">{totalVisits.toLocaleString()}</TableCell>
            <TableCell className="text-xs font-bold text-right p-2">
              ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
          </Table>
          <div className="mt-3">
            <Button onClick={addSource} size="sm" variant="outline" className="h-7 gap-1 w-full">
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
