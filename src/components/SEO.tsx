import { Helmet } from 'react-helmet';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  ogType?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  canonicalUrl?: string;
  noindex?: boolean;
}

/**
 * SEO Component
 * Manages meta tags, Open Graph, and Twitter Card data
 */
export const SEO = ({
  title = 'Zimbabwe Shipping | Professional UK to Zimbabwe Courier & Freight Services',
  description = 'Professional Zimbabwe shipping and freight services from the UK. Established courier company offering secure door-to-door delivery, competitive rates, and reliable transit times to all Zimbabwe cities.',
  keywords = 'Zimbabwe courier, UK Zimbabwe freight, professional shipping services, Zimbabwe logistics, international courier, UK to Zimbabwe delivery, parcel shipping Zimbabwe, freight forwarding Zimbabwe',
  author = 'Zimbabwe Shipping',
  ogType = 'website',
  ogImage = '/og-image.png',
  ogUrl,
  twitterCard = 'summary_large_image',
  canonicalUrl,
  noindex = false,
}: SEOProps) => {
  const currentUrl = ogUrl || window.location.href;
  const canonical = canonicalUrl || window.location.href;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Zimbabwe Shipping" />
      
      {/* Twitter */}
      <meta property="twitter:card" content={twitterCard} />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />
      
      {/* Additional SEO */}
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />
      
      {/* Geo Tags */}
      <meta name="geo.region" content="GB" />
      <meta name="geo.placename" content="United Kingdom" />
      
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Zimbabwe Shipping",
          "description": description,
          "url": currentUrl,
          "logo": "/logo.png",
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "Customer Service",
            "areaServed": ["GB", "ZW"],
            "availableLanguage": ["English"]
          },
          "sameAs": [
            // Add social media links here
          ]
        })}
      </script>
    </Helmet>
  );
};

/**
 * Generate breadcrumb structured data
 */
export const BreadcrumbSchema = ({ items }: { items: Array<{ name: string; url: string }> }) => {
  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbList)}
      </script>
    </Helmet>
  );
};
