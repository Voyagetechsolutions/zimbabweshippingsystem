
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, X, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const CustomQuoteFormNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
  const { toast } = useToast();
  const { user } = useAuth();

  // Form states
  const [category, setCategory] = useState<string>(state?.category || '');
  const [description, setDescription] = useState<string>(state?.description || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(state?.phoneNumber || '');
  const [email, setEmail] = useState<string>(state?.email || user?.email || '');
  const [name, setName] = useState<string>(state?.name || '');
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sender and recipient details from the state if available
  const [senderDetails] = useState(state?.senderDetails || {});
  const [recipientDetails] = useState(state?.recipientDetails || {});
  const [shipmentId] = useState(state?.shipmentId || null);

  useEffect(() => {
    // Set document title
    document.title = 'Request Custom Quote | UK to Zimbabwe Shipping';
    
    // If user is not authenticated, redirect to login
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit a custom quote request.",
        variant: "destructive"
      });
      
      // Save the current location to redirect back after login
      localStorage.setItem('redirectAfterAuth', window.location.pathname);
      navigate('/auth');
    }
  }, [user, navigate, toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Filter for image files only
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please select valid image files only.",
        variant: "destructive"
      });
      return;
    }
    
    setImages(imageFiles);
  };

  const uploadImages = async () => {
    if (images.length === 0) {
      toast({
        title: "No Images Selected",
        description: "Please select images to upload.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    const newImageUrls: string[] = [];
    
    try {
      for (const image of images) {
        const imageName = `${uuidv4()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        
        const { data, error } = await supabase
          .storage
          .from('custom-quote-images')
          .upload(imageName, image, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error("Error uploading image:", error);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${image.name}. Please try again.`,
            variant: "destructive",
          });
          continue;
        }
        
        const { data: publicUrlData } = supabase
          .storage
          .from('custom-quote-images')
          .getPublicUrl(data.path);
        
        newImageUrls.push(publicUrlData.publicUrl);
      }
      
      if (newImageUrls.length > 0) {
        toast({
          title: "Upload Complete",
          description: `${newImageUrls.length} images uploaded successfully.`,
        });
        
        setImageUrls(prev => [...prev, ...newImageUrls]);
        setImages([]);
      }
    } catch (err) {
      console.error("Error during upload:", err);
      toast({
        title: "Upload Error",
        description: `An unexpected error occurred during upload.`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setImageUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit a custom quote request.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    
    if (!category || !description || !phoneNumber) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Prepare the data for submission
      const quoteData = {
        user_id: user.id,
        shipment_id: shipmentId,
        phone_number: phoneNumber,
        description,
        category,
        image_urls: imageUrls,
        status: 'pending',
        sender_details: senderDetails.name ? senderDetails : {
          name,
          email,
          phone: phoneNumber,
        },
        recipient_details: recipientDetails.name ? recipientDetails : null
      };
      
      console.log("Submitting custom quote:", quoteData);
      
      // Submit to Supabase
      const { data, error } = await supabase
        .from('custom_quotes')
        .insert(quoteData)
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Custom Quote Requested',
          message: `Your custom quote request for ${category || 'item'} has been submitted.`,
          type: 'custom_quote',
          related_id: data.id,
          is_read: false
        });
      
      toast({
        title: "Request Submitted",
        description: "Your custom quote request has been submitted successfully. We'll contact you soon with a quote.",
        variant: "default",
      });
      
      // Navigate to the dashboard
      navigate('/dashboard', { state: { activeTab: 'quotes' } });
      
    } catch (error: any) {
      console.error("Error submitting quote:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit your custom quote request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Navigate back or to dashboard
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 px-4 bg-gray-50">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              className="flex items-center text-gray-600"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <h1 className="text-3xl font-bold mt-4 mb-2">Request Custom Quote</h1>
            <p className="text-gray-600">
              Tell us about the item you want to ship and we'll provide you with a customized quote.
            </p>
          </div>
          
          <Card className="shadow-md">
            <CardHeader>
              <h2 className="text-xl font-semibold">Custom Quote Request Form</h2>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Information Section */}
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="font-medium text-gray-800">Contact Information</h3>
                    
                    <div>
                      <Label htmlFor="name">Your Name</Label>
                      <Input 
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                      <Input 
                        id="phone"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Enter your phone number"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Item Details Section */}
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="font-medium text-gray-800">Item Details</h3>
                    
                    <div>
                      <Label htmlFor="category">Item Category <span className="text-red-500">*</span></Label>
                      <Select 
                        value={category} 
                        onValueChange={setCategory}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="clothing">Clothing</SelectItem>
                          <SelectItem value="documents">Documents</SelectItem>
                          <SelectItem value="furniture">Furniture</SelectItem>
                          <SelectItem value="fragile">Fragile Items</SelectItem>
                          <SelectItem value="food">Food Items</SelectItem>
                          <SelectItem value="personal">Personal Effects</SelectItem>
                          <SelectItem value="auto-parts">Auto Parts</SelectItem>
                          <SelectItem value="construction">Construction Materials</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Item Description <span className="text-red-500">*</span></Label>
                      <Textarea 
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your item(s) in detail including size, weight, quantity, etc."
                        className="min-h-[120px]"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Image Upload Section */}
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="font-medium text-gray-800">Images (Optional)</h3>
                    <p className="text-sm text-gray-600">
                      Upload images of your item to help us provide an accurate quote.
                    </p>
                    
                    <div className="flex flex-col space-y-4">
                      <div className="flex flex-wrap gap-4 items-center">
                        <div>
                          <input
                            type="file"
                            id="image-upload"
                            className="hidden"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                          <Label 
                            htmlFor="image-upload" 
                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Select Images
                          </Label>
                        </div>
                        
                        {images.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {images.length} file{images.length !== 1 ? 's' : ''} selected
                            </span>
                            <Button 
                              type="button" 
                              variant="secondary" 
                              onClick={uploadImages} 
                              disabled={uploading}
                              className="h-9"
                            >
                              {uploading ? 'Uploading...' : 'Upload'}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Display uploaded images */}
                      {imageUrls.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Uploaded Images:</h4>
                          <div className="flex flex-wrap gap-3">
                            {imageUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={url} 
                                  alt={`Item image ${index + 1}`} 
                                  className="w-24 h-24 object-cover rounded-md border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(url)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-90 hover:opacity-100"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-zim-green hover:bg-zim-green/90"
                  >
                    {submitting ? (
                      <>
                        <span className="animate-spin mr-2">⚪</span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Submit Quote Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CustomQuoteFormNew;
