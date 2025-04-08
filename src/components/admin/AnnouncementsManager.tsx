
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Announcement, castTo } from '@/types/admin';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone,
  PlusCircle,
  Edit,
  Trash2,
  Calendar,
  RefreshCcw,
  Search,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { tableFrom } from '@/integrations/supabase/db-types';

const CATEGORIES = [
  'Route Update',
  'Schedule Change',
  'Promotion',
  'Service Update',
  'Pickup Location',
  'Holiday Notice',
  'General'
];

const AnnouncementsManager = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isActive, setIsActive] = useState(true);
  const [expiryDate, setExpiryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableFrom('announcements'))
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Transform data to include author_name
        const formattedData = data.map((item: any) => ({
          ...item,
          author_name: item.profiles?.full_name || 'Unknown'
        }));
        
        setAnnouncements(castTo<Announcement[]>(formattedData));
      }
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setTitle(announcement.title);
      setContent(announcement.content);
      setCategory(announcement.category);
      setIsActive(announcement.is_active);
      setExpiryDate(announcement.expiry_date ? format(new Date(announcement.expiry_date), 'yyyy-MM-dd') : '');
    } else {
      setEditingAnnouncement(null);
      setTitle('');
      setContent('');
      setCategory(CATEGORIES[0]);
      setIsActive(true);
      setExpiryDate('');
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const formattedData = {
        title,
        content,
        category,
        is_active: isActive,
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      };

      let result;
      
      if (editingAnnouncement) {
        // Update existing announcement
        const { data, error } = await supabase
          .from(tableFrom('announcements'))
          .update(formattedData)
          .eq('id', editingAnnouncement.id)
          .select('*, profiles(full_name)')
          .single();
          
        if (error) throw error;
        result = data;
        
        // Update local state
        setAnnouncements(prev => 
          prev.map(item => 
            item.id === editingAnnouncement.id 
              ? { ...data, author_name: data.profiles?.full_name || 'Unknown' } 
              : item
          )
        );
        
        toast({
          title: 'Announcement updated',
          description: 'The announcement has been updated successfully',
        });
      } else {
        // Create new announcement
        const { data, error } = await supabase
          .from(tableFrom('announcements'))
          .insert({
            ...formattedData,
            created_by: user.id,
          })
          .select('*, profiles(full_name)')
          .single();
          
        if (error) throw error;
        result = data;
        
        // Update local state
        setAnnouncements(prev => [
          { ...data, author_name: data.profiles?.full_name || 'Unknown' },
          ...prev
        ]);
        
        toast({
          title: 'Announcement created',
          description: 'The announcement has been created successfully',
        });
      }

      // Close dialog and reset form
      setDialogOpen(false);
      
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      const { error } = await supabase
        .from(tableFrom('announcements'))
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Remove from local state
      setAnnouncements(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: 'Announcement deleted',
        description: 'The announcement has been deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleActiveStatus = async (announcement: Announcement) => {
    try {
      const newStatus = !announcement.is_active;
      
      const { error } = await supabase
        .from(tableFrom('announcements'))
        .update({ is_active: newStatus })
        .eq('id', announcement.id);
        
      if (error) throw error;
      
      // Update local state
      setAnnouncements(prev => 
        prev.map(item => 
          item.id === announcement.id 
            ? { ...item, is_active: newStatus } 
            : item
        )
      );
      
      toast({
        title: newStatus ? 'Announcement activated' : 'Announcement deactivated',
        description: `The announcement has been ${newStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      console.error('Error toggling announcement status:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter announcements based on search query
  const filteredAnnouncements = announcements.filter(announcement => 
    announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Announcements</CardTitle>
              <CardDescription>Manage public announcements and updates</CardDescription>
            </div>
            <Button 
              onClick={() => handleOpenDialog()}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search announcements..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Button 
              variant="outline" 
              onClick={fetchAnnouncements}
              className="h-10 px-4"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center p-12">
              <Megaphone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No announcements found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Start by creating your first announcement"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Posted By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnnouncements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell className="font-medium">{announcement.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-100">
                          {announcement.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {announcement.is_active ? (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{announcement.author_name}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {announcement.expiry_date 
                          ? format(new Date(announcement.expiry_date), 'MMM d, yyyy')
                          : "No expiry"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActiveStatus(announcement)}
                            title={announcement.is_active ? "Deactivate" : "Activate"}
                          >
                            {announcement.is_active ? (
                              <XCircle className="h-4 w-4 text-gray-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(announcement)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(announcement.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement 
                ? 'Update the details of this announcement' 
                : 'Create a new announcement to share updates'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter announcement title"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter announcement content"
                rows={5}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <Select
                  value={isActive ? "active" : "inactive"}
                  onValueChange={(val) => setIsActive(val === "active")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="expiryDate" className="text-sm font-medium">
                  Expiry Date (Optional)
                </label>
                <div className="flex">
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {editingAnnouncement ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsManager;
