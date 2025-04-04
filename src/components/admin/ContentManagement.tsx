
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Image as ImageIcon,
  Save,
  Trash2,
  Plus,
  Eye,
  Loader2,
  PanelLeftOpen,
  ImagePlus,
} from "lucide-react";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('pages');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Page content state
  const [pageContent, setPageContent] = useState({
    title: 'Welcome to Zimbabwe Shipping',
    slug: 'welcome',
    content: `# Welcome to Zimbabwe Shipping

We provide fast, reliable, and affordable shipping services from the UK to Zimbabwe.

## Our Services

* Express Shipping
* Standard Shipping
* Document Shipping
* Large Package Shipping

Contact us today to learn more about our services!`,
    isPublished: true,
  });
  
  // FAQ state
  const [faqs, setFaqs] = useState([
    {
      id: 1,
      question: 'How long does shipping take?',
      answer: 'Standard shipping typically takes 7-14 business days. Express shipping takes 3-5 business days.',
      category: 'shipping',
      isActive: true,
    },
    {
      id: 2,
      question: 'What are your shipping rates?',
      answer: 'Our rates start from £20 for small packages. Rates vary based on weight, dimensions, and shipping method.',
      category: 'pricing',
      isActive: true,
    },
    {
      id: 3,
      question: 'Do you offer insurance?',
      answer: 'Yes, we offer insurance for all shipments at an additional cost of 5% of the declared value.',
      category: 'services',
      isActive: true,
    },
  ]);
  
  const [currentFaq, setCurrentFaq] = useState({
    id: 0,
    question: '',
    answer: '',
    category: 'general',
    isActive: true,
  });
  
  // Media state
  const [images, setImages] = useState([
    {
      id: 1,
      name: 'hero-banner.jpg',
      url: 'https://via.placeholder.com/800x400',
      size: '245 KB',
      uploadedAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'shipping-container.jpg',
      url: 'https://via.placeholder.com/600x400',
      size: '182 KB',
      uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 3,
      name: 'logo.png',
      url: 'https://via.placeholder.com/200x200',
      size: '45 KB',
      uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
  ]);
  
  const handlePageSave = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: 'Page saved',
        description: `"${pageContent.title}" has been saved successfully`,
      });
      setLoading(false);
    }, 1000);
  };
  
  const handleFaqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      if (currentFaq.id === 0) {
        // Create new FAQ
        const newFaq = {
          ...currentFaq,
          id: faqs.length + 1,
        };
        setFaqs([...faqs, newFaq]);
        toast({
          title: 'FAQ created',
          description: 'New FAQ has been added successfully',
        });
      } else {
        // Update existing FAQ
        setFaqs(faqs.map(faq => 
          faq.id === currentFaq.id ? currentFaq : faq
        ));
        toast({
          title: 'FAQ updated',
          description: 'FAQ has been updated successfully',
        });
      }
      
      setCurrentFaq({
        id: 0,
        question: '',
        answer: '',
        category: 'general',
        isActive: true,
      });
      
      setLoading(false);
    }, 1000);
  };
  
  const handleFaqDelete = (id: number) => {
    setFaqs(faqs.filter(faq => faq.id !== id));
    
    toast({
      title: 'FAQ deleted',
      description: 'FAQ has been removed',
    });
  };
  
  const handleFaqEdit = (faq: any) => {
    setCurrentFaq(faq);
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="faqs" className="flex items-center gap-2">
            <PanelLeftOpen className="h-4 w-4" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Media
          </TabsTrigger>
        </TabsList>
        
        {/* Pages Content */}
        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Editor</CardTitle>
              <CardDescription>
                Create and edit pages for your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="page-title">Page Title</Label>
                    <Input
                      id="page-title"
                      value={pageContent.title}
                      onChange={(e) => setPageContent({...pageContent, title: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="page-slug">URL Slug</Label>
                    <Input
                      id="page-slug"
                      value={pageContent.slug}
                      onChange={(e) => setPageContent({...pageContent, slug: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="page-content">Content (Markdown)</Label>
                  <Textarea
                    id="page-content"
                    value={pageContent.content}
                    onChange={(e) => setPageContent({...pageContent, content: e.target.value})}
                    className="min-h-[300px] font-mono mt-1"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="published"
                    checked={pageContent.isPublished}
                    onCheckedChange={(checked) => 
                      setPageContent({...pageContent, isPublished: !!checked})
                    }
                  />
                  <Label htmlFor="published">Published</Label>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button 
                    onClick={handlePageSave}
                    disabled={loading}
                    className="bg-zim-green hover:bg-zim-green/90"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Page
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* FAQs Content */}
        <TabsContent value="faqs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>FAQ Management</CardTitle>
              <CardDescription>
                Create and edit frequently asked questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* FAQ List */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Existing FAQs</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setCurrentFaq({
                          id: 0,
                          question: '',
                          answer: '',
                          category: 'general',
                          isActive: true,
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> New FAQ
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-medium">{faq.question}</h4>
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {faq.answer}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge category={faq.category} />
                              {!faq.isActive && (
                                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                  Draft
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleFaqEdit(faq)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleFaqDelete(faq.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {faqs.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No FAQs yet. Create your first one!</p>
                        <Button 
                          className="mt-4 bg-zim-green hover:bg-zim-green/90"
                          onClick={() => {
                            setCurrentFaq({
                              id: 0,
                              question: '',
                              answer: '',
                              category: 'general',
                              isActive: true,
                            });
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add FAQ
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* FAQ Edit Form */}
                <div className="md:col-span-1">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {currentFaq.id === 0 ? 'Add New FAQ' : 'Edit FAQ'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleFaqSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="faq-question">Question</Label>
                          <Input
                            id="faq-question"
                            placeholder="Enter FAQ question"
                            value={currentFaq.question}
                            onChange={(e) => setCurrentFaq({...currentFaq, question: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="faq-answer">Answer</Label>
                          <Textarea
                            id="faq-answer"
                            placeholder="Enter FAQ answer"
                            value={currentFaq.answer}
                            onChange={(e) => setCurrentFaq({...currentFaq, answer: e.target.value})}
                            className="mt-1 min-h-[120px]"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="faq-category">Category</Label>
                          <Select
                            value={currentFaq.category}
                            onValueChange={(value) => setCurrentFaq({...currentFaq, category: value})}
                          >
                            <SelectTrigger id="faq-category" className="mt-1">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="shipping">Shipping</SelectItem>
                              <SelectItem value="pricing">Pricing</SelectItem>
                              <SelectItem value="services">Services</SelectItem>
                              <SelectItem value="returns">Returns & Refunds</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id="faq-active"
                            checked={currentFaq.isActive}
                            onCheckedChange={(checked) => 
                              setCurrentFaq({...currentFaq, isActive: !!checked})
                            }
                          />
                          <Label htmlFor="faq-active">Active</Label>
                        </div>
                        
                        <div className="pt-3">
                          <Button 
                            type="submit" 
                            className="w-full bg-zim-green hover:bg-zim-green/90"
                            disabled={!currentFaq.question || !currentFaq.answer || loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                {currentFaq.id === 0 ? 'Create FAQ' : 'Update FAQ'}
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Media Content */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Media Library</CardTitle>
              <CardDescription>
                Manage images and media files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Button className="bg-zim-green hover:bg-zim-green/90">
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Upload New Image
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="border rounded-md overflow-hidden">
                    <div className="aspect-square bg-gray-100 relative">
                      <img 
                        src={image.url} 
                        alt={image.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">{image.name}</p>
                      <p className="text-xs text-gray-500">{image.size}</p>
                      
                      <div className="flex justify-between mt-2">
                        <Button variant="ghost" size="sm" className="px-2 h-8">
                          Copy URL
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-700 px-2 h-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper component for FAQ categories
const Badge = ({ category }: { category: string }) => {
  const styles: Record<string, string> = {
    general: "bg-gray-100 text-gray-800",
    shipping: "bg-blue-100 text-blue-800",
    pricing: "bg-green-100 text-green-800",
    services: "bg-purple-100 text-purple-800",
    returns: "bg-orange-100 text-orange-800",
  };
  
  return (
    <span className={`${styles[category] || styles.general} text-xs px-2 py-1 rounded`}>
      {category}
    </span>
  );
};

export default ContentManagement;
