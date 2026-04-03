import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wand2, FileText, Zap } from "lucide-react";
import { FunnelWizard } from "./FunnelWizard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewFunnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBlank: () => void;
  userId: string | undefined;
}

export const NewFunnelDialog = ({ open, onOpenChange, onCreateBlank, userId }: NewFunnelDialogProps) => {
  const [showWizard, setShowWizard] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleClose = () => {
    setShowWizard(false);
    onOpenChange(false);
  };

  const createFromTemplate = async () => {
    if (!userId) return;
    setCreating(true);
    try {
      const templateNodes = [
        { id: "frontend", type: "funnelStep", position: { x: 400, y: 100 }, data: { name: "Front End", price: 27, conversion: 3, nodeType: "frontend" } },
        { id: "bump-1", type: "funnelStep", position: { x: 400, y: 300 }, data: { name: "Order Bump", price: 27, conversion: 30, nodeType: "bump" } },
        { id: "oto-1", type: "funnelStep", position: { x: 400, y: 500 }, data: { name: "OTO 1", price: 97, conversion: 12, nodeType: "oto" } },
        { id: "downsell-1", type: "funnelStep", position: { x: 650, y: 700 }, data: { name: "Downsell", price: 47, conversion: 18, nodeType: "downsell" } },
      ];
      const templateEdges = [
        { id: "e-fe-bump", source: "frontend", target: "bump-1", sourceHandle: "yes", type: "custom", animated: true, label: "Buy", style: { stroke: "#10b981" } },
        { id: "e-bump-oto", source: "bump-1", target: "oto-1", sourceHandle: "yes", type: "custom", animated: true, label: "Buy", style: { stroke: "#10b981" } },
        { id: "e-oto-ds", source: "oto-1", target: "downsell-1", sourceHandle: "no", type: "custom", animated: true, label: "No Thanks", style: { stroke: "#ef4444" } },
      ];

      const { data, error } = await supabase
        .from("funnels")
        .insert({
          user_id: userId,
          name: "My Course Funnel",
          nodes: templateNodes,
          edges: templateEdges,
          traffic_sources: [{ id: "1", type: "Facebook Ads", visits: 1000, cost: 500 }],
        })
        .select()
        .single();

      if (error) throw error;
      handleClose();
      navigate(`/funnel/${data.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (showWizard) {
    return (
      <FunnelWizard
        open={open}
        onOpenChange={onOpenChange}
        onBack={() => setShowWizard(false)}
        userId={userId}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Funnel</DialogTitle>
          <DialogDescription>
            Choose how you'd like to create your funnel
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
            onClick={createFromTemplate}
            disabled={creating}
          >
            <div className="flex items-center gap-2 w-full">
              <Zap className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold">{creating ? "Creating..." : "Course Funnel Template"}</span>
              <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Recommended</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Pre-built with Front End, Order Bump, OTO, and Downsell. Ready in seconds.
            </p>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4 hover:bg-accent hover:border-primary/30"
            onClick={() => setShowWizard(true)}
          >
            <div className="flex items-center gap-2 w-full">
              <Wand2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Funnel Wizard</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Configure your own products and we'll build it for you
            </p>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4 hover:bg-accent hover:border-primary/30"
            onClick={() => {
              onCreateBlank();
              handleClose();
            }}
          >
            <div className="flex items-center gap-2 w-full">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold">Blank Canvas</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Start from scratch
            </p>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
