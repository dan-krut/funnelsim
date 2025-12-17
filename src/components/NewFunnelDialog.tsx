import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wand2, FileText, LayoutTemplate } from "lucide-react";
import { FunnelWizard } from "./FunnelWizard";

interface NewFunnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBlank: () => void;
  userId: string | undefined;
}

export const NewFunnelDialog = ({ open, onOpenChange, onCreateBlank, userId }: NewFunnelDialogProps) => {
  const [showWizard, setShowWizard] = useState(false);

  const handleClose = () => {
    setShowWizard(false);
    onOpenChange(false);
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
            className="h-auto flex-col items-start gap-2 p-4 hover:bg-accent hover:border-primary/30"
            onClick={() => {
              onCreateBlank();
              handleClose();
            }}
          >
            <div className="flex items-center gap-2 w-full">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold">Create Blank Funnel</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Start with an empty canvas and build from scratch
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
              Answer a few questions and we'll build it for you
            </p>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
