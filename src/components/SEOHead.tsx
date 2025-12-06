import { Helmet } from 'react-helmet';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  structuredData?: object;
}

/**
 * SEO Head Component
 * Provides comprehensive meta tags for better search engine ranking
 */
const SEOHead = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage = 'https://zimbabweshipping.com/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png',
  ogType = 'website',
  noIndex = false,
  structuredData
}: SEOHeadProps) => {
  const siteName = 'Zimbabwe Shipping';
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const baseUrl = 'https://zimbabweshipping.com';

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Robots */}
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />
      <meta name="googlebot" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={`${baseUrl}${canonicalUrl}`} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl ? `${baseUrl}${canonicalUrl}` : baseUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_GB" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@zimbabwe_shipping" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;

// Pre-defined SEO configurations for common pages
export const SEO_CONFIGS = {
  home: {
    title: 'Zimbabwe Shipping | #1 UK to Zimbabwe Courier & Freight Services',
    description: 'Trusted UK to Zimbabwe shipping since 2014. Door-to-door delivery, real-time tracking, competitive rates from £45. Ship drums, boxes & cargo to Harare, Bulawayo & all cities.',
    keywords: 'UK to Zimbabwe shipping, Zimbabwe courier, send parcels Zimbabwe, Harare shipping, Bulawayo delivery, Zimbabwe freight, African shipping',
    canonicalUrl: '/'
  },
  services: {
    title: 'Our Services | UK to Zimbabwe Shipping Solutions',
    description: 'Comprehensive shipping services from UK to Zimbabwe. Drum shipping, box delivery, door-to-door collection, real-time tracking. Serving Harare, Bulawayo, Mutare & all cities.',
    keywords: 'Zimbabwe shipping services, drum shipping UK, box delivery Zimbabwe, door-to-door shipping, cargo services',
    canonicalUrl: '/services'
  },
  pricing: {
    title: 'Shipping Rates & Pricing | Affordable UK to Zimbabwe Delivery',
    description: 'Transparent pricing for UK to Zimbabwe shipping. Drums from £45, boxes from £25. No hidden fees. Get instant quotes and book online.',
    keywords: 'Zimbabwe shipping rates, UK Zimbabwe prices, drum shipping cost, affordable shipping Zimbabwe',
    canonicalUrl: '/pricing'
  },
  booking: {
    title: 'Book Your Shipment | UK to Zimbabwe Shipping',
    description: 'Book your UK to Zimbabwe shipment online in minutes. Easy booking, secure payment, real-time tracking. Collection from your doorstep.',
    keywords: 'book Zimbabwe shipping, online shipping booking, UK Zimbabwe courier booking',
    canonicalUrl: '/booking'
  },
  track: {
    title: 'Track Your Shipment | Zimbabwe Shipping Tracking',
    description: 'Track your UK to Zimbabwe shipment in real-time. Enter your tracking number to see current location and estimated delivery date.',
    keywords: 'track Zimbabwe shipment, shipping tracking, parcel tracking Zimbabwe',
    canonicalUrl: '/track'
  },
  contact: {
    title: 'Contact Us | Zimbabwe Shipping Support',
    description: 'Get in touch with Zimbabwe Shipping. Customer support available Mon-Sat. Phone, email, WhatsApp support for all shipping enquiries.',
    keywords: 'Zimbabwe shipping contact, customer support, shipping enquiries',
    canonicalUrl: '/contact'
  },
  about: {
    title: 'About Us | Zimbabwe Shipping Company',
    description: 'Learn about Zimbabwe Shipping - trusted UK to Zimbabwe courier since 2015. Our story, mission, and commitment to reliable African shipping.',
    keywords: 'about Zimbabwe shipping, company history, UK Zimbabwe courier',
    canonicalUrl: '/about'
  },
  faq: {
    title: 'FAQs | Zimbabwe Shipping Questions Answered',
    description: 'Frequently asked questions about UK to Zimbabwe shipping. Delivery times, pricing, tracking, prohibited items, and more.',
    keywords: 'Zimbabwe shipping FAQ, shipping questions, delivery times Zimbabwe',
    canonicalUrl: '/faq'
  },
  gallery: {
    title: 'Gallery | Zimbabwe Shipping Photos',
    description: 'See our shipping operations in action. Photos of drums, boxes, and cargo being shipped from UK to Zimbabwe.',
    keywords: 'Zimbabwe shipping photos, cargo gallery, shipping images',
    canonicalUrl: '/gallery'
  }
};

// Structured data templates
export const STRUCTURED_DATA = {
  faqPage: (faqs: { question: string; answer: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  }),
  
  breadcrumb: (items: { name: string; url: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': `https://zimbabweshipping.co.uk${item.url}`
    }))
  }),
  
  product: (name: string, description: string, price: string) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': name,
    'description': description,
    'offers': {
      '@type': 'Offer',
      'price': price,
      'priceCurrency': 'GBP',
      'availability': 'https://schema.org/InStock'
    }
  })
};
