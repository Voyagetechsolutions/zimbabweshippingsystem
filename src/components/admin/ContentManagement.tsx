
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  Search,
  RefreshCcw,
  Edit,
  Trash2,
  Globe,
  Eye,
  ImageIcon,
  FileCode,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from 'date-fns';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  content_type: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

const contentFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  content_type: z.string(),
  published: z.boolean().default(false),
});

const ContentManagement = () => {
  // This is a mock implementation since we don't have the actual content table in the database
  // In a real implementation, this would use the existing content table
  
  const [contentItems, setContentItems] = useState<ContentItem[]>([
    {
      id: "1",
      title: "About Us",
      content: "We are a leading shipping and logistics company dedicated to providing exceptional service...",
      content_type: "page",
      published: true,
      created_at: new Date("2023-01-15").toISOString(),
      updated_at: new Date("2023-06-20").toISOString()
    },
    {
      id: "2",
      title: "Privacy Policy",
      content: "This Privacy Policy describes how your personal information is collected, used, and shared...",
      content_type: "page",
      published: true,
      created_at: new Date("2023-01-20").toISOString(),
      updated_at: new Date("2023-01-20").toISOString()
    },
    {
      id: "3",
      title: "Shipping News: Rate Changes",
      content: "Important announcement about upcoming changes to our shipping rates effective next month...",
      content_type: "post",
      published: true,
      created_at: new Date("2023-08-05").toISOString(),
      updated_at: new Date("2023-08-10").toISOString()
    },
    {
      id: "4",
      title: "Holiday Schedule",
      content: "Please note our adjusted operating hours during the upcoming holiday season...",
      content_type: "announcement",
      published: true,
      created_at: new Date("2023-11-01").toISOString(),
      updated_at: new Date("2023-11-01").toISOString()
    },
    {
      id: "5",
      title: "New Service Areas",
      content: "We're excited to announce the expansion of our service to the following regions...",
      content_type: "post",
      published: false,
      created_at: new Date("2023-12-01").toISOString(),
      updated_at: new Date("2023-12-01").toISOString()
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [isCreatingContent, setIsCreatingContent] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof contentFormSchema>>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: '',
      content: '',
      content_type: 'page',
      published: false,
    },
  });
  
  useEffect(() => {
    if (editingContent) {
      form.reset({
        title: editingContent.title,
        content: editingContent.content,
        content_type: editingContent.content_type,
        published: editingContent.published,
      });
    } else if (isCreatingContent) {
      form.reset({
        title: '',
        content: '',
        content_type: 'page',
        published: false,
      });
    }
  }, [editingContent, isCreatingContent, form]);
  
  const openCreateContentDialog = () => {
    setIsCreatingContent(true);
    setEditingContent(null);
    setIsDialogOpen(true);
  };
  
  const openEditContentDialog = (content: ContentItem) => {
    setEditingContent(content);
    setIsCreatingContent(false);
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingContent(null);
    setIsCreatingContent(false);
    form.reset();
  };
  
  const handleCreateContent = (values: z.infer<typeof contentFormSchema>) => {
    // In a real implementation, this would be an API call to create content
    const newItem: ContentItem = {
      id: Math.random().toString(36).substring(2, 9),
      title: values.title,
      content: values.content,
      content_type: values.content_type,
      published: values.published,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setContentItems([...contentItems, newItem]);
    
    toast({
      title: 'Content Created',
      description: 'The content has been created successfully',
    });
    
    closeDialog();
  };
  
  const handleUpdateContent = (values: z.infer<typeof contentFormSchema>) => {
    if (!editingContent) return;
    
    // In a real implementation, this would be an API call to update content
    const updatedItems = contentItems.map(item =>
      item.id === editingContent.id
        ? {
            ...item,
            title: values.title,
            content: values.content,
            content_type: values.content_type,
            published: values.published,
            updated_at: new Date().toISOString(),
          }
        : item
    );
    
    setContentItems(updatedItems);
    
    toast({
      title: 'Content Updated',
      description: 'The content has been updated successfully',
    });
    
    closeDialog();
  };
  
  const handleDeleteContent = (id: string) => {
    // In a real implementation, this would be an API call to delete content
    setContentItems(contentItems.filter(item => item.id !== id));
    
    toast({
      title: 'Content Deleted',
      description: 'The content has been deleted successfully',
    });
  };
  
  const onSubmit = (values: z.infer<typeof contentFormSchema>) => {
    if (isCreatingContent) {
      handleCreateContent(values);
    } else if (editingContent) {
      handleUpdateContent(values);
    }
  };
  
  // Filter content items based on search
  const filteredContentItems = contentItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content_type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get content type badge
  const getContentTypeBadge = (type: string) => {
    switch (type) {
      case 'page':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <Globe className="mr-1 h-3 w-3" />
            Page
          </Badge>
        );
      case 'post':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <FileText className="mr-1 h-3 w-3" />
            Post
          </Badge>
        );
      case 'announcement':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300">
            <FileText className="mr-1 h-3 w-3" />
            Announcement
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <FileText className="mr-1 h-3 w-3" />
            {type}
          </Badge>
        );
    }
  };
  
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Content Management</CardTitle>
              <CardDescription>Manage website content and pages</CardDescription>
            </div>
            <Button
              onClick={openCreateContentDialog}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Content
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4 gap-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search content..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredContentItems.length === 0 ? (
            <div className="text-center p-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No content found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? "Try adjusting your search"
                  : "There is no content in the system yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContentItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{getContentTypeBadge(item.content_type)}</TableCell>
                      <TableCell>
                        <Badge className={item.published 
                          ? "bg-green-100 text-green-800 border-green-300" 
                          : "bg-amber-100 text-amber-800 border-amber-300"
                        }>
                          {item.published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.updated_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditContentDialog(item)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteContent(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              toast({
                                title: 'Content Preview',
                                description: 'Preview functionality would open in a new tab',
                              });
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Preview</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create/Edit Content Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreatingContent ? 'Create New Content' : 'Edit Content'}
            </DialogTitle>
            <DialogDescription>
              {isCreatingContent
                ? 'Add a new piece of content to your website.'
                : `Update ${editingContent?.title}`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter content title" />
                    </FormControl>
                    <FormDescription>
                      This is the title that will be displayed on the page.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <div className="grid grid-cols-3 gap-4">
                      <div 
                        className={`border rounded-md p-4 cursor-pointer ${
                          field.value === 'page' ? 'border-2 border-zim-green' : ''
                        }`}
                        onClick={() => form.setValue('content_type', 'page')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-5 w-5 text-zim-green" />
                          <span className="font-medium">Page</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Static pages like About Us, Contact, etc.
                        </p>
                      </div>
                      
                      <div 
                        className={`border rounded-md p-4 cursor-pointer ${
                          field.value === 'post' ? 'border-2 border-zim-green' : ''
                        }`}
                        onClick={() => form.setValue('content_type', 'post')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-zim-green" />
                          <span className="font-medium">Post</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Blog posts or news articles.
                        </p>
                      </div>
                      
                      <div 
                        className={`border rounded-md p-4 cursor-pointer ${
                          field.value === 'announcement' ? 'border-2 border-zim-green' : ''
                        }`}
                        onClick={() => form.setValue('content_type', 'announcement')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-zim-green" />
                          <span className="font-medium">Announcement</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Important announcements for customers.
                        </p>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter content body" 
                        className="min-h-[200px]"
                      />
                    </FormControl>
                    <FormDescription>
                      The main content of the page or post.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Publish Content
                      </FormLabel>
                      <FormDescription>
                        When enabled, this content will be visible to all users.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-5 w-5"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button className="bg-zim-green hover:bg-zim-green/90" type="submit">
                  {isCreatingContent ? 'Create Content' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManagement;
