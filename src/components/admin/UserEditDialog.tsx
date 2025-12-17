import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail } from "lucide-react";
import type { UserWithSubscription } from "@/components/admin/UserTable";
import type { SubscriptionTier } from "@/integrations/supabase/types";

interface UserEditDialogProps {
  user: UserWithSubscription;
  tiers: SubscriptionTier[];
  onClose: () => void;
  onSave: () => void;
}

/**
 * Dialog for editing user details including email and subscription tier.
 * Also provides ability to trigger a password reset email.
 */
export const UserEditDialog = ({
  user,
  tiers,
  onClose,
  onSave,
}: UserEditDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState(user.email || "");
  const [selectedTierId, setSelectedTierId] = useState(
    user.subscription?.tier_id || tiers[0]?.id || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(emailValue)) {
      setEmailError("Invalid email format");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  const handleSave = async () => {
    // Validate email
    if (!validateEmail(email)) {
      return;
    }

    setIsSaving(true);

    try {
      // Update email in profiles table if changed
      if (email !== user.email) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ email })
          .eq("id", user.id);

        if (profileError) {
          throw new Error(`Failed to update email: ${profileError.message}`);
        }
      }

      // Update subscription tier if changed
      if (selectedTierId !== user.subscription?.tier_id) {
        if (user.subscription) {
          // Update existing subscription
          const { error: subError } = await supabase
            .from("user_subscriptions")
            .update({ tier_id: selectedTierId })
            .eq("user_id", user.id);

          if (subError) {
            throw new Error(`Failed to update subscription: ${subError.message}`);
          }
        } else {
          // Create new subscription record
          const { error: subError } = await supabase
            .from("user_subscriptions")
            .insert({
              user_id: user.id,
              tier_id: selectedTierId,
              status: "active",
            });

          if (subError) {
            throw new Error(`Failed to create subscription: ${subError.message}`);
          }
        }
      }

      toast({
        title: "User updated",
        description: "User details have been saved successfully",
      });

      onSave();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setIsSendingReset(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            email: user.email,
            redirectUrl: window.location.origin,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send password reset");
      }

      toast({
        title: "Password reset sent",
        description: `A password reset email has been sent to ${user.email}`,
      });
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      toast({
        title: "Error sending password reset",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details or send a password reset email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => validateEmail(email)}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
            />
            {emailError && (
              <p id="email-error" className="text-sm text-destructive">
                {emailError}
              </p>
            )}
          </div>

          {/* Subscription Tier */}
          <div className="space-y-2">
            <Label htmlFor="edit-tier">Subscription Tier</Label>
            <Select value={selectedTierId} onValueChange={setSelectedTierId}>
              <SelectTrigger id="edit-tier">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.name}
                    {tier.price_monthly > 0
                      ? ` ($${tier.price_monthly}/mo)`
                      : " (Free)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Password Reset Section */}
          <div className="border-t pt-4">
            <Label className="text-muted-foreground">Password Reset</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Send a password reset email to this user.
            </p>
            <Button
              variant="outline"
              onClick={handleSendPasswordReset}
              disabled={isSendingReset}
            >
              {isSendingReset ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Password Reset
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;
