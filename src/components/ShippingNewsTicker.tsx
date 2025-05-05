
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

export function ShippingNewsTicker() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  // Load announcements (now just using mock data since table is removed)
  useEffect(() => {
    const mockAnnouncements: Announcement[] = [
      {
        id: '1',
        title: 'Shipping Update',
        content: 'We now offer express shipping to all major cities in Zimbabwe',
        category: 'info',
        created_at: new Date().toISOString()
      }
    ];
    
    setAnnouncements(mockAnnouncements);
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === announcements.length - 1 ? 0 : prevIndex + 1
      );
    }, 8000);
    
    return () => clearInterval(timer);
  }, [announcements]);

  if (dismissed || announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentIndex];
  
  const handleClick = () => {
    if (currentAnnouncement.category === 'alert') {
      navigate('/support');
    } else {
      navigate('/announcements');
    }
  };

  return (
    <div 
      className={cn(
        "w-full py-2 px-4 text-sm font-medium flex items-center justify-between gap-2",
        currentAnnouncement.category === 'alert' ? "bg-amber-100 text-amber-900" : "bg-blue-50 text-blue-900"
      )}
    >
      <div className="flex items-center gap-2 flex-1 overflow-hidden">
        {currentAnnouncement.category === 'alert' ? (
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        ) : (
          <Info className="h-4 w-4 flex-shrink-0" />
        )}
        <p 
          className="truncate cursor-pointer hover:underline" 
          onClick={handleClick}
        >
          <span className="font-semibold">{currentAnnouncement.title}:</span> {currentAnnouncement.content}
        </p>
      </div>
      <button 
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-white/20 rounded-full"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
