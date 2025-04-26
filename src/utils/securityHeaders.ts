
/**
 * Security headers to be applied to the application
 * These headers help protect against various attacks
 */

// Content Security Policy configuration
export const getContentSecurityPolicy = () => {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://storage.googleapis.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://api.ipify.org https://*.supabase.co https://oncsaunsqtekwwbzvvyh.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://api.ipify.org https://*.supabase.co https://oncsaunsqtekwwbzvvyh.supabase.co",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
  };
};

// Additional security headers
export const getSecurityHeaders = () => {
  return {
    ...getContentSecurityPolicy(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
  };
};

// Function to add security headers to Vite config
export const configureSecurityHeaders = () => {
  if (typeof document !== 'undefined') {
    // We're in the browser, let's apply CSP via meta tag as a fallback
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = getContentSecurityPolicy()['Content-Security-Policy'];
    document.head.appendChild(meta);
  }
};

// Cache control headers for different content types
export const getCacheControlHeaders = (contentType: 'static' | 'dynamic' | 'api') => {
  switch (contentType) {
    case 'static':
      return {
        'Cache-Control': 'public, max-age=31536000, immutable'
      };
    case 'dynamic':
      return {
        'Cache-Control': 'public, max-age=600, must-revalidate'
      };
    case 'api':
      return {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      };
    default:
      return {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      };
  }
};

// Function to apply security headers on API responses
export const applySecurityHeaders = (headers: Headers) => {
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
};
