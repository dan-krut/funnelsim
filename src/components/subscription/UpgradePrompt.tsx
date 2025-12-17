import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Check } from "lucide-react";
import type { SubscriptionTier, SubscriptionFeature } from "@/integrations/supabase/types";

interface UpgradePromptProps {
  currentTier: SubscriptionTier | null;
  funnelCount: number;
  funnelLimit: number;
  onUpgrade: () => void;
  recommendedTier?: SubscriptionTier | null;
  className?: string;
}

export const UpgradePrompt = ({
  currentTier,
  funnelCount,
  funnelLimit,
  onUpgrade,
  recommendedTier,
  className,
}: UpgradePromptProps) => {
  const isAtLimit = funnelCount >= funnelLimit;

  if (!isAtLimit) {
    return null;
  }

  // Default features if recommended tier doesn't have features
  const defaultFeatures = ["Unlimited funnels", "Advanced analytics", "Priority support"];

  // Get features from recommended tier, handling both string and object formats
  const getFeatureText = (feature: string | SubscriptionFeature): string => {
    if (typeof feature === 'string') {
      return feature;
    }
    return feature?.title || 'Feature';
  };

  const recommendedFeatures = Array.isArray(recommendedTier?.features)
    ? (recommendedTier.features as (string | SubscriptionFeature)[])
    : defaultFeatures;

  return (
    <Card className={className}>
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Funnel Limit Reached</CardTitle>
            <CardDescription>
              You've used all {funnelLimit} funnels on your {currentTier?.name || "Free"} plan
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current Plan */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">{currentTier?.name || "Free"}</span>
              <Badge variant="secondary" className="text-xs">Current</Badge>
            </div>
            <p className="text-2xl font-bold">
              {currentTier?.price_monthly === 0 ? "Free" : `$${currentTier?.price_monthly}/mo`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {funnelLimit} funnels
            </p>
          </div>

          {/* Recommended Plan */}
          <div className="p-3 rounded-lg border border-primary bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">{recommendedTier?.name || "Pro"}</span>
              <Badge className="text-xs bg-primary">Recommended</Badge>
            </div>
            <p className="text-2xl font-bold">
              ${recommendedTier?.price_monthly || 29}/mo
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {recommendedTier?.max_funnels || 25} funnels
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          <p className="text-sm font-medium">What you'll get:</p>
          <ul className="space-y-1">
            {recommendedFeatures.slice(0, 4).map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{getFeatureText(feature)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Button onClick={onUpgrade} className="w-full" size="lg">
          Upgrade Now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Cancel anytime. No long-term commitment.
        </p>
      </CardContent>
    </Card>
  );
};
