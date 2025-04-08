import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle, CardFooter 
} from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogFooter, DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  CalendarIcon, Check, Megaphone, PlusCircle, Trash2, 
  XCircle, Edit2, Filter, RefreshCw 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Announcement } from '@/types/admin';
import { Json } from '@/integrations/supabase/types';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'important', label: 'Important' },
  { value: 'service_update', label: 'Service Update' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'news', label: 'News' },
];

const AnnouncementsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMounted = useRef(true);
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    content: '',
    category: 'general',
    is_active: true,
    expiry_date: null as Date | null,
  });
  
  useEffect(() => {
    fetchAnnouncements();
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_announcements');
      
      if (error) throw error;
      
      if (data && isMounted.current) {
        setAnnouncements(data as unknown as Announcement[]);
      }
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: 'Failed to load announcements. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_active: checked }));
  };
  
  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
  };
  
  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, expiry_date: date || null }));
  };
  
  const handleAddNew = () => {
    setIsEditMode(false);
    setFormData({
      id: '',
      title: '',
      content: '',
      category: 'general',
      is_active: true,
      expiry_date: null,
    });
    setIsDialogOpen(true);
  };
  
  const handleEdit = (announcement: Announcement) => {
    setIsEditMode(true);
    setFormData({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      is_active: announcement.is_active,
      expiry_date: announcement.expiry_date ? new Date(announcement.expiry_date) : null,
    });
    setIsDialogOpen(true);
  };
  
  const handleSave = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      if (isEditMode) {
        const { data, error } = await supabase.rpc('update_announcement', {
          p_id: formData.id,
          p_title: formData.title,
          p_content: formData.content,
          p_category: formData.category,
          p_is_active: formData.is_active,
          p_expiry_date: formData.expiry_date ? formData.expiry_date.toISOString() : null
        });
        
        if (error) throw error;
        
        if (isMounted.current) {
          toast({
            title: 'Success',
            description: 'Announcement updated successfully.',
          });
        }
      } else {
        const { data, error } = await supabase.rpc('create_announcement', {
          p_title: formData.title,
          p_content: formData.content,
          p_category: formData.category,
          p_is_active: formData.is_active,
          p_created_by: user.id,
          p_expiry_date: formData.expiry_date ? formData.expiry_date.toISOString() : null
        });
        
        if (error) throw error;
        
        if (isMounted.current) {
          toast({
            title: 'Success',
            description: 'Announcement created successfully.',
          });
        }
      }
      
      fetchAnnouncements();
      if (isMounted.current) {
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to save announcement. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      
      const { data, error } = await supabase.rpc('delete_announcement', {
        p_id: id
      });
      
      if (error) throw error;
      
      if (isMounted.current) {
        toast({
          title: 'Success',
          description: 'Announcement deleted successfully.',
        });
        
        setAnnouncements(prev => prev.filter(item => item.id !== id));
      }
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: 'Failed to delete announcement. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setDeletingId(null);
      }
    }
  };
  
  const filteredAnnouncements = filterCategory === 'all' 
    ? announcements 
    : announcements.filter(a => a.category === filterCategory);
  
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Announcements Manager</CardTitle>
              <CardDescription>
                Create and manage announcements for your customers
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select 
                value={filterCategory} 
                onValueChange={setFilterCategory}
              >
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Filter by category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={fetchAnnouncements} 
                variant="outline" 
                size="icon"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium mb-1">No announcements found</h3>
              <p className="text-gray-500 mb-4">
                {filterCategory !== 'all' 
                  ? `There are no ${filterCategory} announcements yet` 
                  : "You haven't created any announcements yet"}
              </p>
              <Button onClick={handleAddNew} variant="default">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Your First Announcement
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAnnouncements.map(announcement => (
                <div 
                  key={announcement.id} 
                  className="border rounded-lg p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{announcement.title}</h3>
                      {announcement.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      <Badge>{CATEGORIES.find(c => c.value === announcement.category)?.label || announcement.category}</Badge>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-2">{announcement.content}</p>
                    <div className="text-xs text-gray-500 flex gap-3">
                      <span>Created: {format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
                      {announcement.expiry_date && (
                        <span>Expires: {format(new Date(announcement.expiry_date), 'MMM d, yyyy')}</span>
                      )}
                      {announcement.author_name && (
                        <span>By: {announcement.author_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end md:self-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(announcement.id)}
                      disabled={deletingId === announcement.id}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {deletingId === announcement.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Announcement' : 'Create New Announcement'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update the announcement details below.' 
                : 'Fill in the details to create a new announcement for your customers.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Enter announcement title"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right mt-2">
                Content
              </Label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                className="col-span-3 min-h-[100px]"
                placeholder="Enter announcement content"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expiry_date" className="text-right">
                Expiry Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.expiry_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expiry_date ? format(formData.expiry_date, "PPP") : "No expiry date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.expiry_date || undefined}
                      onSelect={handleDateChange}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_active" className="text-right">
                Active
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="is_active">
                  {formData.is_active ? 'Visible to customers' : 'Hidden from customers'}
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              {isEditMode ? 'Update' : 'Create'} Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsManager;
