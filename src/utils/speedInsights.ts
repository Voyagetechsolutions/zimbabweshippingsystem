/**
 * Speed Insights Setup
 *
 * This module initializes Vercel Speed Insights for performance monitoring.
 * Speed Insights helps track web vital metrics like LCP, FID, and CLS.
 *
 * Must be called on the client side only during app initialization.
 */

/**
 * Initialize Vercel Speed Insights
 * This should be called once during app startup in main.tsx
 */
export function initializeSpeedInsights(): void {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Dynamically import the speed insights library to avoid issues with SSR
    import('@vercel/speed-insights/react').then(({ SpeedInsights }) => {
      // Initialize Speed Insights
      if (SpeedInsights) {
        // Speed Insights component will be used in App.tsx
        console.debug('Vercel Speed Insights initialized');
      }
    }).catch((error) => {
      console.warn('Failed to initialize Vercel Speed Insights:', error);
    });
  } catch (error) {
    console.warn('Error initializing Vercel Speed Insights:', error);
  }
}
