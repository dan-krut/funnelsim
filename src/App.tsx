import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { WhitelabelProvider } from "@/hooks/useWhitelabel";
import { DocumentHead } from "@/components/DocumentHead";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import FunnelBuilder from "./pages/FunnelBuilder";
import ResetPassword from "./pages/ResetPassword";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";
import {
  AdminLayout,
  AdminDashboard,
  AdminUsers,
  AdminProducts,
  AdminSubscriptions,
  AdminSettings,
} from "./pages/admin";

const queryClient = new QueryClient();

// Routes that don't require Supabase to be configured
const SetupRoutes = () => (
  <Routes>
    <Route path="/setup" element={<Setup />} />
  </Routes>
);

// Main app routes that require Supabase
const MainRoutes = () => (
  <WhitelabelProvider>
    <TooltipProvider>
      <DocumentHead />
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/funnel/:id" element={<FunnelBuilder />} />

          {/* Admin Routes - Protected by AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  </WhitelabelProvider>
);

// Router wrapper that checks if we're on setup route
const AppRouter = () => {
  const location = useLocation();
  const isSetupRoute = location.pathname === "/setup";

  if (isSetupRoute) {
    return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SetupRoutes />
      </TooltipProvider>
    );
  }

  return <MainRoutes />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
