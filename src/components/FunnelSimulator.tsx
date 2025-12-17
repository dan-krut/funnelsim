import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FunnelStep } from "./FunnelStep";
import { Plus, DollarSign, Users } from "lucide-react";

interface Step {
  id: string;
  name: string;
  price: number;
  conversion: number;
}

export const FunnelSimulator = () => {
  const [traffic, setTraffic] = useState(1000);
  const [steps, setSteps] = useState<Step[]>([
    { id: "1", name: "Front End", price: 47, conversion: 3 },
    { id: "2", name: "OTO 1", price: 197, conversion: 25 },
    { id: "3", name: "OTO 2", price: 297, conversion: 15 },
  ]);

  const addStep = () => {
    const newId = (Math.max(...steps.map((s) => parseInt(s.id)), 0) + 1).toString();
    setSteps([
      ...steps,
      {
        id: newId,
        name: `OTO ${steps.length}`,
        price: 97,
        conversion: 20,
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, field: string, value: string) => {
    setSteps(
      steps.map((s) => {
        if (s.id === id) {
          if (field === "price" || field === "conversion") {
            return { ...s, [field]: parseFloat(value) || 0 };
          }
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  // Calculate metrics for each step
  let currentTraffic = traffic;
  const stepsWithMetrics = steps.map((step) => {
    const trafficIn = currentTraffic;
    const conversions = Math.floor((trafficIn * step.conversion) / 100);
    const revenue = conversions * step.price;
    currentTraffic = conversions;
    return { ...step, trafficIn, conversions, revenue };
  });

  const totalRevenue = stepsWithMetrics.reduce((sum, step) => sum + step.revenue, 0);
  const totalConversions = stepsWithMetrics[0]?.conversions || 0;
  const epc = traffic > 0 ? totalRevenue / traffic : 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Sales Funnel Simulator</h1>
          <p className="text-muted-foreground">
            Model your funnel revenue by entering traffic, prices, and conversion rates
          </p>
        </header>

        <Card className="p-6 bg-card border-border">
          <Label htmlFor="traffic" className="text-sm font-semibold text-muted-foreground">
            Initial Traffic
          </Label>
          <div className="flex items-center gap-2 mt-2">
            <Users className="h-5 w-5 text-primary" />
            <Input
              id="traffic"
              type="number"
              min="0"
              value={traffic}
              onChange={(e) => setTraffic(parseInt(e.target.value) || 0)}
              className="text-lg font-semibold border-input bg-background"
              placeholder="Enter traffic volume"
            />
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Funnel Steps</h2>
            <Button onClick={addStep} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          </div>

          {stepsWithMetrics.map((step) => (
            <FunnelStep
              key={step.id}
              id={step.id}
              name={step.name}
              price={step.price}
              conversion={step.conversion}
              trafficIn={step.trafficIn}
              onUpdate={updateStep}
              onRemove={removeStep}
              canRemove={steps.length > 1}
            />
          ))}
        </div>

        <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="h-8 w-8 text-accent" />
            <h2 className="text-2xl font-bold text-foreground">Summary</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold text-accent">
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Front End Conversions</p>
              <p className="text-3xl font-bold text-primary">{totalConversions.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">EPC (Earnings Per Click)</p>
              <p className="text-3xl font-bold text-foreground">
                ${epc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        <footer className="text-center text-sm text-muted-foreground">
          <p>Calculate potential revenue for your sales funnel launch</p>
        </footer>
      </div>
    </div>
  );
};
