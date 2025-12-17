import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import logo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";

interface SessionData {
  customer_email: string | null;
  payment_status: string;
  subscription_id: string | null;
  tier_name: string | null;
  tier_id: string | null;
}

type PageState = "loading" | "form" | "email-exists" | "success" | "error";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { config } = useWhitelabel();

  // State
  const [pageState, setPageState] = useState<PageState>("loading");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const sessionId = searchParams.get("session_id");

  // Redirect if no session_id
  useEffect(() => {
    if (!sessionId) {
      navigate("/");
      return;
    }

    fetchSessionData();
  }, [sessionId, navigate]);

  /**
   * Fetch checkout session data from the edge function
   */
  const fetchSessionData = async () => {
    if (!sessionId) return;

    setPageState("loading");
    setErrorMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("retrieve-checkout-session", {
        body: { session_id: sessionId },
      });

      if (error) {
        console.error("Error fetching session:", error);
        setErrorMessage(error.message || "Failed to retrieve checkout session");
        setPageState("error");
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to retrieve checkout session",
        });
        return;
      }

      if (!data || !data.customer_email) {
        setErrorMessage("Could not retrieve session details. The session may have expired.");
        setPageState("error");
        return;
      }

      setSessionData(data);
      setPageState("form");
    } catch (error: any) {
      console.error("Error in fetchSessionData:", error);
      setErrorMessage(error.message || "An unexpected error occurred");
      setPageState("error");
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred",
      });
    }
  };

  /**
   * Handle form submission to create account
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match",
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters",
      });
      return;
    }

    if (!sessionData?.customer_email || !sessionId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Session data is missing. Please try again.",
      });
      return;
    }

    setLoading(true);

    try {
      // Attempt to create the user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: sessionData.customer_email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) {
        // Check for email collision (user already exists)
        if (
          signUpError.message.toLowerCase().includes("already registered") ||
          signUpError.message.toLowerCase().includes("already exists") ||
          signUpError.message.toLowerCase().includes("user already")
        ) {
          setPageState("email-exists");
          return;
        }

        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error("Failed to create user account");
      }

      // Link the pending subscription to the new user
      const { data: linkData, error: linkError } = await supabase.functions.invoke(
        "link-pending-subscription",
        {
          body: {
            session_id: sessionId,
            user_id: signUpData.user.id,
          },
        }
      );

      if (linkError) {
        console.error("Error linking subscription:", linkError);
        // Don't fail completely - the account was created
        // The user may need to contact support to link their subscription
        toast({
          variant: "destructive",
          title: "Subscription Link Warning",
          description:
            "Your account was created but there was an issue linking your subscription. Please contact support if your plan is not active after verifying your email.",
        });
      }

      // Success!
      setPageState("success");
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create account",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render loading state
   */
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading your purchase details...</p>
    </div>
  );

  /**
   * Render error state
   */
  const renderError = () => (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {errorMessage || "Failed to load checkout session. Please try again."}
        </AlertDescription>
      </Alert>
      <div className="flex flex-col space-y-2">
        <Button onClick={fetchSessionData} className="w-full">
          Try Again
        </Button>
        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Return to Home
        </Button>
      </div>
    </div>
  );

  /**
   * Render email exists state
   */
  const renderEmailExists = () => (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Account Already Exists</AlertTitle>
        <AlertDescription>
          This email already has an account. Please log in to access your subscription. If you
          purchased a higher tier, please log in and upgrade from your Profile page.
        </AlertDescription>
      </Alert>
      <div className="flex flex-col space-y-2">
        <Link to="/auth" className="w-full">
          <Button className="w-full">Log In</Button>
        </Link>
        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Return to Home
        </Button>
      </div>
    </div>
  );

  /**
   * Render success state
   */
  const renderSuccess = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center space-y-4 py-4">
        <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Account Created Successfully!</h3>
          <p className="text-muted-foreground mt-1">
            Your {sessionData?.tier_name || "subscription"} plan is now active.
          </p>
        </div>
      </div>

      <Alert>
        <Mail className="h-4 w-4" />
        <AlertTitle>Check Your Email</AlertTitle>
        <AlertDescription>
          We've sent a verification email to <strong>{sessionData?.customer_email}</strong>. Please
          click the link in the email to verify your account and access all features.
        </AlertDescription>
      </Alert>

      <Link to="/dashboard" className="block w-full">
        <Button className="w-full">Go to Dashboard</Button>
      </Link>
    </div>
  );

  /**
   * Render account creation form
   */
  const renderForm = () => (
    <div className="space-y-4">
      {/* Purchase confirmation */}
      <div className="rounded-lg bg-primary/5 p-4 text-center">
        <p className="text-sm text-muted-foreground">Thank you for your purchase!</p>
        <p className="text-lg font-semibold text-primary">
          {sessionData?.tier_name || "Premium"} Plan
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={sessionData?.customer_email || ""}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This is the email used for your purchase
          </p>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
            minLength={6}
          />
        </div>

        <div>
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </div>
  );

  // Don't render anything if redirecting
  if (!sessionId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="fixed bottom-4 left-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <img
              src={
                theme === "dark"
                  ? config.logo_dark_url || logoDark
                  : config.logo_light_url || logo
              }
              alt={config.brand_name || "Funnel Builder"}
              className="h-12"
            />
          </div>
          <CardTitle>
            {pageState === "success"
              ? "Welcome!"
              : pageState === "email-exists"
              ? "Account Exists"
              : "Complete Your Account"}
          </CardTitle>
          <CardDescription>
            {pageState === "success"
              ? "Your account is ready to use"
              : pageState === "email-exists"
              ? "This email is already registered"
              : pageState === "error"
              ? "Something went wrong"
              : "Create a password to access your new subscription"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {pageState === "loading" && renderLoading()}
          {pageState === "form" && renderForm()}
          {pageState === "email-exists" && renderEmailExists()}
          {pageState === "success" && renderSuccess()}
          {pageState === "error" && renderError()}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;
