import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Check,
  Copy,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  CheckCircle2,
  Rocket,
  Database,
  Key,
  Settings,
  Shield,
  PartyPopper,
  Link,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupData {
  projectId: string;
  adminEmail: string;
  vercelUrl: string;
}

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Rocket },
  { id: "supabase", title: "Database", icon: Database },
  { id: "github", title: "Functions", icon: Terminal },
  { id: "migrations", title: "Setup DB", icon: Database },
  { id: "secrets", title: "Secrets", icon: Key },
  { id: "envvars", title: "Env Vars", icon: Settings },
  { id: "authurl", title: "Auth URL", icon: Link },
  { id: "admin", title: "Admin", icon: Shield },
  { id: "complete", title: "Done", icon: PartyPopper },
];

const Setup = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<SetupData>({
    projectId: "",
    adminEmail: "",
    vercelUrl: "",
  });
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please select and copy manually",
        variant: "destructive",
      });
    }
  };

  const markStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => ({ ...prev, [stepId]: true }));
  };

  const canProceed = () => {
    const step = STEPS[currentStep];
    switch (step.id) {
      case "welcome":
        return true;
      case "supabase":
      case "github":
      case "migrations":
      case "secrets":
      case "envvars":
      case "authurl":
      case "admin":
        return completedSteps[step.id];
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Admin SQL with correct schema
  const adminSql = `-- Make yourself an admin
-- Replace the email below with the one you used to sign up
INSERT INTO public.admin_users (user_id, is_admin)
SELECT id, true
FROM auth.users
WHERE email = '${data.adminEmail || "your-email@example.com"}'
ON CONFLICT (user_id) DO NOTHING;`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - matches Dashboard */}
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">FunnelSim Setup</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
        {/* Page Title */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Setup Wizard</h2>
          <p className="text-muted-foreground">
            Follow these steps to configure your FunnelSim installation
          </p>
        </div>

        {/* Stepper */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center justify-between min-w-max gap-1">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isComplete = index < currentStep || completedSteps[step.id];
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                        isComplete
                          ? "bg-primary border-primary text-primary-foreground"
                          : isCurrent
                          ? "border-primary text-primary bg-primary/10"
                          : "border-muted text-muted-foreground"
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1.5 hidden md:block whitespace-nowrap",
                        isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 w-6 lg:w-10 mx-1",
                        index < currentStep ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = STEPS[currentStep].icon;
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
              <div>
                <CardTitle>{STEPS[currentStep].title}</CardTitle>
                <CardDescription>
                  Step {currentStep + 1} of {STEPS.length}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Welcome Step */}
            {STEPS[currentStep].id === "welcome" && (
              <>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    Great job deploying to Vercel! Now let's connect your database and
                    finish the setup. This takes about 10 minutes.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-4">You'll need a Supabase account (free):</h3>
                  <div className="space-y-3">
                    <ChecklistItem
                      title="Supabase account"
                      description="Provides your database and user authentication"
                      href="https://supabase.com/dashboard"
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-2">What we'll do:</h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                    <li>Create a Supabase project (your database)</li>
                    <li>Connect your GitHub repo to Supabase (auto-deploys backend functions)</li>
                    <li>Copy & paste some SQL to set up tables</li>
                    <li>Add environment variables to Vercel</li>
                    <li>Make yourself an admin</li>
                  </ol>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-amber-600 dark:text-amber-400 text-sm">
                    <strong>Note:</strong> Vercel created a copy of the code in your GitHub account.
                    We'll use that to auto-deploy backend functions to Supabase.
                  </p>
                </div>
              </>
            )}

            {/* Create Supabase Project Step */}
            {STEPS[currentStep].id === "supabase" && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-600 dark:text-blue-400">
                    Now let's create your database. Supabase provides a free PostgreSQL database
                    with authentication built in.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Go to Supabase Dashboard</p>
                      <a
                        href="https://supabase.com/dashboard/projects"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        Open Supabase Dashboard <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Click "New Project"</p>
                      <p className="text-sm text-muted-foreground">
                        Choose an organization (or create one), pick a name, and set a database password
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Wait for it to finish setting up (~2 minutes)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Copy your Project ID and paste below:</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Go to Settings → General → "Reference ID"
                      </p>
                      <Input
                        placeholder="e.g., abcdefghijklmnop"
                        value={data.projectId}
                        onChange={(e) => setData({ ...data, projectId: e.target.value })}
                        className="font-mono max-w-md"
                      />
                    </div>
                  </div>
                </div>

                <StepCheckbox
                  id="supabase"
                  label="Done! My Supabase project is ready and I've entered the Project ID"
                  checked={completedSteps["supabase"]}
                  onCheckedChange={(checked) => {
                    if (checked && data.projectId) markStepComplete("supabase");
                    else setCompletedSteps((prev) => ({ ...prev, supabase: false }));
                  }}
                  disabled={!data.projectId}
                />
              </>
            )}

            {/* Deploy Edge Functions Step */}
            {STEPS[currentStep].id === "github" && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-600 dark:text-blue-400">
                    Now we need to deploy the backend "Edge Functions" that handle payments,
                    password resets, and other server-side features.
                  </p>
                </div>

                {/* Option A: Pro Plan - GitHub Integration */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">Option A</span>
                    <span className="font-semibold">Automatic Setup</span>
                    <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">Requires Supabase Pro</span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    If you have Supabase Pro, you can connect GitHub for automatic deployments:
                  </p>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">1.</span>
                      <div>
                        Go to{" "}
                        <a
                          href={`https://supabase.com/dashboard/project/${data.projectId || "_"}/settings/integrations`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Integrations Settings <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">2.</span>
                      <span>Find "GitHub" and click "Connect"</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">3.</span>
                      <span>Select your "funnelsim" repository and enable "Edge Functions"</span>
                    </div>
                  </div>
                </div>

                {/* Option B: Free Plan - CLI Instructions */}
                <div className="border-2 border-primary/50 rounded-lg p-4 bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">Option B</span>
                    <span className="font-semibold">Manual Setup (Free Plan)</span>
                    <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">Works on Free Tier</span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    If you're on the free Supabase plan, follow these steps to deploy manually using the command line:
                  </p>

                  <div className="space-y-4">
                    {/* Step 1: Open Terminal */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold text-xs">
                          1
                        </div>
                        <p className="font-medium text-sm">Open a Terminal</p>
                      </div>
                      <div className="ml-8 text-sm text-muted-foreground space-y-1">
                        <p><strong>Windows:</strong> Press <code className="bg-muted px-1 rounded">Win + R</code>, type <code className="bg-muted px-1 rounded">cmd</code>, press Enter</p>
                        <p><strong>Mac:</strong> Press <code className="bg-muted px-1 rounded">Cmd + Space</code>, type <code className="bg-muted px-1 rounded">Terminal</code>, press Enter</p>
                        <p><strong>Linux:</strong> Press <code className="bg-muted px-1 rounded">Ctrl + Alt + T</code></p>
                      </div>
                    </div>

                    {/* Step 2: Install Node.js if needed */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold text-xs">
                          2
                        </div>
                        <p className="font-medium text-sm">Check if Node.js is installed</p>
                      </div>
                      <div className="ml-8">
                        <p className="text-sm text-muted-foreground mb-2">Type this command and press Enter:</p>
                        <CommandBlock command="node --version" onCopy={copyToClipboard} label="Check Node" />
                        <p className="text-xs text-muted-foreground mt-2">
                          If you see a version number (like v18.0.0), skip to step 3.
                          If you see an error, <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">download Node.js here</a> and install it first.
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Clone your repo */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold text-xs">
                          3
                        </div>
                        <p className="font-medium text-sm">Download your code from GitHub</p>
                      </div>
                      <div className="ml-8">
                        <p className="text-sm text-muted-foreground mb-2">
                          Go to your GitHub account, find the "funnelsim" repo that Vercel created, and copy the clone URL. Then run:
                        </p>
                        <CommandBlock command="git clone https://github.com/YOUR_USERNAME/funnelsim.git" onCopy={copyToClipboard} label="Git clone" />
                        <p className="text-xs text-muted-foreground mt-2">
                          Replace YOUR_USERNAME with your actual GitHub username.
                        </p>
                      </div>
                    </div>

                    {/* Step 4: Navigate to folder */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold text-xs">
                          4
                        </div>
                        <p className="font-medium text-sm">Go into the project folder</p>
                      </div>
                      <div className="ml-8">
                        <CommandBlock command="cd funnelsim" onCopy={copyToClipboard} label="Change directory" />
                      </div>
                    </div>

                    {/* Step 5: Login to Supabase */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold text-xs">
                          5
                        </div>
                        <p className="font-medium text-sm">Login to Supabase CLI</p>
                      </div>
                      <div className="ml-8">
                        <p className="text-sm text-muted-foreground mb-2">This will open your browser to authenticate:</p>
                        <CommandBlock command="npx supabase login" onCopy={copyToClipboard} label="Supabase login" />
                        <p className="text-xs text-muted-foreground mt-2">
                          Click "Allow" in the browser window that opens, then return to your terminal.
                        </p>
                      </div>
                    </div>

                    {/* Step 6: Link project */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold text-xs">
                          6
                        </div>
                        <p className="font-medium text-sm">Link to your Supabase project</p>
                      </div>
                      <div className="ml-8">
                        <CommandBlock
                          command={`npx supabase link --project-ref ${data.projectId || "YOUR_PROJECT_ID"}`}
                          onCopy={copyToClipboard}
                          label="Link project"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          When asked for the database password, enter the password you set when creating the Supabase project.
                        </p>
                      </div>
                    </div>

                    {/* Step 7: Deploy functions */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold text-xs">
                          7
                        </div>
                        <p className="font-medium text-sm">Deploy all Edge Functions</p>
                      </div>
                      <div className="ml-8">
                        <CommandBlock command="npx supabase functions deploy" onCopy={copyToClipboard} label="Deploy functions" />
                        <p className="text-xs text-muted-foreground mt-2">
                          This uploads all the backend functions. It may take a minute or two.
                        </p>
                      </div>
                    </div>

                    {/* Step 8: Verify */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold text-xs">
                          8
                        </div>
                        <p className="font-medium text-sm">Verify deployment</p>
                      </div>
                      <div className="ml-8">
                        <p className="text-sm text-muted-foreground">
                          Go to{" "}
                          <a
                            href={`https://supabase.com/dashboard/project/${data.projectId || "_"}/functions`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Edge Functions Dashboard <ExternalLink className="h-3 w-3" />
                          </a>
                          {" "}and confirm you see these functions listed:
                        </p>
                        <ul className="text-xs text-muted-foreground mt-2 ml-4 list-disc space-y-0.5">
                          <li>create-checkout-session</li>
                          <li>create-portal-session</li>
                          <li>stripe-webhook</li>
                          <li>send-password-reset</li>
                          <li>reset-password-with-token</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    <strong>What these functions do:</strong> They handle Stripe payments, password resets,
                    and other server-side operations that can't run in the browser.
                  </p>
                </div>

                <StepCheckbox
                  id="github"
                  label="Done! Edge Functions are deployed (I can see them in the Supabase dashboard)"
                  checked={completedSteps["github"]}
                  onCheckedChange={(checked) => {
                    if (checked) markStepComplete("github");
                    else setCompletedSteps((prev) => ({ ...prev, github: false }));
                  }}
                />
              </>
            )}

            {/* Run Migrations Step */}
            {STEPS[currentStep].id === "migrations" && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-600 dark:text-blue-400">
                    Now we need to set up your database tables. This creates all the structure
                    FunnelSim needs to store users, funnels, subscriptions, etc.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Open the SQL file in a new tab:</p>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => window.open("/setup-migrations.sql", "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open setup-migrations.sql
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Copy all the SQL code</p>
                      <p className="text-sm text-muted-foreground">
                        Select all (Ctrl+A or Cmd+A) and copy (Ctrl+C or Cmd+C)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Open Supabase SQL Editor:</p>
                      <a
                        href={`https://supabase.com/dashboard/project/${data.projectId || "_"}/sql/new`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        Open SQL Editor <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Paste the SQL and click "Run"</p>
                      <p className="text-sm text-muted-foreground">
                        It may take 10-20 seconds to complete
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    <strong>Success looks like:</strong> You'll see "Success. No rows returned" -
                    this is normal! It means all the tables and settings were created.
                  </p>
                </div>

                <StepCheckbox
                  id="migrations"
                  label="Done! The SQL ran successfully"
                  checked={completedSteps["migrations"]}
                  onCheckedChange={(checked) => {
                    if (checked) markStepComplete("migrations");
                    else setCompletedSteps((prev) => ({ ...prev, migrations: false }));
                  }}
                />
              </>
            )}

            {/* Set Secrets Step */}
            {STEPS[currentStep].id === "secrets" && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-600 dark:text-blue-400">
                    Edge Functions need some secret keys to work. You'll add Stripe keys later
                    when you set up payments - for now, just add placeholder values.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Go to Edge Functions Secrets:</p>
                      <a
                        href={`https://supabase.com/dashboard/project/${data.projectId || "_"}/settings/functions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        Open Edge Functions Settings <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Add these secrets (click "Add new secret" for each):</p>
                      <div className="mt-3 space-y-2">
                        <SecretRow
                          name="STRIPE_SECRET_KEY"
                          value="sk_test_placeholder"
                          description="Your Stripe secret key (add real one later)"
                          onCopy={copyToClipboard}
                        />
                        <SecretRow
                          name="STRIPE_WEBHOOK_SECRET"
                          value="whsec_placeholder"
                          description="Stripe webhook signing secret (add real one later)"
                          onCopy={copyToClipboard}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-amber-600 dark:text-amber-400 text-sm">
                    <strong>Note:</strong> Using placeholder values lets you complete setup now.
                    You'll add real Stripe keys later from the Admin dashboard when you're ready
                    to accept payments.
                  </p>
                </div>

                <StepCheckbox
                  id="secrets"
                  label="Done! I've added the secrets"
                  checked={completedSteps["secrets"]}
                  onCheckedChange={(checked) => {
                    if (checked) markStepComplete("secrets");
                    else setCompletedSteps((prev) => ({ ...prev, secrets: false }));
                  }}
                />
              </>
            )}

            {/* Add Env Vars to Vercel Step */}
            {STEPS[currentStep].id === "envvars" && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-600 dark:text-blue-400">
                    Now let's connect your Vercel frontend to your Supabase backend by adding
                    environment variables.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Get your Supabase API keys:</p>
                      <a
                        href={`https://supabase.com/dashboard/project/${data.projectId || "_"}/settings/api`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        Open API Settings <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-sm text-muted-foreground mt-1">
                        You'll need the "URL" and "anon public" key
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Go to your Vercel project settings:</p>
                      <a
                        href="https://vercel.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        Open Vercel Dashboard <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click your project → Settings → Environment Variables
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Add these environment variables:</p>
                      <div className="mt-3 space-y-2">
                        <EnvVarRow
                          name="VITE_SUPABASE_URL"
                          value={data.projectId ? `https://${data.projectId}.supabase.co` : "https://YOUR_PROJECT_ID.supabase.co"}
                          onCopy={copyToClipboard}
                        />
                        <EnvVarRow
                          name="VITE_SUPABASE_PUBLISHABLE_KEY"
                          value="[paste your anon key here]"
                          onCopy={copyToClipboard}
                        />
                        <EnvVarRow
                          name="VITE_SUPABASE_PROJECT_ID"
                          value={data.projectId || "YOUR_PROJECT_ID"}
                          onCopy={copyToClipboard}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Redeploy your Vercel project</p>
                      <p className="text-sm text-muted-foreground">
                        Go to Deployments tab → click the "..." menu on latest → Redeploy
                      </p>
                    </div>
                  </div>
                </div>

                <StepCheckbox
                  id="envvars"
                  label="Done! Environment variables added and redeployed"
                  checked={completedSteps["envvars"]}
                  onCheckedChange={(checked) => {
                    if (checked) markStepComplete("envvars");
                    else setCompletedSteps((prev) => ({ ...prev, envvars: false }));
                  }}
                />
              </>
            )}

            {/* Configure Auth URL Step */}
            {STEPS[currentStep].id === "authurl" && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-600 dark:text-blue-400">
                    <strong>Important!</strong> Configure your Site URL so authentication emails
                    (password reset, email verification) link to your app instead of localhost.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Enter your Vercel URL:</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Find this in your Vercel Dashboard (e.g., your-app.vercel.app)
                      </p>
                      <Input
                        placeholder="https://your-app.vercel.app"
                        value={data.vercelUrl}
                        onChange={(e) => setData({ ...data, vercelUrl: e.target.value })}
                        className="max-w-md"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Go to Supabase Authentication settings:</p>
                      <a
                        href={`https://supabase.com/dashboard/project/${data.projectId || "_"}/auth/url-configuration`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        Open URL Configuration <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Update these settings:</p>
                      <div className="mt-2 space-y-2">
                        <div className="p-3 bg-muted/50 rounded">
                          <p className="text-sm font-medium">Site URL</p>
                          <code className="text-xs text-primary">{data.vercelUrl || "https://your-app.vercel.app"}</code>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <p className="text-sm font-medium">Redirect URLs (add this)</p>
                          <code className="text-xs text-primary">{data.vercelUrl ? `${data.vercelUrl}/**` : "https://your-app.vercel.app/**"}</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Click "Save" in Supabase</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-amber-600 dark:text-amber-400 text-sm">
                    <strong>Why this matters:</strong> Without this, password reset and verification
                    emails will contain links to localhost:3000 instead of your actual site.
                  </p>
                </div>

                <StepCheckbox
                  id="authurl"
                  label="Done! Site URL and Redirect URLs are configured"
                  checked={completedSteps["authurl"]}
                  onCheckedChange={(checked) => {
                    if (checked) markStepComplete("authurl");
                    else setCompletedSteps((prev) => ({ ...prev, authurl: false }));
                  }}
                />
              </>
            )}

            {/* Create Admin User Step */}
            {STEPS[currentStep].id === "admin" && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-600 dark:text-blue-400">
                    Finally, let's make you an admin so you can access the admin dashboard
                    to manage users, subscriptions, and settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Sign up on your deployed app</p>
                      <p className="text-sm text-muted-foreground">
                        Go to your Vercel URL and create an account
                      </p>
                      <div className="mt-2">
                        <Label htmlFor="adminEmail" className="text-sm">
                          What email did you use to sign up?
                        </Label>
                        <Input
                          id="adminEmail"
                          type="email"
                          placeholder="you@example.com"
                          value={data.adminEmail}
                          onChange={(e) => setData({ ...data, adminEmail: e.target.value })}
                          className="max-w-md mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Run this SQL in Supabase:</p>
                      <a
                        href={`https://supabase.com/dashboard/project/${data.projectId || "_"}/sql/new`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        Open SQL Editor <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="mt-3">
                        <CommandBlock command={adminSql} onCopy={copyToClipboard} label="Admin SQL" />
                      </div>
                      {!data.adminEmail && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          Enter your email above to auto-fill the SQL
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Log out and back in</p>
                      <p className="text-sm text-muted-foreground">
                        You should now see a shield icon in your dashboard header - that's the admin link!
                      </p>
                    </div>
                  </div>
                </div>

                <StepCheckbox
                  id="admin"
                  label="Done! I can access the admin dashboard"
                  checked={completedSteps["admin"]}
                  onCheckedChange={(checked) => {
                    if (checked) markStepComplete("admin");
                    else setCompletedSteps((prev) => ({ ...prev, admin: false }));
                  }}
                />
              </>
            )}

            {/* Complete Step */}
            {STEPS[currentStep].id === "complete" && (
              <>
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Setup Complete!</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Congratulations! Your FunnelSim instance is now fully configured and ready to use.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        What's working now
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>✓ User authentication (sign up/login)</li>
                        <li>✓ Funnel builder</li>
                        <li>✓ Dashboard</li>
                        <li>✓ Admin area</li>
                        <li>✓ Whitelabel settings</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-500/20 bg-amber-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="h-4 w-4 text-amber-500" />
                        To finish setup
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Set up Stripe for payments</li>
                        <li>• Create products in Stripe</li>
                        <li>• Link products in Admin → Products</li>
                        <li>• Customize branding in Admin → Settings</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        See manual sections 5-6 (Stripe) and 10-11 (Products & Branding)
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button onClick={() => window.location.href = "/"}>
                    Go to Your App
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open("https://github.com/martincrumlish/funnelsim/blob/main/docs/manual.html#stripe-setup", "_blank")}
                  >
                    Continue to Stripe Setup (Section 5)
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {currentStep < STEPS.length - 1 && (
            <Button onClick={nextStep} disabled={!canProceed()}>
              {canProceed() ? "Continue" : "Complete this step first"}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

// Helper Components

interface ChecklistItemProps {
  title: string;
  description: string;
  href: string;
}

const ChecklistItem = ({ title, description, href }: ChecklistItemProps) => (
  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">
        {description}{" "}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          Sign up <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  </div>
);

interface StepCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const StepCheckbox = ({ id, label, checked, onCheckedChange, disabled }: StepCheckboxProps) => (
  <div className="flex items-center gap-3 pt-4 border-t">
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={(val) => onCheckedChange(val === true)}
      disabled={disabled}
    />
    <Label htmlFor={id} className={cn("cursor-pointer", disabled && "opacity-50")}>
      {label}
    </Label>
  </div>
);

interface CommandBlockProps {
  command: string;
  onCopy: (text: string, label: string) => void;
  label?: string;
}

const CommandBlock = ({ command, onCopy, label = "Command" }: CommandBlockProps) => (
  <div className="relative group">
    <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg p-4 font-mono text-sm text-zinc-100 overflow-x-auto">
      <pre className="whitespace-pre-wrap break-all">{command}</pre>
    </div>
    <Button
      size="sm"
      variant="secondary"
      className="absolute top-2 right-2 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
      onClick={() => onCopy(command, label)}
    >
      <Copy className="h-3 w-3 mr-1" />
      Copy
    </Button>
  </div>
);

interface SecretRowProps {
  name: string;
  value: string;
  description: string;
  onCopy: (text: string, label: string) => void;
}

const SecretRow = ({ name, value, description, onCopy }: SecretRowProps) => (
  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
    <div className="flex-1 min-w-0">
      <code className="font-mono text-primary">{name}</code>
      <p className="text-xs text-muted-foreground truncate">{description}</p>
    </div>
    <Button size="sm" variant="ghost" onClick={() => onCopy(value, name)}>
      <Copy className="h-3 w-3" />
    </Button>
  </div>
);

interface EnvVarRowProps {
  name: string;
  value: string;
  onCopy: (text: string, label: string) => void;
}

const EnvVarRow = ({ name, value, onCopy }: EnvVarRowProps) => (
  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
    <div className="flex-1 min-w-0">
      <code className="font-mono text-primary">{name}</code>
      <p className="text-xs text-muted-foreground font-mono truncate">{value}</p>
    </div>
    <Button size="sm" variant="ghost" onClick={() => onCopy(`${name}=${value}`, name)}>
      <Copy className="h-3 w-3" />
    </Button>
  </div>
);

export default Setup;
