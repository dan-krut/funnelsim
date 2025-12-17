import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Type, Layout, MessageSquare, HelpCircle, Image } from "lucide-react";
import type { WhitelabelConfigData } from "@/hooks/useWhitelabel";
import type { WhitelabelConfigUpdate, WhitelabelFeature, WhitelabelTestimonial, WhitelabelFAQ } from "@/integrations/supabase/types";
import { LogoUploader } from "@/components/admin/LogoUploader";
import { FeatureFormEditor } from "@/components/admin/FeatureFormEditor";
import { TestimonialFormEditor } from "@/components/admin/TestimonialFormEditor";
import { FAQFormEditor } from "@/components/admin/FAQFormEditor";
import { DEFAULT_FEATURES, DEFAULT_TESTIMONIALS, DEFAULT_FAQ } from "@/hooks/useWhitelabel";

interface WhitelabelEditorProps {
  config: WhitelabelConfigData;
  onSave: (updates: WhitelabelConfigUpdate) => Promise<void>;
  isSaving: boolean;
}

/**
 * Whitelabel configuration editor with tabbed interface.
 * Allows editing of branding, hero, features, testimonials, and FAQ sections.
 * Uses form-based editors for features, testimonials, and FAQ with visual icon picker.
 */
export const WhitelabelEditor = ({
  config,
  onSave,
  isSaving,
}: WhitelabelEditorProps) => {
  // Branding
  const [brandName, setBrandName] = useState(config.brand_name);
  const [tagline, setTagline] = useState(config.tagline || '');
  const [logoLightUrl, setLogoLightUrl] = useState(config.logo_light_url || '');
  const [logoDarkUrl, setLogoDarkUrl] = useState(config.logo_dark_url || '');
  const [faviconUrl, setFaviconUrl] = useState(config.favicon_url || '');

  // Hero
  const [heroHeadline, setHeroHeadline] = useState(config.hero_headline || '');
  const [heroSubheadline, setHeroSubheadline] = useState(config.hero_subheadline || '');
  const [heroBadgeText, setHeroBadgeText] = useState(config.hero_badge_text || '');
  const [ctaButtonText, setCtaButtonText] = useState(config.cta_button_text || '');

  // Features (array of objects)
  const [features, setFeatures] = useState<WhitelabelFeature[]>([]);

  // Testimonials (array of objects)
  const [testimonials, setTestimonials] = useState<WhitelabelTestimonial[]>([]);

  // FAQ (array of objects)
  const [faq, setFaq] = useState<WhitelabelFAQ[]>([]);

  // Footer
  const [footerText, setFooterText] = useState(config.footer_text || '');
  const [emailSenderName, setEmailSenderName] = useState(config.email_sender_name || '');

  // Initialize array fields from config
  useEffect(() => {
    // Use config values if available, otherwise use defaults
    if (config.features && Array.isArray(config.features) && config.features.length > 0) {
      setFeatures(config.features);
    } else {
      setFeatures(DEFAULT_FEATURES);
    }

    if (config.testimonials && Array.isArray(config.testimonials) && config.testimonials.length > 0) {
      setTestimonials(config.testimonials);
    } else {
      setTestimonials(DEFAULT_TESTIMONIALS);
    }

    if (config.faq && Array.isArray(config.faq) && config.faq.length > 0) {
      setFaq(config.faq);
    } else {
      setFaq(DEFAULT_FAQ);
    }
  }, [config.features, config.testimonials, config.faq]);

  /**
   * Validates features have required fields.
   */
  const validateFeatures = (): boolean => {
    return features.every(f => f.title.trim() !== '' && f.description.trim() !== '');
  };

  /**
   * Validates testimonials have required fields.
   */
  const validateTestimonials = (): boolean => {
    return testimonials.every(t => t.quote.trim() !== '' && t.author.trim() !== '');
  };

  /**
   * Validates FAQ items have required fields.
   */
  const validateFaq = (): boolean => {
    return faq.every(f => f.question.trim() !== '' && f.answer.trim() !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate array fields
    if (!validateFeatures()) {
      alert('All features must have a title and description.');
      return;
    }

    if (!validateTestimonials()) {
      alert('All testimonials must have a quote and author.');
      return;
    }

    if (!validateFaq()) {
      alert('All FAQ items must have a question and answer.');
      return;
    }

    const updates: WhitelabelConfigUpdate = {
      brand_name: brandName,
      tagline: tagline || null,
      logo_light_url: logoLightUrl || null,
      logo_dark_url: logoDarkUrl || null,
      favicon_url: faviconUrl || null,
      hero_headline: heroHeadline || null,
      hero_subheadline: heroSubheadline || null,
      hero_badge_text: heroBadgeText || null,
      cta_button_text: ctaButtonText || null,
      features: features as any,
      testimonials: testimonials as any,
      faq: faq as any,
      footer_text: footerText || null,
      email_sender_name: emailSenderName || null,
    };

    await onSave(updates);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="hero" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">Hero</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="testimonials" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Testimonials</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Configure your brand identity including logo, colors, and name.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name *</Label>
                  <Input
                    id="brandName"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g., FunnelSim"
                    required
                    aria-label="Brand name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g., Build better funnels"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Logos
                </h4>
                <div className="grid gap-6 md:grid-cols-3">
                  <LogoUploader
                    value={logoLightUrl}
                    onChange={(url) => setLogoLightUrl(url || '')}
                    label="Light Logo"
                  />

                  <LogoUploader
                    value={logoDarkUrl}
                    onChange={(url) => setLogoDarkUrl(url || '')}
                    label="Dark Logo"
                  />

                  <LogoUploader
                    value={faviconUrl}
                    onChange={(url) => setFaviconUrl(url || '')}
                    label="Favicon"
                    recommendedSize="32x32px"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Textarea
                    id="footerText"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Footer description text..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailSenderName">Email Sender Name</Label>
                  <Input
                    id="emailSenderName"
                    value={emailSenderName}
                    onChange={(e) => setEmailSenderName(e.target.value)}
                    placeholder="e.g., FunnelSim Support"
                  />
                  <p className="text-xs text-muted-foreground">
                    Name shown in system emails
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Tab */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>
                Configure the main hero section of your landing page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="heroHeadline">Headline</Label>
                <Input
                  id="heroHeadline"
                  value={heroHeadline}
                  onChange={(e) => setHeroHeadline(e.target.value)}
                  placeholder="e.g., Simulate High-Converting Sales Funnels"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroSubheadline">Subheadline</Label>
                <Textarea
                  id="heroSubheadline"
                  value={heroSubheadline}
                  onChange={(e) => setHeroSubheadline(e.target.value)}
                  placeholder="Supporting text for your headline..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="heroBadgeText">Badge Text</Label>
                  <Input
                    id="heroBadgeText"
                    value={heroBadgeText}
                    onChange={(e) => setHeroBadgeText(e.target.value)}
                    placeholder="e.g., Early Bird Deal"
                  />
                  <p className="text-xs text-muted-foreground">
                    Small badge shown above the headline
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ctaButtonText">CTA Button Text</Label>
                  <Input
                    id="ctaButtonText"
                    value={ctaButtonText}
                    onChange={(e) => setCtaButtonText(e.target.value)}
                    placeholder="e.g., Start Modeling Free"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Features Section</CardTitle>
              <CardDescription>
                Configure the features displayed on your landing page.
                Use the visual editor to add icons, titles, and descriptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureFormEditor
                features={features}
                onChange={setFeatures}
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testimonials Tab */}
        <TabsContent value="testimonials">
          <Card>
            <CardHeader>
              <CardTitle>Testimonials Section</CardTitle>
              <CardDescription>
                Configure customer testimonials displayed on your landing page.
                Add quotes with author information and optional avatar images.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestimonialFormEditor
                testimonials={testimonials}
                onChange={setTestimonials}
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>FAQ Section</CardTitle>
              <CardDescription>
                Configure frequently asked questions displayed on your landing page.
                Answers support markdown formatting for rich text.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FAQFormEditor
                faq={faq}
                onChange={setFaq}
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isSaving} size="lg">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Tabs>
    </form>
  );
};

export default WhitelabelEditor;
