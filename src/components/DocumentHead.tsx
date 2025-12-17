import { useEffect } from "react";
import { useWhitelabel } from "@/hooks/useWhitelabel";

/**
 * Component that dynamically updates document title and favicon based on whitelabel config
 */
export const DocumentHead = () => {
  const { config, isLoading } = useWhitelabel();

  useEffect(() => {
    if (isLoading) return;

    // Update document title
    const brandName = config.brand_name || "FunnelSim";
    document.title = brandName;

    // Update favicon
    if (config.favicon_url) {
      let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = config.favicon_url;
    }

    // Update meta tags
    const updateMetaTag = (name: string, content: string) => {
      let meta = document.querySelector<HTMLMetaElement>(`meta[property="${name}"]`)
        || document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (meta) {
        meta.content = content;
      }
    };

    updateMetaTag("og:title", brandName);
    updateMetaTag("twitter:title", brandName);

    if (config.tagline) {
      updateMetaTag("og:description", config.tagline);
      updateMetaTag("twitter:description", config.tagline);
      updateMetaTag("description", config.tagline);
    }
  }, [config, isLoading]);

  return null;
};
