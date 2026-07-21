import React from 'react';
import { Apple, Download, Smartphone } from 'lucide-react';
import { ANDROID_APK_URL, PLAY_STORE_URL, APP_STORE_URL, ANDROID_APP_VERSION } from '@/config/appDownload';

interface AppDownloadProps {
  /** "footer" is compact for the site footer; "section" is a full CTA block. */
  variant?: 'footer' | 'section';
  className?: string;
}

/**
 * Mobile app call-to-action. Android gets a direct APK download (sideload) plus
 * an optional Google Play link; iOS gets an App Store link (no sideloading on
 * iOS). Store buttons only appear once their URL is set.
 */
const AppDownload: React.FC<AppDownloadProps> = ({ variant = 'footer', className = '' }) => {
  if (variant === 'section') {
    return (
      <section className={`bg-zim-green/5 dark:bg-zim-green/10 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Smartphone className="h-6 w-6 text-zim-green" />
                <h2 className="text-2xl font-bold text-foreground">Get the Mobile App</h2>
              </div>
              <p className="text-muted-foreground max-w-md">
                Book collections, track shipments and chat with Zimmy — all from your phone.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={ANDROID_APK_URL}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-zim-green px-6 py-3 text-white font-medium shadow-sm hover:bg-zim-green-dark transition-colors"
                download
              >
                <Download className="h-5 w-5" />
                Download APK ({ANDROID_APP_VERSION})
              </a>
              {PLAY_STORE_URL && (
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-6 py-3 font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Get it on Google Play
                </a>
              )}
              {APP_STORE_URL && (
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-6 py-3 font-medium text-white hover:bg-black/90 transition-colors"
                >
                  <Apple className="h-5 w-5" />
                  Download on the App Store
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // footer variant
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">Get the App</h3>
      <p className="text-gray-400 text-sm mb-3">Track and book from your phone.</p>
      <a
        href={ANDROID_APK_URL}
        className="inline-flex items-center gap-2 rounded-md bg-zim-green px-4 py-2 text-white text-sm font-medium hover:bg-zim-green-dark transition-colors"
        download
      >
        <Download className="h-4 w-4" />
        Download for Android
      </a>
      {PLAY_STORE_URL && (
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Or get it on Google Play →
        </a>
      )}
      {APP_STORE_URL && (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Or download on the App Store →
        </a>
      )}
    </div>
  );
};

export default AppDownload;
