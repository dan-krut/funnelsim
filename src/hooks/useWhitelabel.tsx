import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  WhitelabelConfig,
  WhitelabelFeature,
  WhitelabelTestimonial,
  WhitelabelFAQ,
} from "@/integrations/supabase/types";

/**
 * Default whitelabel configuration values.
 * Used as fallback when database config is not available.
 */
const DEFAULT_CONFIG: WhitelabelConfigData = {
  id: '',
  brand_name: 'FunnelSim',
  tagline: 'The standard for funnel modeling and simulation',
  primary_color: '#6366f1',
  logo_light_url: null,
  logo_dark_url: null,
  favicon_url: null,
  hero_headline: 'Simulate High-Converting Sales Funnels Instantly',
  hero_subheadline: 'The first visual funnel builder that predicts your profit before you build. Map out flows, calculate conversions, and optimize ROI in real-time.',
  hero_badge_text: 'Early Bird Deal Now Available',
  cta_button_text: 'Start Modeling Free',
  features: null,
  testimonials: null,
  faq: null,
  footer_text: 'The standard for funnel modeling and simulation. Built for marketers who demand data over guesswork.',
  email_sender_name: 'FunnelSim',
  updated_at: null,
};

/**
 * Default features for the landing page.
 */
export const DEFAULT_FEATURES: WhitelabelFeature[] = [
  {
    title: "Visual Flow Builder",
    description: "Drag, drop, and connect nodes. Build complex multi-step funnels in seconds with our intuitive React Flow interface.",
    icon: "MousePointer2",
  },
  {
    title: "Real-Time ROI Calc",
    description: "Input traffic costs and conversion rates. Watch profit margins and EPC calculate instantly as you tweak numbers.",
    icon: "Calculator",
  },
  {
    title: "Smart Logic Nodes",
    description: "Specialized nodes for OTOs (One-Time Offers), Downsells, and Order Bumps with automatic branching logic.",
    icon: "Zap",
  },
  {
    title: "Cloud Persistence",
    description: "Auto-saving to the cloud. Never lose your work. Access your funnels from any device, anywhere, securely.",
    icon: "Cloud",
  },
  {
    title: "Client-Ready Exports",
    description: "Generate professional PDF reports or high-res PNGs to impress clients and stakeholders.",
    icon: "Share2",
  },
  {
    title: "Proven Templates",
    description: "Don't start from blank. Load high-converting funnel structures for webinars, lead magnets, and high-ticket offers.",
    icon: "Layout",
  },
];

/**
 * Default testimonials for the landing page.
 */
export const DEFAULT_TESTIMONIALS: WhitelabelTestimonial[] = [
  {
    quote: "I used to spend hours in Excel trying to model upsell flows. FunnelSim lets me do it in 5 minutes during a client call. It closes deals.",
    author: "Sarah Jenkins",
    role: "Agency Owner",
    image: "https://i.pravatar.cc/150?u=sarah",
  },
  {
    quote: "The ability to instantly see how a 1% conversion bump affects total profit is a game changer. My media buyers live in this tool now.",
    author: "Marcus Chen",
    role: "Head of Growth",
    image: "https://i.pravatar.cc/150?u=marcus",
  },
  {
    quote: "Finally, a tool that speaks the language of funnel hackers. The visual canvas is exactly what I needed to plan my next launch.",
    author: "Elena Rodriguez",
    role: "Course Creator",
    image: "https://i.pravatar.cc/150?u=elena",
  },
];

/**
 * Default FAQ items for the landing page.
 */
export const DEFAULT_FAQ: WhitelabelFAQ[] = [
  {
    question: "What is FunnelSim?",
    answer: "FunnelSim is a powerful visual tool that allows you to design, simulate, and optimize your marketing funnels. You can map out customer journeys, set conversion rates, and simulate traffic flow to predict revenue and identify bottlenecks before you spend a dime on ads.",
  },
  {
    question: "Can I export my funnel designs?",
    answer: "Yes! You can export your funnel designs as high-quality images (PNG/JPG) or as PDF reports to share with your team or clients. We also support exporting data in CSV format for further analysis.",
  },
  {
    question: "How accurate are the simulations?",
    answer: "Our simulation engine uses advanced statistical models to provide realistic projections based on the conversion rates and traffic data you input. While no simulation can predict the future 100%, FunnelSim gives you a statistically significant range of probable outcomes to help you make informed decisions.",
  },
  {
    question: "Is there a free trial available?",
    answer: "Yes, we offer a 14-day free trial on all our plans. You can explore all features, build unlimited funnels, and run simulations to see if FunnelSim is the right fit for your business. No credit card required to start.",
  },
  {
    question: "Can I simulate different traffic sources?",
    answer: "Absolutely. You can define multiple traffic sources (e.g., Facebook Ads, Organic Search, Email) with different costs and conversion characteristics to see how they impact your overall funnel performance and ROI.",
  },
];

/**
 * Whitelabel configuration data with proper typing.
 */
export interface WhitelabelConfigData {
  id: string;
  brand_name: string;
  tagline: string | null;
  primary_color: string | null;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  hero_badge_text: string | null;
  cta_button_text: string | null;
  features: WhitelabelFeature[] | null;
  testimonials: WhitelabelTestimonial[] | null;
  faq: WhitelabelFAQ[] | null;
  footer_text: string | null;
  email_sender_name: string | null;
  updated_at: string | null;
}

interface WhitelabelContextType {
  config: WhitelabelConfigData;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const WhitelabelContext = createContext<WhitelabelContextType | undefined>(undefined);

/**
 * Gets environment variable overrides for whitelabel configuration.
 * Environment variables take precedence over database values for deployment-specific settings.
 */
function getEnvOverrides(): Partial<WhitelabelConfigData> {
  const overrides: Partial<WhitelabelConfigData> = {};

  // Check for environment variables (VITE_* prefix for Vite)
  const brandName = import.meta.env.VITE_BRAND_NAME;
  const brandTagline = import.meta.env.VITE_BRAND_TAGLINE;
  const primaryColor = import.meta.env.VITE_PRIMARY_COLOR;
  const logoUrl = import.meta.env.VITE_LOGO_URL;
  const logoDarkUrl = import.meta.env.VITE_LOGO_DARK_URL;
  const faviconUrl = import.meta.env.VITE_FAVICON_URL;

  if (brandName) overrides.brand_name = brandName;
  if (brandTagline) overrides.tagline = brandTagline;
  if (primaryColor) overrides.primary_color = primaryColor;
  if (logoUrl) overrides.logo_light_url = logoUrl;
  if (logoDarkUrl) overrides.logo_dark_url = logoDarkUrl;
  if (faviconUrl) overrides.favicon_url = faviconUrl;

  return overrides;
}

/**
 * Parses JSONB fields from the database into proper typed arrays.
 */
function parseConfigFromDatabase(data: WhitelabelConfig | null): WhitelabelConfigData {
  if (!data) {
    return DEFAULT_CONFIG;
  }

  let features: WhitelabelFeature[] | null = null;
  let testimonials: WhitelabelTestimonial[] | null = null;
  let faq: WhitelabelFAQ[] | null = null;

  // Parse features
  if (data.features) {
    try {
      const parsed = typeof data.features === 'string'
        ? JSON.parse(data.features)
        : data.features;
      if (Array.isArray(parsed)) {
        features = parsed as WhitelabelFeature[];
      }
    } catch {
      features = null;
    }
  }

  // Parse testimonials
  if (data.testimonials) {
    try {
      const parsed = typeof data.testimonials === 'string'
        ? JSON.parse(data.testimonials)
        : data.testimonials;
      if (Array.isArray(parsed)) {
        testimonials = parsed as WhitelabelTestimonial[];
      }
    } catch {
      testimonials = null;
    }
  }

  // Parse FAQ
  if (data.faq) {
    try {
      const parsed = typeof data.faq === 'string'
        ? JSON.parse(data.faq)
        : data.faq;
      if (Array.isArray(parsed)) {
        faq = parsed as WhitelabelFAQ[];
      }
    } catch {
      faq = null;
    }
  }

  return {
    id: data.id,
    brand_name: data.brand_name || DEFAULT_CONFIG.brand_name,
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
  };
}

/**
 * Provider component for whitelabel configuration.
 * Loads config from database and merges with environment variable overrides.
 */
export const WhitelabelProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<WhitelabelConfigData>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch whitelabel config from database (single row table)
      const { data, error } = await supabase
        .from('whitelabel_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is okay - we'll use defaults
        console.error('Error fetching whitelabel config:', error);
      }

      // Parse database config
      const dbConfig = parseConfigFromDatabase(data);

      // Get environment variable overrides
      const envOverrides = getEnvOverrides();

      // Merge: env vars take precedence over database values
      const mergedConfig: WhitelabelConfigData = {
        ...dbConfig,
        ...envOverrides,
      };

      setConfig(mergedConfig);
    } catch (error) {
      console.error('Error in fetchConfig:', error);
      // Fall back to defaults with env overrides
      setConfig({
        ...DEFAULT_CONFIG,
        ...getEnvOverrides(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const refreshConfig = async () => {
    await fetchConfig();
  };

  return (
    <WhitelabelContext.Provider value={{ config, isLoading, refreshConfig }}>
      {children}
    </WhitelabelContext.Provider>
  );
};

/**
 * Hook to access whitelabel configuration.
 * Must be used within a WhitelabelProvider.
 */
export const useWhitelabel = () => {
  const context = useContext(WhitelabelContext);
  if (context === undefined) {
    throw new Error("useWhitelabel must be used within a WhitelabelProvider");
  }
  return context;
};
