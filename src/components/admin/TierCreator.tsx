import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionTierInsert } from "@/integrations/supabase/types";

interface TierCreatorProps {
  onSave: (tier: SubscriptionTierInsert) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  existingTiersCount: number;
}

/**
 * Form component for creating new subscription tiers.
 * Based on TierEditor pattern but for insert operations.
 */
export const TierCreator = ({
  onSave,
  onCancel,
  isSaving,
  existingTiersCount,
}: TierCreatorProps) => {
  const [name, setName] = useState('');
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [priceYearly, setPriceYearly] = useState(0);
  const [priceLifetime, setPriceLifetime] = useState(0);
  const [maxFunnels, setMaxFunnels] = useState(10);
  const [stripeProductId, setStripeProductId] = useState('');
  const [stripePriceIdMonthly, setStripePriceIdMonthly] = useState('');
  const [stripePriceIdYearly, setStripePriceIdYearly] = useState('');
  const [stripePriceIdLifetime, setStripePriceIdLifetime] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [featuresText, setFeaturesText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse features from text (one per line)
    const features = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const newTier: SubscriptionTierInsert = {
      name,
      price_monthly: priceMonthly,
      price_yearly: priceYearly,
      price_lifetime: priceLifetime,
      max_funnels: maxFunnels,
      stripe_product_id: stripeProductId || null,
      stripe_price_id_monthly: stripePriceIdMonthly || null,
      stripe_price_id_yearly: stripePriceIdYearly || null,
      stripe_price_id_lifetime: stripePriceIdLifetime || null,
      sort_order: existingTiersCount, // Auto-generate based on existing count
      is_active: isActive,
      features: features as any,
    };

    await onSave(newTier);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Product</CardTitle>
        <CardDescription>
          Add a new subscription tier. Configure pricing, limits, and features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Tier Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Pro"
                required
                aria-label="Tier name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={existingTiersCount}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated based on existing tiers
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Pricing</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="priceMonthly">Monthly Price ($)</Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={0.01}
                  aria-label="Monthly price"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceYearly">Yearly Price ($)</Label>
                <Input
                  id="priceYearly"
                  type="number"
                  value={priceYearly}
                  onChange={(e) => setPriceYearly(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={0.01}
                  aria-label="Yearly price"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceLifetime">Lifetime Price ($)</Label>
                <Input
                  id="priceLifetime"
                  type="number"
                  value={priceLifetime}
                  onChange={(e) => setPriceLifetime(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={0.01}
                  aria-label="Lifetime price"
                />
                <p className="text-xs text-muted-foreground">
                  One-time payment for permanent access
                </p>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-2">
            <Label htmlFor="maxFunnels">Max Funnels</Label>
            <Input
              id="maxFunnels"
              type="number"
              value={maxFunnels}
              onChange={(e) => setMaxFunnels(parseInt(e.target.value, 10) || 0)}
              min={-1}
              aria-label="Max funnels"
            />
            <p className="text-xs text-muted-foreground">
              Use -1 for unlimited funnels
            </p>
          </div>

          {/* Stripe IDs */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Stripe Configuration</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stripeProductId">Product ID</Label>
                <Input
                  id="stripeProductId"
                  value={stripeProductId}
                  onChange={(e) => setStripeProductId(e.target.value)}
                  placeholder="prod_..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripePriceIdMonthly">Monthly Price ID</Label>
                <Input
                  id="stripePriceIdMonthly"
                  value={stripePriceIdMonthly}
                  onChange={(e) => setStripePriceIdMonthly(e.target.value)}
                  placeholder="price_..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripePriceIdYearly">Yearly Price ID</Label>
                <Input
                  id="stripePriceIdYearly"
                  value={stripePriceIdYearly}
                  onChange={(e) => setStripePriceIdYearly(e.target.value)}
                  placeholder="price_..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripePriceIdLifetime">Lifetime Price ID</Label>
                <Input
                  id="stripePriceIdLifetime"
                  value={stripePriceIdLifetime}
                  onChange={(e) => setStripePriceIdLifetime(e.target.value)}
                  placeholder="price_..."
                  aria-label="Stripe lifetime price ID"
                />
                <p className="text-xs text-muted-foreground">
                  Stripe Price ID for one-time payment
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label htmlFor="features">Features (one per line)</Label>
            <Textarea
              id="features"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="Enter features, one per line"
              rows={5}
            />
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Active</Label>
            <span className="text-xs text-muted-foreground ml-2">
              Inactive tiers won't appear in the pricing page
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TierCreator;
