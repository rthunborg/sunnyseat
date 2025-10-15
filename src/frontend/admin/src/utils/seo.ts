/**
 * SEO utility functions for meta tags and structured data
 */

export interface VenueMetaData {
  name: string;
  slug: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  description?: string;
}

export interface MetaTags {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  canonical: string;
  structuredData: object;
}

/**
 * Generate SEO meta tags for venue pages
 */
export function generateVenueMeta(venue: VenueMetaData): MetaTags {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://sunnyseat.com';
  const description = venue.description || 
    `Check the sun forecast for ${venue.name} in Gothenburg. See when the patio gets sun today and tomorrow.`;

  return {
    title: `${venue.name} - Sunny Patio Forecast | SunnySeat`,
    description,
    ogTitle: `${venue.name} - SunnySeat`,
    ogDescription: `Find out when ${venue.name}'s patio gets sun`,
    ogImage: `${baseUrl}/api/og-image/${venue.slug}`,
    ogUrl: `${baseUrl}/v/${venue.slug}`,
    canonical: `${baseUrl}/v/${venue.slug}`,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: venue.address,
        addressLocality: 'Gothenburg',
        addressCountry: 'SE',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: venue.location.latitude,
        longitude: venue.location.longitude,
      },
    },
  };
}

/**
 * Update document meta tags
 */
export function updateMetaTags(meta: Partial<MetaTags>) {
  // Update title
  if (meta.title) {
    document.title = meta.title;
  }

  // Update or create meta tags
  const updateMeta = (name: string, content: string) => {
    let element = document.querySelector(`meta[name="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('name', name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  const updateProperty = (property: string, content: string) => {
    let element = document.querySelector(`meta[property="${property}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('property', property);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  if (meta.description) {
    updateMeta('description', meta.description);
  }

  if (meta.ogTitle) {
    updateProperty('og:title', meta.ogTitle);
  }

  if (meta.ogDescription) {
    updateProperty('og:description', meta.ogDescription);
  }

  if (meta.ogImage) {
    updateProperty('og:image', meta.ogImage);
  }

  if (meta.ogUrl) {
    updateProperty('og:url', meta.ogUrl);
  }

  // Update canonical link
  if (meta.canonical) {
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', meta.canonical);
  }

  // Update structured data
  if (meta.structuredData) {
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(meta.structuredData);
  }
}

/**
 * Generate default meta tags for the home page
 */
export function generateHomeMeta(): MetaTags {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://sunnyseat.com';

  return {
    title: 'SunnySeat - Find Sunny Patios in Gothenburg',
    description: 'Discover sunny outdoor patios in Gothenburg with real-time sun forecasts. Find the perfect spot for your next coffee or meal.',
    ogTitle: 'SunnySeat - Find Sunny Patios in Gothenburg',
    ogDescription: 'Discover sunny outdoor patios in Gothenburg with real-time sun forecasts',
    ogImage: `${baseUrl}/og-image.png`,
    ogUrl: baseUrl,
    canonical: baseUrl,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'SunnySeat',
      description: 'Find sunny outdoor patios in Gothenburg',
      url: baseUrl,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web Browser',
    },
  };
}
