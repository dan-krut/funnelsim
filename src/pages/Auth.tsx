import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import defaultLogo from "@/assets/logo.png";
import defaultLogoDark from "@/assets/logo-dark.png";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";

const Auth = () => {
  const { theme } = useTheme();
  const { config } = useWhitelabel();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [hasFreeTier, setHasFreeTier] = useState(false);
  const [tiersLoaded, setTiersLoaded] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isCreatorPlan = searchParams.get('plan') === 'creator';

  // Check if a free tier exists
  useEffect(() => {
    const checkFreeTier = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_tiers')
          .select('id')
          .eq('is_active', true)
          .eq('price_monthly', 0)
          .limit(1);

        if (!error && data && data.length > 0) {
          setHasFreeTier(true);
        }
      } catch (err) {
        console.error('Error checking free tier:', err);
      } finally {
        setTiersLoaded(true);
      }
    };

    checkFreeTier();
  }, []);

  useEffect(() => {
    if (user) {
      // Check if there's a pending checkout
      const hasPendingCheckout = searchParams.get('checkout') === 'pending' ||
        localStorage.getItem('pendingCheckoutPriceId');

      if (hasPendingCheckout) {
        navigate("/profile?initCheckout=true");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, navigate, searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Check for plan upgrade param
      const plan = searchParams.get('plan');
      if (plan === 'creator') {
        try {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            // Upgrade to Course Creator tier
            const { data: tier } = await supabase
              .from('subscription_tiers')
              .select('id')
              .eq('name', 'Course Creator')
              .limit(1)
              .single();

            if (tier) {
              await supabase
                .from('user_subscriptions')
                .update({ tier_id: tier.id, is_lifetime: true })
                .eq('user_id', newUser.id);
            }

            // Auto-create template funnel
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
            const templateTraffic = [{ id: "1", type: "Facebook Ads", visits: 1000, cost: 500 }];

            const { data: funnel } = await supabase
              .from("funnels")
              .insert({
                user_id: newUser.id,
                name: "My Course Funnel",
                nodes: templateNodes,
                edges: templateEdges,
                traffic_sources: templateTraffic,
              })
              .select()
              .single();

            if (funnel) {
              localStorage.setItem('fpp_show_welcome', 'true');
              toast({ title: "You're in!", description: "Your course funnel is ready. Adjust the numbers to match your offer." });
              navigate(`/funnel/${funnel.id}`);
              return;
            }
          }
        } catch (err) {
          console.error('Error setting up creator plan:', err);
        }
      }

      toast({
        title: "Account created!",
        description: `Welcome to ${config.brand_name || 'Funnel Builder'}`,
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "If an account exists with that email, a password reset link has been sent.",
      });
      setResetMode(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Shared form components
  const signInForm = (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="button" variant="link" className="px-0 text-sm" onClick={() => setResetMode(true)}>Forgot password?</Button>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );

  const signUpForm = (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Activating..." : isCreatorPlan ? "Activate My Planner" : "Create Free Account"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );

  const resetForm = (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => setResetMode(false)} className="mb-4">← Back to Sign In</Button>
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input id="reset-email" type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );

  // Creator plan: dedicated signup page
  if (isCreatorPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-emerald-500/5 to-accent/5 p-4 relative">
        <div className="fixed bottom-4 left-4"><ThemeToggle /></div>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              {config.logo_light_url || config.logo_dark_url ? (
                <img
                  src={theme === "dark" ? (config.logo_dark_url || config.logo_light_url) : (config.logo_light_url || config.logo_dark_url)}
                  alt={config.brand_name || "Course Visionary"}
                  className="h-12"
                />
              ) : (
                <span className="text-2xl font-bold text-foreground">{config.brand_name || "Course Visionary"}</span>
              )}
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
              <p className="text-sm font-semibold text-emerald-400">Course Creator Plan Included</p>
              <p className="text-xs text-muted-foreground mt-1">25 funnels, profit calculator, benchmark insights, export to PDF</p>
            </div>
            <CardDescription className="text-center pt-2">
              Create your account to start planning your course funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetMode ? resetForm : (
              <Tabs defaultValue="signup" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signup">Activate</TabsTrigger>
                  <TabsTrigger value="signin">I Have an Account</TabsTrigger>
                </TabsList>
                <TabsContent value="signup">{signUpForm}</TabsContent>
                <TabsContent value="signin">{signInForm}</TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: regular auth page
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 relative">
      <div className="fixed bottom-4 left-4"><ThemeToggle /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            {config.logo_light_url || config.logo_dark_url ? (
              <img
                src={theme === "dark" ? (config.logo_dark_url || config.logo_light_url) : (config.logo_light_url || config.logo_dark_url)}
                alt={config.brand_name || "Course Visionary"}
                className="h-12"
              />
            ) : (
              <span className="text-2xl font-bold text-foreground">{config.brand_name || "Course Visionary"}</span>
            )}
          </div>
          <CardDescription className="text-center">
            Create, save, and manage your conversion funnels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetMode ? resetForm : hasFreeTier ? (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up Free</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">{signInForm}</TabsContent>
              <TabsContent value="signup">{signUpForm}</TabsContent>
            </Tabs>
          ) : signInForm}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
