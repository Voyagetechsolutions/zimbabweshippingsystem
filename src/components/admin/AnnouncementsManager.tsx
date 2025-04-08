
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
  XCircle, Edit2, Filter, RefreshCw, Archive, Copy,
  Clock, BellRing, Globe, Users, AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Announcement } from '@/types/admin';
import { callRpcFunction } from '@/utils/supabaseUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MultiSelect } from '@/components/ui/multi-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast as sonnerToast } from 'sonner';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'important', label: 'Important' },
  { value: 'service_update', label: 'Service Update' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'news', label: 'News' },
];

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
];

const LOCATIONS = [
  { value: 'uk', label: 'United Kingdom' },
  { value: 'zimbabwe', label: 'Zimbabwe' },
  { value: 'global', label: 'Global' },
];

const ROLES = [
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'Admin' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'driver', label: 'Driver' },
  { value: 'support', label: 'Support' },
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
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    content: '',
    category: 'general',
    is_active: true,
    expiry_date: null as Date | null,
    status: 'published' as 'draft' | 'published' | 'scheduled',
    publish_at: null as Date | null,
    target_roles: [] as string[],
    target_locations: [] as string[],
    is_critical: false,
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
      
      // Use the callRpcFunction utility to make the RPC call
      const { data, error } = await callRpcFunction<Announcement[]>('get_announcements');
      
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
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleMultiSelectChange = (name: string, values: string[]) => {
    setFormData(prev => ({ ...prev, [name]: values }));
  };
  
  const handleDateChange = (name: string, date: Date | undefined) => {
    setFormData(prev => ({ ...prev, [name]: date || null }));
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
      status: 'published',
      publish_at: null,
      target_roles: [],
      target_locations: [],
      is_critical: false,
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
      status: announcement.status as 'draft' | 'published' | 'scheduled',
      publish_at: announcement.publish_at ? new Date(announcement.publish_at) : null,
      target_roles: announcement.target_roles || [],
      target_locations: announcement.target_locations || [],
      is_critical: announcement.is_critical,
    });
    setIsDialogOpen(true);
  };
  
  const handleSave = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Check if scheduling a post but no publish date is set
      if (formData.status === 'scheduled' && !formData.publish_at) {
        toast({
          title: 'Error',
          description: 'Please set a publication date for scheduled announcements.',
          variant: 'destructive',
        });
        return;
      }

      // If targeting is enabled but no targets selected
      if ((formData.target_roles.length > 0 || formData.target_locations.length > 0) && 
          !formData.target_roles.length && !formData.target_locations.length) {
        toast({
          title: 'Warning',
          description: 'You\'ve enabled targeting but didn\'t select any targets. Are you sure?',
        });
      }
      
      if (isEditMode) {
        const { data, error } = await callRpcFunction('update_announcement', {
          p_id: formData.id,
          p_title: formData.title,
          p_content: formData.content,
          p_category: formData.category,
          p_is_active: formData.is_active,
          p_expiry_date: formData.expiry_date ? formData.expiry_date.toISOString() : null,
          p_status: formData.status,
          p_publish_at: formData.publish_at ? formData.publish_at.toISOString() : null,
          p_target_roles: formData.target_roles.length ? formData.target_roles : null,
          p_target_locations: formData.target_locations.length ? formData.target_locations : null,
          p_is_critical: formData.is_critical
        });
        
        if (error) throw error;
        
        if (isMounted.current) {
          toast({
            title: 'Success',
            description: 'Announcement updated successfully.',
          });

          // If critical and published, create notifications
          if (formData.is_critical && formData.is_active && formData.status === 'published') {
            await callRpcFunction('create_announcement_notification', { p_announcement_id: formData.id });
            sonnerToast.success('Notifications sent to users about this critical announcement');
          }
        }
      } else {
        const { data, error } = await callRpcFunction('create_announcement', {
          p_title: formData.title,
          p_content: formData.content,
          p_category: formData.category,
          p_is_active: formData.is_active,
          p_created_by: user.id,
          p_expiry_date: formData.expiry_date ? formData.expiry_date.toISOString() : null,
          p_status: formData.status,
          p_publish_at: formData.publish_at ? formData.publish_at.toISOString() : null,
          p_target_roles: formData.target_roles.length ? formData.target_roles : null,
          p_target_locations: formData.target_locations.length ? formData.target_locations : null,
          p_is_critical: formData.is_critical
        });
        
        if (error) throw error;
        
        if (isMounted.current) {
          toast({
            title: 'Success',
            description: 'Announcement created successfully.',
          });

          // If critical and published, create notifications
          if (formData.is_critical && formData.is_active && formData.status === 'published') {
            await callRpcFunction('create_announcement_notification', { p_announcement_id: data.id });
            sonnerToast.success('Notifications sent to users about this critical announcement');
          }
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
      
      const { data, error } = await callRpcFunction('delete_announcement', {
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

  const handleArchive = async (id: string) => {
    try {
      setArchivingId(id);
      
      const { data, error } = await callRpcFunction('archive_announcement', {
        p_id: id
      });
      
      if (error) throw error;
      
      if (isMounted.current) {
        toast({
          title: 'Success',
          description: 'Announcement archived successfully.',
        });
        
        fetchAnnouncements();
      }
    } catch (error: any) {
      console.error('Error archiving announcement:', error);
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: 'Failed to archive announcement. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setArchivingId(null);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setDuplicatingId(id);
      
      const { data, error } = await callRpcFunction('duplicate_announcement', {
        p_id: id
      });
      
      if (error) throw error;
      
      if (isMounted.current) {
        toast({
          title: 'Success',
          description: 'Announcement duplicated successfully.',
        });
        
        fetchAnnouncements();
      }
    } catch (error: any) {
      console.error('Error duplicating announcement:', error);
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: 'Failed to duplicate announcement. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setDuplicatingId(null);
      }
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'archive' | 'publish' | 'draft') => {
    if (selectedAnnouncements.length === 0) {
      toast({
        title: 'Error',
        description: 'No announcements selected for bulk action.',
        variant: 'destructive',
      });
      return;
    }

    try {
      let params: any = {
        p_ids: selectedAnnouncements
      };

      switch (action) {
        case 'activate':
          params.p_is_active = true;
          break;
        case 'deactivate':
          params.p_is_active = false;
          break;
        case 'archive':
          params.p_archived = true;
          break;
        case 'publish':
          params.p_status = 'published';
          break;
        case 'draft':
          params.p_status = 'draft';
          break;
      }

      const { data, error } = await callRpcFunction('batch_update_announcements', params);
      
      if (error) throw error;
      
      if (isMounted.current) {
        toast({
          title: 'Success',
          description: `Bulk action completed successfully on ${selectedAnnouncements.length} announcements.`,
        });
        
        fetchAnnouncements();
        setSelectedAnnouncements([]);
        setBulkActionOpen(false);
      }
    } catch (error: any) {
      console.error('Error performing bulk action:', error);
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: 'Failed to perform bulk action. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSelectAllToggle = (checked: boolean) => {
    if (checked) {
      const ids = filteredAnnouncements.map(a => a.id);
      setSelectedAnnouncements(ids);
    } else {
      setSelectedAnnouncements([]);
    }
  };

  const handleSelectAnnouncement = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAnnouncements(prev => [...prev, id]);
    } else {
      setSelectedAnnouncements(prev => prev.filter(item => item !== id));
    }
  };
  
  const filteredAnnouncements = announcements.filter(a => {
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchesArchived = showArchived ? true : !a.archived;
    
    return matchesCategory && matchesStatus && matchesArchived;
  });

  // Function to get status badge class
  const getStatusBadge = (status: string, is_active: boolean, archived: boolean, is_critical: boolean) => {
    if (archived) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 flex items-center gap-1">
        <Archive className="h-3 w-3" />
        Archived
      </Badge>;
    }
    
    if (!is_active) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Inactive
      </Badge>;
    }

    if (is_critical) {
      return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Critical
      </Badge>;
    }
    
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 flex items-center gap-1">
          <Edit2 className="h-3 w-3" />
          Draft
        </Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Scheduled
        </Badge>;
      case 'published':
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Published
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTargetingBadges = (announcement: Announcement) => {
    const badges = [];
    
    if (announcement.target_roles && announcement.target_roles.length > 0) {
      badges.push(
        <Badge key="roles" variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
          <Users className="h-3 w-3" />
          {announcement.target_roles.length} role(s)
        </Badge>
      );
    }
    
    if (announcement.target_locations && announcement.target_locations.length > 0) {
      badges.push(
        <Badge key="locations" variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
          <Globe className="h-3 w-3" />
          {announcement.target_locations.length} location(s)
        </Badge>
      );
    }
    
    return badges;
  };
  
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
            <div className="flex flex-wrap gap-2">
              <Select 
                value={filterCategory} 
                onValueChange={setFilterCategory}
              >
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Category" />
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

              <Select 
                value={filterStatus} 
                onValueChange={setFilterStatus}
              >
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={checked => setShowArchived(!!checked)}
                />
                <Label htmlFor="show-archived">Show Archived</Label>
              </div>

              <Button 
                onClick={fetchAnnouncements} 
                variant="outline" 
                size="icon"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              {selectedAnnouncements.length > 0 && (
                <DropdownMenu open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Bulk Actions ({selectedAnnouncements.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                      <Check className="h-4 w-4 mr-2" />
                      Activate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('publish')}>
                      <Megaphone className="h-4 w-4 mr-2" />
                      Publish
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('draft')}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Mark as Draft
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

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
                {filterCategory !== 'all' || filterStatus !== 'all' || showArchived 
                  ? `There are no announcements matching your current filters` 
                  : "You haven't created any announcements yet"}
              </p>
              <Button onClick={handleAddNew} variant="default">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Your First Announcement
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center pb-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectedAnnouncements.length === filteredAnnouncements.length && filteredAnnouncements.length > 0}
                  onCheckedChange={handleSelectAllToggle}
                />
                <Label htmlFor="select-all" className="ml-2">Select All</Label>
                <span className="text-sm text-gray-500 ml-auto">
                  {filteredAnnouncements.length} announcements
                </span>
              </div>

              {filteredAnnouncements.map(announcement => (
                <div 
                  key={announcement.id} 
                  className={cn(
                    "border rounded-lg p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between",
                    announcement.archived ? "bg-gray-50" : "",
                    selectedAnnouncements.includes(announcement.id) ? "border-zim-green bg-zim-green/5" : ""
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id={`select-${announcement.id}`}
                      checked={selectedAnnouncements.includes(announcement.id)}
                      onCheckedChange={checked => handleSelectAnnouncement(announcement.id, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-medium">{announcement.title}</h3>
                        {getStatusBadge(announcement.status, announcement.is_active, announcement.archived, announcement.is_critical)}
                        <Badge>{CATEGORIES.find(c => c.value === announcement.category)?.label || announcement.category}</Badge>
                        {getTargetingBadges(announcement)}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">{announcement.content}</p>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                        <span>Created: {format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
                        {announcement.expiry_date && (
                          <span>Expires: {format(new Date(announcement.expiry_date), 'MMM d, yyyy')}</span>
                        )}
                        {announcement.publish_at && announcement.status === 'scheduled' && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Publishes: {format(new Date(announcement.publish_at), 'MMM d, yyyy')}
                          </span>
                        )}
                        {announcement.author_name && (
                          <span>By: {announcement.author_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end md:self-center whitespace-nowrap">
                    {!announcement.archived && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(announcement)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDuplicate(announcement.id)}
                          disabled={duplicatingId === announcement.id}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {duplicatingId === announcement.id ? 'Duplicating...' : 'Duplicate'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleArchive(announcement.id)}
                          disabled={archivingId === announcement.id}
                        >
                          <Archive className="h-3.5 w-3.5 mr-1" />
                          {archivingId === announcement.id ? 'Archiving...' : 'Archive'}
                        </Button>
                      </>
                    )}
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
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Announcement' : 'Create New Announcement'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update the announcement details below.' 
                : 'Fill in the details to create a new announcement for your customers.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-6">
              {/* Basic Info Section */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Basic Information</h3>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title*
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Enter announcement title"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange('category', value)}
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
                    Content*
                  </Label>
                  <Textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    className="col-span-3 min-h-[100px]"
                    placeholder="Enter announcement content"
                    required
                  />
                </div>
              </div>

              {/* Publishing Options Section */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Publishing Options</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange('status', value as 'draft' | 'published' | 'scheduled')}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.status === 'scheduled' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="publish_at" className="text-right">
                      Publish Date*
                    </Label>
                    <div className="col-span-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.publish_at && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.publish_at ? format(formData.publish_at, "PPP") : "Select publish date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.publish_at || undefined}
                            onSelect={(date) => handleDateChange('publish_at', date)}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

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
                          onSelect={(date) => handleDateChange('expiry_date', date)}
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
                      onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                    />
                    <Label htmlFor="is_active">
                      {formData.is_active ? 'Visible to customers' : 'Hidden from customers'}
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="is_critical" className="text-right">
                    Critical
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="is_critical"
                      checked={formData.is_critical}
                      onCheckedChange={(checked) => handleSwitchChange('is_critical', checked)}
                    />
                    <Label htmlFor="is_critical">
                      {formData.is_critical ? 'Mark as critical (will send notifications)' : 'Regular announcement'}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Targeting Section */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Targeting Options</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="target_roles" className="text-right">
                    Target Roles
                  </Label>
                  <div className="col-span-3">
                    <MultiSelect
                      options={ROLES.map(role => ({ label: role.label, value: role.value }))}
                      selected={formData.target_roles}
                      onChange={(values) => handleMultiSelectChange('target_roles', values)}
                      placeholder="All roles (no targeting)"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="target_locations" className="text-right">
                    Target Locations
                  </Label>
                  <div className="col-span-3">
                    <MultiSelect
                      options={LOCATIONS.map(loc => ({ label: loc.label, value: loc.value }))}
                      selected={formData.target_locations}
                      onChange={(values) => handleMultiSelectChange('target_locations', values)}
                      placeholder="All locations (no targeting)"
                      className="w-full"
                    />
                  </div>
                </div>

                {(formData.target_roles.length > 0 || formData.target_locations.length > 0) && (
                  <Alert className="col-span-4 mt-2 bg-blue-50 text-blue-800">
                    <AlertDescription className="text-sm">
                      This announcement will only be visible to users who match all targeting criteria.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!formData.title || !formData.content}>
              {isEditMode ? 'Update' : 'Create'} Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsManager;
