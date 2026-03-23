import React, { useEffect, useState } from 'react';
import { Star, Users, Package, Clock } from 'lucide-react';

const SocialProofBanner: React.FC = () => {
  const [recentActivity, setRecentActivity] = useState<string>('');

  const activities = [
    'Sarah from Birmingham just booked 3 drums',
    'Tendai from London shipped to Harare',
    'Patrick from Dublin scheduled collection',
    'Grace from Manchester sent furniture',
    'John from Leeds booked 5 drums',
    'Mary from Cork shipped to Bulawayo',
  ];

  useEffect(() => {
    // Rotate through activities
    let index = 0;
    setRecentActivity(activities[index]);

    const interval = setInterval(() => {
      index = (index + 1) % activities.length;
      setRecentActivity(activities[index]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      icon: Package,
      value: '10,000+',
      label: 'Drums Shipped',
    },
    {
      icon: Users,
      value: '1,000+',
      label: 'Happy Customers',
    },
    {
      icon: Star,
      value: '4.9',
      label: 'Customer Rating',
    },
    {
      icon: Clock,
      value: '14+',
      label: 'Years Experience',
    },
  ];

  return (
    <div className="py-4 bg-gradient-to-r from-zim-green/5 via-zim-yellow/5 to-zim-red/5 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Stats */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center gap-2">
                <stat.icon className="h-5 w-5 text-zim-green" />
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </span>
                  <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Live Activity */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-700 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">{recentActivity}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialProofBanner;
