/**
 * SEO utility functions
 */

/**
 * Generate meta tags for specific page types
 */
export const generatePageMeta = (pageType: string, data?: Record<string, string>) => {
  const baseMeta = {
    title: 'Zimbabwe Shipping',
    description: 'Professional shipping services from UK to Zimbabwe',
    keywords: 'Zimbabwe shipping, courier, freight',
  };

  const pageMetaMap: Record<string, typeof baseMeta> = {
    home: {
      title: 'Zimbabwe Shipping | Professional UK to Zimbabwe Courier Services',
      description: 'Professional Zimbabwe shipping and freight services from the UK. Secure door-to-door delivery, competitive rates, reliable transit times.',
      keywords: 'Zimbabwe courier, UK Zimbabwe freight, professional shipping, Zimbabwe logistics',
    },
    pricing: {
      title: 'Shipping Rates & Pricing | Zimbabwe Shipping',
      description: 'Transparent pricing for UK to Zimbabwe shipping. Competitive rates for parcels, freight, and door-to-door delivery services.',
      keywords: 'Zimbabwe shipping rates, courier prices, freight costs, parcel delivery prices',
    },
    services: {
      title: 'Shipping Services | Zimbabwe Shipping',
      description: 'Comprehensive shipping services including parcel delivery, freight forwarding, and door-to-door courier services to Zimbabwe.',
      keywords: 'shipping services Zimbabwe, freight forwarding, parcel delivery, courier services',
    },
    track: {
      title: 'Track Your Shipment | Zimbabwe Shipping',
      description: 'Track your parcel or freight shipment to Zimbabwe in real-time. Enter your tracking number for live updates.',
      keywords: 'track shipment Zimbabwe, parcel tracking, freight tracking, delivery status',
    },
    contact: {
      title: 'Contact Us | Zimbabwe Shipping',
      description: 'Get in touch with Zimbabwe Shipping for quotes, support, and inquiries. Professional customer service team ready to help.',
      keywords: 'contact Zimbabwe shipping, customer support, get quote, shipping inquiry',
    },
  };

  return pageMetaMap[pageType] || baseMeta;
};

/**
 * Clean and optimize URL for SEO
 */
export const cleanUrl = (url: string): string => {
  return url
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Generate slug from title
 */
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Truncate description to SEO-friendly length
 */
export const truncateDescription = (text: string, maxLength: number = 160): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Generate Open Graph image URL
 */
export const getOGImageUrl = (title?: string, description?: string): string => {
  // This can be integrated with a service like Vercel OG Image or similar
  const baseUrl = window.location.origin;
  if (!title) return `${baseUrl}/og-default.png`;
  
  // For now, return default. Can be extended with dynamic OG image generation
  return `${baseUrl}/og-default.png`;
};

/**
 * Check if running on production
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

/**
 * Get canonical URL
 */
export const getCanonicalUrl = (): string => {
  const url = window.location.href;
  // Remove trailing slashes and query parameters for canonical
  return url.split('?')[0].replace(/\/$/, '');
};
