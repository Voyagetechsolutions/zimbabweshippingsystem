
import React, { useState } from 'react';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  author_name?: string;
}

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Shipping Update',
    content: 'We now offer express shipping to all major cities in Zimbabwe',
    category: 'info',
    created_at: new Date().toISOString(),
    author_name: 'System'
  }
];

export function Announcements() {
  const [announcements] = useState<Announcement[]>(mockAnnouncements);

  if (announcements.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No announcements available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card key={announcement.id} className={
          announcement.category === 'alert' 
            ? 'border-amber-300 bg-amber-50'
            : 'border-blue-200 bg-blue-50'
        }>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {announcement.category === 'alert' ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <Info className="h-5 w-5 text-blue-600" />
              )}
              {announcement.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                {announcement.author_name && ` • Posted by ${announcement.author_name}`}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-line">
              {announcement.content}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
