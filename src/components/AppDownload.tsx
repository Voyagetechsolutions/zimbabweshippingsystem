import React from 'react';
import { Apple, CalendarCheck, Download, MessageCircle, Navigation, Smartphone } from 'lucide-react';
import { ANDROID_APK_URL, PLAY_STORE_URL, APP_STORE_URL, ANDROID_APP_VERSION } from '@/config/appDownload';

const APP_FEATURES = [
  { icon: CalendarCheck, label: 'Book in minutes' },
  { icon: Navigation, label: 'Live tracking' },
  { icon: MessageCircle, label: 'Chat with Zimmy' },
] as const;

interface AppDownloadProps {
  /** "footer" is compact for the site footer; "section" is a full CTA block. */
  variant?: 'footer' | 'section';
  className?: string;
}

/**
 * Mobile app call-to-action. The verified App Store and Google Play listings
 * are the primary downloads. The direct Android APK remains a fallback for
 * customers whose device cannot access Google Play.
 */
const AppDownload: React.FC<AppDownloadProps> = ({ variant = 'footer', className = '' }) => {
  if (variant === 'section') {
    return (
      <section id="mobile-app" className={`scroll-mt-24 py-16 md:py-20 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="relative isolate overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            {/* Zimbabwe flag accent */}
            <div className="absolute inset-x-0 top-0 z-10 flex h-1">
              <div className="w-1/3 bg-zim-green" />
              <div className="w-1/3 bg-zim-yellow" />
              <div className="w-1/3 bg-zim-red" />
            </div>
            {/* Soft brand glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-zim-green/10 blur-3xl" />

            <div className="relative grid items-center gap-10 p-8 md:grid-cols-2 md:p-12">
              {/* Copy + actions */}
              <div className="text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zim-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zim-green">
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile App
                </span>
                <h2 className="mt-4 font-display text-3xl font-extrabold text-foreground md:text-4xl">
                  Take Zimbabwe Shipping with you
                </h2>
                <p className="mt-3 text-muted-foreground md:text-lg">
                  Book collections, track every step, and chat with Zimmy — right from your phone.
                </p>

                <ul className="mt-6 grid gap-2.5 sm:grid-cols-3">
                  {APP_FEATURES.map(({ icon: Icon, label }) => (
                    <li
                      key={label}
                      className="flex items-center justify-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm font-medium text-foreground md:justify-start"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-zim-green" />
                      {label}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center md:justify-start">
                  {PLAY_STORE_URL && (
                    <a
                      href={PLAY_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Get Zimbabwe Shipping on Google Play"
                      className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-black px-6 py-3 text-left text-white shadow-sm transition hover:bg-black/90"
                    >
                      <span className="text-2xl leading-none" aria-hidden="true">▶</span>
                      <span>
                        <span className="block text-[10px] uppercase leading-none tracking-wide text-gray-300">Get it on</span>
                        <span className="mt-1 block text-lg font-semibold leading-none">Google Play</span>
                      </span>
                    </a>
                  )}
                  {APP_STORE_URL && (
                    <a
                      href={APP_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Download Zimbabwe Shipping on the App Store"
                      className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-black px-6 py-3 text-left text-white shadow-sm transition hover:bg-black/90"
                    >
                      <Apple className="h-7 w-7" />
                      <span>
                        <span className="block text-[10px] leading-none tracking-wide text-gray-300">Download on the</span>
                        <span className="mt-1 block text-lg font-semibold leading-none">App Store</span>
                      </span>
                    </a>
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Free · Available for iPhone and Android · v{ANDROID_APP_VERSION}
                </p>
                <a
                  href={ANDROID_APK_URL}
                  download
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Android APK fallback
                </a>
              </div>

              {/* App icon visual */}
              <div className="flex justify-center md:justify-end">
                <div className="relative">
                  <div className="absolute inset-0 translate-y-5 scale-90 rounded-[2.25rem] bg-zim-green/25 blur-2xl" />
                  <div className="relative flex h-44 w-44 items-center justify-center rounded-[2.25rem] bg-white shadow-xl ring-1 ring-black/5 md:h-52 md:w-52">
                    <img
                      src="/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png"
                      alt="Zimbabwe Shipping mobile app icon"
                      className="h-28 w-28 object-contain md:h-32 md:w-32"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
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
      {PLAY_STORE_URL && (
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-gray-300 hover:text-white text-sm font-medium transition-colors"
        >
          Get it on Google Play →
        </a>
      )}
      {APP_STORE_URL && (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-gray-300 hover:text-white text-sm font-medium transition-colors"
        >
          Download on the App Store →
        </a>
      )}
      <a
        href={ANDROID_APK_URL}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        download
      >
        <Download className="h-3.5 w-3.5" />
        Android APK fallback
      </a>
    </div>
  );
};

export default AppDownload;
