
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  MessageCircle,
  Instagram,
  Facebook,
  Globe,
  ChevronRight,
  BadgeCheck,
  Headphones,
  MapPin,
} from 'lucide-react';

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.08-.14 1.62.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.02-4.02 0-8.04.02-12.05z" />
  </svg>
);

const origins = {
  uk: {
    key: 'uk',
    flag: '🇬🇧',
    label: 'UK',
    number: '+44 7584 100552',
    wa: '447584100552',
  },
  ireland: {
    key: 'ireland',
    flag: '🇮🇪',
    label: 'Ireland',
    number: '+353 87 195 4910',
    wa: '353871954910',
  },
} as const;

type OriginKey = keyof typeof origins;

const customerCare = { wa: '447901217618' };

const socials = [
  {
    label: 'Instagram',
    sublabel: '@zimbabwe_shipping_services',
    href: 'https://www.instagram.com/zimbabwe_shipping_services?igsh=MXJ3Zjk5MnY1MXl6eA==',
    icon: Instagram,
    iconBg: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]',
  },
  {
    label: 'Facebook',
    sublabel: 'Follow our latest updates',
    href: 'https://www.facebook.com/share/1NRVYTAu3d/',
    icon: Facebook,
    iconBg: 'bg-[#1877F2]',
  },
  {
    label: 'TikTok',
    sublabel: '@zimbabweshipping',
    href: 'https://www.tiktok.com/@zimbabweshipping?_r=1&_t=ZS-98FLnagvujt',
    icon: TikTokIcon,
    iconBg: 'bg-black border border-white/15',
  },
  {
    label: 'Visit our website',
    sublabel: 'zimbabweshipping.com',
    href: 'https://zimbabweshipping.com/',
    icon: Globe,
    iconBg: 'bg-gradient-to-tr from-emerald-500 to-teal-600',
  },
];

/* ---------- Route map hero ---------- */
const RouteMap = () => {
  // grid lines
  const cols = [45, 90, 135, 180, 225, 270, 315];
  const rows = [38, 76, 114, 152];
  return (
    <div className="relative w-full aspect-[360/190] rounded-2xl overflow-hidden border border-white/10 bg-[#06201700] bg-[radial-gradient(120%_120%_at_20%_20%,#0b3b2b_0%,#04160f_70%)]">
      <svg
        viewBox="0 0 360 190"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="55%" stopColor="#ffd200" />
            <stop offset="100%" stopColor="#de2010" />
          </linearGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* soft landmasses */}
        <ellipse cx="72" cy="58" rx="40" ry="27" fill="#10b981" opacity="0.1" filter="url(#soft)" />
        <ellipse cx="286" cy="138" rx="46" ry="30" fill="#f59e0b" opacity="0.09" filter="url(#soft)" />

        {/* coordinate grid */}
        <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1">
          {cols.map((x) => (
            <line key={`c${x}`} x1={x} y1="0" x2={x} y2="190" />
          ))}
          {rows.map((y) => (
            <line key={`r${y}`} x1="0" y1={y} x2="360" y2={y} />
          ))}
        </g>

        {/* base route */}
        <path
          d="M72,58 C 150,10 240,58 286,138"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.12"
          strokeWidth="2"
        />
        {/* animated dashed route */}
        <path
          id="route"
          d="M72,58 C 150,10 240,58 286,138"
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="1 9"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="20"
            to="0"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>

        {/* origin pin */}
        <g>
          <circle cx="72" cy="58" r="4.5" fill="#34d399" />
          <circle cx="72" cy="58" r="4.5" fill="none" stroke="#34d399" strokeWidth="1.5">
            <animate attributeName="r" from="5" to="18" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.7" to="0" dur="2.2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* destination pin */}
        <g>
          <circle cx="286" cy="138" r="5" fill="#ffd200" />
          <circle cx="286" cy="138" r="5" fill="none" stroke="#de2010" strokeWidth="1.5">
            <animate attributeName="r" from="5" to="20" dur="2.2s" begin="0.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.7" to="0" dur="2.2s" begin="0.6s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* travelling plane */}
        <g>
          <circle r="8" fill="#25D366" opacity="0.2" />
          <path d="M-5,-3.4 L7,0 L-5,3.4 L-2,0 Z" fill="#ffffff" />
          <animateMotion dur="5s" repeatCount="indefinite" rotate="auto">
            <mpath href="#route" />
          </animateMotion>
        </g>
      </svg>

      {/* location labels */}
      <div className="absolute left-[4%] top-[9%] flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 px-2.5 py-1">
        <span className="text-sm leading-none">🇬🇧🇮🇪</span>
        <span className="text-[11px] font-semibold text-white">UK &amp; Ireland</span>
      </div>
      <div className="absolute right-[4%] bottom-[9%] flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 px-2.5 py-1">
        <span className="text-sm leading-none">🇿🇼</span>
        <span className="text-[11px] font-semibold text-white">Zimbabwe</span>
      </div>

      {/* caption */}
      <div className="absolute left-3 bottom-2.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/60">
        <MapPin className="w-3 h-3" />
        Your shipping route
      </div>
    </div>
  );
};

const Links = () => {
  const [origin, setOrigin] = useState<OriginKey>('uk');
  const active = origins[origin];

  return (
    <>
      <Helmet>
        <title>Zimbabwe Shipping | Connect With Us</title>
        <meta
          name="description"
          content="Connect with Zimbabwe Shipping on WhatsApp, Instagram, Facebook, TikTok and our website. Trusted shipping from the UK & Ireland to Zimbabwe."
        />
      </Helmet>

      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#04140e]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b3d2e] via-[#062a1e] to-black" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-400/[0.07] rounded-full blur-[110px]" />
          <div className="absolute top-1/3 -right-20 w-72 h-72 bg-red-600/[0.06] rounded-full blur-[90px]" />
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto px-5 py-14">
          <div className="relative backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-[28px] p-7 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-white/[0.06] border border-white/10 ring-1 ring-white/5">
                  <img
                    src="/lovable-uploads/f662f2d7-317f-42a5-afdc-43dfa2d4e82c.png"
                    alt="Zimbabwe Shipping"
                    className="w-14 h-14 object-contain drop-shadow-lg"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              <h1 className="text-[22px] font-bold text-white tracking-tight">
                Zimbabwe Shipping
              </h1>
              <BadgeCheck className="w-5 h-5 text-emerald-400" aria-label="Verified" />
            </div>

            <p className="mt-1.5 text-sm text-gray-300/90 text-center leading-relaxed px-2">
              Fast, secure and fully-tracked shipping from the{' '}
              <span className="text-white font-medium">UK &amp; Ireland</span> to
              Zimbabwe.
            </p>

            {/* Route map hero */}
            <div className="mt-5">
              <RouteMap />
            </div>

            {/* Interactive booking block */}
            <div className="mt-5 rounded-2xl bg-white/[0.04] border border-white/10 p-4">
              <p className="text-[13px] font-semibold text-white mb-3">
                Book or enquire — where are you shipping from?
              </p>

              {/* Segmented toggle */}
              <div className="relative flex p-1 rounded-xl bg-black/30 border border-white/10">
                <span
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-emerald-500 shadow-md transition-transform duration-300 ease-out"
                  style={{
                    transform: origin === 'uk' ? 'translateX(0)' : 'translateX(100%)',
                  }}
                />
                {(Object.keys(origins) as OriginKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setOrigin(k)}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      origin === k ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-base leading-none">{origins[k].flag}</span>
                    {origins[k].label}
                  </button>
                ))}
              </div>

              {/* Dynamic booking CTA → WhatsApp */}
              <a
                href={`https://wa.me/${active.wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-[15px] shadow-lg shadow-emerald-900/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                <span key={active.key} className="animate-in fade-in duration-300">
                  Book from {active.label} on WhatsApp
                </span>
              </a>
              <p className="mt-2 text-center text-[11px] text-gray-400">
                {active.flag} Opens WhatsApp chat · {active.number}
              </p>
            </div>

            {/* Customer care → WhatsApp */}
            <a
              href={`https://wa.me/${customerCare.wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-3 relative flex items-center gap-4 w-full pl-3 pr-4 py-3 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.09] hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md flex-shrink-0">
                <Headphones className="w-[22px] h-[22px]" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold text-white leading-tight">
                  Customer care
                </span>
                <span className="block text-xs text-gray-400 truncate">
                  Existing shipment? Chat to support on WhatsApp
                </span>
              </span>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </a>

            {/* Divider */}
            <div className="mt-6 mb-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/[0.08]" />
              <span className="text-[10px] uppercase tracking-widest text-gray-500">
                Follow us
              </span>
              <span className="h-px flex-1 bg-white/[0.08]" />
            </div>

            {/* Socials */}
            <div className="space-y-3">
              {socials.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center gap-4 w-full pl-3 pr-4 py-3 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.09] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 hover:shadow-lg hover:shadow-black/30"
                  >
                    <span
                      className={`flex items-center justify-center w-11 h-11 rounded-xl ${link.iconBg} text-white shadow-md flex-shrink-0`}
                    >
                      <Icon className="w-[22px] h-[22px]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-semibold text-white leading-tight">
                        {link.label}
                      </span>
                      <span className="block text-xs text-gray-400 truncate">
                        {link.sublabel}
                      </span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </a>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-5 border-t border-white/[0.06] text-center">
              <p className="text-xs text-gray-500">
                &copy; {new Date().getFullYear()} Zimbabwe Shipping. All rights
                reserved.
              </p>
              <p className="mt-1 text-[10px] text-gray-600">
                Powered by Voyage Technology and Solutions
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Links;
