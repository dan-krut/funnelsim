import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WhitelabelEditor } from "@/components/admin/WhitelabelEditor";
import type { WhitelabelConfigData } from "@/hooks/useWhitelabel";
import type { WhitelabelConfigUpdate } from "@/integrations/supabase/types";

/**
 * Admin settings page for whitelabel configuration.
 * Allows editing of all branding and landing page content.
 */
export const AdminSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<WhitelabelConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('whitelabel_config')
        .select('*')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        // Parse JSONB fields
        let features = null;
        let testimonials = null;
        let faq = null;

        try {
          if (data.features) {
            features = typeof data.features === 'string'
              ? JSON.parse(data.features)
              : data.features;
          }
        } catch {
          features = [];
        }

        try {
          if (data.testimonials) {
            testimonials = typeof data.testimonials === 'string'
              ? JSON.parse(data.testimonials)
              : data.testimonials;
          }
        } catch {
          testimonials = [];
        }

        try {
          if (data.faq) {
            faq = typeof data.faq === 'string'
              ? JSON.parse(data.faq)
              : data.faq;
          }
        } catch {
          faq = [];
        }

        setConfig({
          id: data.id,
          brand_name: data.brand_name,
          tagline: data.tagline,
          primary_color: data.primary_color,
          logo_light_url: data.logo_light_url,
          logo_dark_url: data.logo_dark_url,
          favicon_url: data.favicon_url,
          hero_headline: data.hero_headline,
          hero_subheadline: data.hero_subheadline,
          hero_badge_text: data.hero_badge_text,
          cta_button_text: data.cta_button_text,
          features,
          testimonials,
          faq,
          footer_text: data.footer_text,
          email_sender_name: data.email_sender_name,
          updated_at: data.updated_at,
        });
      } else {
        // No config exists yet - will need to create one
        setConfig({
          id: '',
          brand_name: 'FunnelSim',
          tagline: null,
          primary_color: '#6366f1',
          logo_light_url: null,
          logo_dark_url: null,
          favicon_url: null,
          hero_headline: null,
          hero_subheadline: null,
          hero_badge_text: null,
          cta_button_text: null,
          features: null,
          testimonials: null,
          faq: null,
          footer_text: null,
          email_sender_name: null,
          updated_at: null,
        });
      }
    } catch (err: any) {
      console.error('Error fetching config:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (updates: WhitelabelConfigUpdate) => {
    try {
      setIsSaving(true);

      if (config?.id) {
        // Update existing config
        const { error: updateError } = await supabase
          .from('whitelabel_config')
          .update(updates)
          .eq('id', config.id);

        if (updateError) throw updateError;
      } else {
        // Insert new config (shouldn't happen normally due to migration seed)
        const { error: insertError } = await supabase
          .from('whitelabel_config')
          .insert(updates);

        if (insertError) throw insertError;
      }

      toast({
        title: "Settings saved",
        description: "Your whitelabel configuration has been updated.",
      });

      // Refresh config
      await fetchConfig();
    } catch (err: any) {
      console.error('Error saving config:', err);
      toast({
        title: "Error saving settings",
        description: err.message || 'Failed to save configuration',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure whitelabel branding and content
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure whitelabel branding and content
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure whitelabel branding and content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Last Updated */}
      {config?.updated_at && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Last updated: {new Date(config.updated_at).toLocaleString()}
        </div>
      )}

      {/* Editor */}
      {config && (
        <WhitelabelEditor
          config={config}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default AdminSettings;
