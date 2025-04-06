
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ContentManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Media Library</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Media Library</CardTitle>
          <CardDescription>
            Upload and manage media assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] space-y-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Upload Media Files</p>
              <p className="text-muted-foreground mb-4">Add images to use across your site</p>
              <Button>Upload Media</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentManagement;
