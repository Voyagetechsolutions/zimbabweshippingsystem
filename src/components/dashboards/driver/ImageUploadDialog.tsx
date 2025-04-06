
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Camera, Upload } from 'lucide-react';

interface ImageUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imagePreview: string | null;
  isUploading: boolean;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageClear: () => void;
  onUpload: () => void;
}

const ImageUploadDialog: React.FC<ImageUploadDialogProps> = ({
  isOpen,
  onClose,
  imagePreview,
  isUploading,
  onImageChange,
  onImageClear,
  onUpload
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Delivery Photo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center">
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="max-h-60 rounded-md" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={onImageClear}
                >
                  &times;
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-md p-12 text-center">
                <Camera className="h-8 w-8 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Click to take or upload a photo</p>
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="delivery-photo" className="sr-only">Delivery Photo</Label>
            <Input
              id="delivery-photo"
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className={imagePreview ? "hidden" : ""}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onUpload}
            disabled={!imagePreview || isUploading}
            className="bg-zim-green hover:bg-zim-green/90"
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Mark Delivered
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadDialog;
