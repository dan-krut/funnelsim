import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, User, Mail, Lock, LogOut, Zap, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import logo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import { useTheme } from "next-themes";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import type { SubscriptionTier, BillingInterval } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ProfileContent = () => {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const { config } = useWhitelabel();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pricingTiers, setPricingTiers] = useState<SubscriptionTier[]>([]);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<BillingInterval>('monthly');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const {
    subscription,
    tier,
    isLoading: subscriptionLoading,
    funnelCount,
    funnelLimit,
    initiateCheckout,
    openCustomerPortal,
    refreshSubscription,
    isLifetime,
  } = useSubscription();

  // Handle checkout success/cancel URL params
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      toast({
        title: "Subscription successful!",
        description: "Thank you for upgrading. Your new plan is now active.",
      });
      // Remove the query params from URL
      navigate('/profile', { replace: true });
      // Refresh subscription data
      refreshSubscription();
    } else if (checkoutStatus === 'canceled') {
      toast({
        title: "Checkout canceled",
        description: "No changes were made to your subscription.",
        variant: "default",
      });
      navigate('/profile', { replace: true });
    }
  }, [searchParams, toast, navigate, refreshSubscription]);

  // Handle pending checkout from landing page pricing
  useEffect(() => {
    const shouldInitCheckout = searchParams.get('initCheckout') === 'true';
    const pendingPriceId = localStorage.getItem('pendingCheckoutPriceId');

    if (shouldInitCheckout && pendingPriceId && !isCheckingOut) {
      // Clear localStorage and URL params immediately to prevent re-triggering
      localStorage.removeItem('pendingCheckoutPriceId');
      navigate('/profile', { replace: true });

      // Initiate checkout
      setIsCheckingOut(true);
      initiateCheckout(pendingPriceId)
        .catch((error) => {
          toast({
            title: "Checkout failed",
            description: error.message || "Failed to start checkout",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsCheckingOut(false);
        });
    }
  }, [searchParams, initiateCheckout, navigate, toast, isCheckingOut]);

  // Fetch pricing tiers for upgrade dialog
  useEffect(() => {
    const fetchTiers = async () => {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setPricingTiers(data);
      }
    };

    fetchTiers();
  }, []);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      toast({
        title: "Email update initiated",
        description: "Please check both your old and new email for confirmation links.",
      });
      setNewEmail("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    // Find paid tiers that the user can upgrade to
    const upgradeTiers = pricingTiers.filter(t => t.price_monthly > 0);
    if (upgradeTiers.length > 0) {
      // Default to the first paid tier (usually Pro)
      setSelectedTier(upgradeTiers[0]);
      setSelectedBillingInterval('monthly');
      setUpgradeDialogOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "No upgrade options",
        description: "No paid tiers are currently available.",
      });
    }
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedTier) return;

    setIsCheckingOut(true);
    try {
      // Get the correct price ID based on billing interval
      let priceId: string | null = null;

      switch (selectedBillingInterval) {
        case 'lifetime':
          priceId = selectedTier.stripe_price_id_lifetime;
          break;
        case 'yearly':
          priceId = selectedTier.stripe_price_id_yearly;
          break;
        case 'monthly':
        default:
          priceId = selectedTier.stripe_price_id_monthly;
          break;
      }

      if (!priceId) {
        toast({
          variant: "destructive",
          title: "Configuration Error",
          description: `No ${selectedBillingInterval} price configured for this plan. Please contact support.`,
        });
        return;
      }

      await initiateCheckout(priceId, selectedBillingInterval);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to initiate checkout",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to open subscription management",
      });
    }
  };

  const getFormattedPrice = (tierData: SubscriptionTier, interval: BillingInterval) => {
    switch (interval) {
      case 'lifetime':
        return tierData.price_lifetime > 0 ? `$${tierData.price_lifetime}` : null;
      case 'yearly':
        return tierData.price_yearly > 0 ? `$${tierData.price_yearly}/year` : null;
      case 'monthly':
      default:
        return tierData.price_monthly > 0 ? `$${tierData.price_monthly}/month` : null;
    }
  };

  const hasLifetimeOption = selectedTier && selectedTier.stripe_price_id_lifetime && selectedTier.price_lifetime > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img
              src={theme === "dark"
                ? (config.logo_dark_url || logoDark)
                : (config.logo_light_url || logo)}
              alt={config.brand_name || "Funnel Builder"}
              className="h-6"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Account Information */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
            <p className="text-muted-foreground">Manage your account details and subscription</p>
          </div>

          {/* Subscription Section */}
          <SubscriptionCard
            tier={tier}
            subscription={subscription}
            funnelCount={funnelCount}
            onUpgrade={handleUpgrade}
            onManage={handleManageSubscription}
            isLoading={subscriptionLoading}
          />

          <Separator />

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your current account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email Address</Label>
                <Input value={user.email || ""} disabled className="bg-muted" />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Change Email */}
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Change Email</CardTitle>
                  <CardDescription>Update your email address</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email">New Email Address</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    You'll receive confirmation emails to both addresses
                  </p>
                </div>
                <Button type="submit" disabled={loading} size="sm">
                  {loading ? "Updating..." : "Update Email"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>
                <Button type="submit" disabled={loading} size="sm">
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Account Actions */}
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <LogOut className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <CardTitle>Sign Out</CardTitle>
                  <CardDescription>Sign out of your account</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30"
                onClick={signOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Upgrade Your Plan
            </DialogTitle>
            <DialogDescription>
              Choose a plan and billing frequency to upgrade your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tier Selection */}
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <RadioGroup
                value={selectedTier?.id || ''}
                onValueChange={(value) => {
                  const tier = pricingTiers.find(t => t.id === value);
                  if (tier) {
                    setSelectedTier(tier);
                    // Reset to monthly if lifetime is not available for this tier
                    if (selectedBillingInterval === 'lifetime' && !tier.stripe_price_id_lifetime) {
                      setSelectedBillingInterval('monthly');
                    }
                  }
                }}
                className="space-y-2"
              >
                {pricingTiers
                  .filter(t => t.price_monthly > 0)
                  .map((tierOption) => (
                    <div
                      key={tierOption.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTier?.id === tierOption.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedTier(tierOption);
                        if (selectedBillingInterval === 'lifetime' && !tierOption.stripe_price_id_lifetime) {
                          setSelectedBillingInterval('monthly');
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={tierOption.id} id={tierOption.id} />
                        <div>
                          <Label htmlFor={tierOption.id} className="font-medium cursor-pointer">
                            {tierOption.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {tierOption.max_funnels === -1
                              ? 'Unlimited funnels'
                              : `Up to ${tierOption.max_funnels} funnels`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </RadioGroup>
            </div>

            {/* Billing Interval Selection */}
            {selectedTier && (
              <div className="space-y-2">
                <Label>Billing Frequency</Label>
                <RadioGroup
                  value={selectedBillingInterval}
                  onValueChange={(value) => setSelectedBillingInterval(value as BillingInterval)}
                  className="space-y-2"
                >
                  {/* Monthly Option */}
                  {selectedTier.stripe_price_id_monthly && (
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedBillingInterval === 'monthly'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedBillingInterval('monthly')}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
                      </div>
                      <span className="font-medium">${selectedTier.price_monthly}/mo</span>
                    </div>
                  )}

                  {/* Yearly Option */}
                  {selectedTier.stripe_price_id_yearly && selectedTier.price_yearly > 0 && (
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedBillingInterval === 'yearly'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedBillingInterval('yearly')}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="yearly" id="yearly" />
                        <div>
                          <Label htmlFor="yearly" className="cursor-pointer">Yearly</Label>
                          {selectedTier.price_monthly > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Save ${(selectedTier.price_monthly * 12 - selectedTier.price_yearly).toFixed(0)}/year
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">${selectedTier.price_yearly}/yr</span>
                    </div>
                  )}

                  {/* Lifetime Option */}
                  {hasLifetimeOption && (
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedBillingInterval === 'lifetime'
                          ? 'border-purple-500 bg-purple-500/5'
                          : 'border-border hover:border-purple-500/50'
                      }`}
                      onClick={() => setSelectedBillingInterval('lifetime')}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="lifetime" id="lifetime" />
                        <div>
                          <Label htmlFor="lifetime" className="cursor-pointer text-purple-600 dark:text-purple-400">
                            Lifetime
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            One-time payment, never expires
                          </p>
                        </div>
                      </div>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        ${selectedTier.price_lifetime}
                      </span>
                    </div>
                  )}
                </RadioGroup>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setUpgradeDialogOpen(false)}
              disabled={isCheckingOut}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpgrade}
              disabled={!selectedTier || isCheckingOut}
            >
              {isCheckingOut ? 'Processing...' : 'Continue to Checkout'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Profile = () => {
  return (
    <SubscriptionProvider>
      <ProfileContent />
    </SubscriptionProvider>
  );
};

export default Profile;
