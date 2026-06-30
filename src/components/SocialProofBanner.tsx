import React from 'react';
import { Star, Users, Package, ShieldCheck } from 'lucide-react';

/**
 * Honest trust strip. We deliberately avoid the fake "someone just booked"
 * tickers used by low-quality funnel sites — these numbers are real and
 * stand on their own.
 */
const SocialProofBanner: React.FC = () => {
  const stats = [
    { icon: Package, value: '10,000+', label: 'Drums shipped' },
    { icon: Users, value: '1,000+', label: 'Families served' },
    { icon: Star, value: '4.9 / 5', label: 'Customer rating' },
    { icon: ShieldCheck, value: '100%', label: 'Insured & tracked' },
  ];

  return (
    <div className="border-b border-gray-100 bg-paper dark:border-gray-800 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-800 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-1 px-3 py-6 text-center md:flex-row md:gap-3 md:text-left"
            >
              <stat.icon className="h-6 w-6 flex-shrink-0 text-zim-green" />
              <div>
                <div className="font-display text-xl font-bold text-ink dark:text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialProofBanner;
