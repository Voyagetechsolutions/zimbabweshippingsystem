
import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, Truck, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  is_urgent: boolean;
  created_at: string;
}

const ShippingNewsTicker = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Since announcements table has been removed, we'll use only fallback news
    setNews(fallbackNews);
    setLoading(false);
    
    // Auto-rotate news items every 8 seconds
    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => 
        news.length > 0 ? (prevIndex + 1) % news.length : 0
      );
    }, 8000);
    
    return () => clearInterval(interval);
  }, [news.length]);

  const goToPrev = () => {
    setCurrentIndex(prevIndex => 
      prevIndex === 0 ? news.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex(prevIndex => 
      (prevIndex + 1) % news.length
    );
  };

  // Fallback static news items
  const fallbackNews: NewsItem[] = [
    {
      id: '1',
      title: 'New Route Added',
      content: 'We now offer direct shipping from Birmingham to Bulawayo twice weekly.',
      category: 'Service Update',
      is_urgent: false,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Holiday Schedule',
      content: 'Modified operating hours during the upcoming public holidays. Please check our schedule.',
      category: 'Announcement',
      is_urgent: false,
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      title: 'Weather Delay Alert',
      content: 'Shipments to Harare may experience 1-2 day delays due to heavy rainfall in the region.',
      category: 'Delay',
      is_urgent: true, 
      created_at: new Date().toISOString()
    }
  ];

  if (loading || news.length === 0) {
    return (
      <div className="flex items-center justify-center py-3 px-4 bg-gray-100 animate-pulse rounded-lg">
        <div className="h-5 w-full bg-gray-200 rounded"></div>
      </div>
    );
  }

  const currentNews = news[currentIndex];

  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg ${
      currentNews.is_urgent ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'
    }`}>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={goToPrev}
        className="h-8 w-8 rounded-full"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex-1 mx-2">
        <div className="flex items-center gap-2">
          {currentNews.is_urgent ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : (
            <Truck className="h-4 w-4 text-zim-green" />
          )}
          <span className={`text-sm font-medium ${
            currentNews.is_urgent ? 'text-red-700' : 'text-zim-green'
          }`}>
            {currentNews.title}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
            {currentNews.category}
          </span>
        </div>
        <p className="text-sm text-gray-600">{currentNews.content}</p>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={goToNext}
        className="h-8 w-8 rounded-full"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ShippingNewsTicker;
