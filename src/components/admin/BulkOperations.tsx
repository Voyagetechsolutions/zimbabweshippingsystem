
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  Download,
  Search,
  RefreshCcw,
  Package,
  User,
  AlertTriangle,
  Check,
} from "lucide-react";
import { format } from 'date-fns';

interface Shipment {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  user_id: string;
  created_at: string;
  selected?: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  selected?: boolean;
}

const BulkOperations = () => {
  // Tabs state
  const [activeTab, setActiveTab] = useState('shipments');
  
  // Shipments state
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [shipmentsSearchQuery, setShipmentsSearchQuery] = useState('');
  const [shipmentsStatusFilter, setShipmentsStatusFilter] = useState<string>('all');
  const [selectedShipmentStatus, setSelectedShipmentStatus] = useState<string>('');
  const [allShipmentsSelected, setAllShipmentsSelected] = useState(false);
  const [hasSelectedShipments, setHasSelectedShipments] = useState(false);
  const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [allUsersSelected, setAllUsersSelected] = useState(false);
  const [hasSelectedUsers, setHasSelectedUsers] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  // Common state
  const [loading, setLoading] = useState(true);
  const [processingResult, setProcessingResult] = useState<{
    success: number;
    failed: number;
    message: string;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (activeTab === 'shipments') {
      fetchShipments();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Filter shipments when search or status filter changes
  useEffect(() => {
    filterShipments();
  }, [shipmentsSearchQuery, shipmentsStatusFilter, shipments]);

  // Filter users when search changes
  useEffect(() => {
    filterUsers();
  }, [usersSearchQuery, users]);

  // Update hasSelectedShipments when selections change
  useEffect(() => {
    setHasSelectedShipments(
      filteredShipments.some(shipment => shipment.selected)
    );
  }, [filteredShipments]);

  // Update hasSelectedUsers when selections change
  useEffect(() => {
    setHasSelectedUsers(
      filteredUsers.some(user => user.selected)
    );
  }, [filteredUsers]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const shipmentsWithSelection = data.map(shipment => ({
          ...shipment,
          selected: false
        }));
        setShipments(shipmentsWithSelection);
      }
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const usersWithSelection = data.map(user => ({
          ...user,
          selected: false
        }));
        setUsers(usersWithSelection);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterShipments = () => {
    let filtered = [...shipments];
    
    // Apply search filter
    if (shipmentsSearchQuery) {
      const searchLower = shipmentsSearchQuery.toLowerCase();
      filtered = filtered.filter(
        shipment =>
          shipment.tracking_number.toLowerCase().includes(searchLower) ||
          shipment.origin.toLowerCase().includes(searchLower) ||
          shipment.destination.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (shipmentsStatusFilter !== 'all') {
      filtered = filtered.filter(
        shipment => shipment.status.toLowerCase() === shipmentsStatusFilter.toLowerCase()
      );
    }
    
    setFilteredShipments(filtered);
    
    // Update "select all" checkbox state
    setAllShipmentsSelected(
      filtered.length > 0 && filtered.every(shipment => shipment.selected)
    );
  };

  const filterUsers = () => {
    let filtered = [...users];
    
    // Apply search filter
    if (usersSearchQuery) {
      const searchLower = usersSearchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          (user.full_name && user.full_name.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredUsers(filtered);
    
    // Update "select all" checkbox state
    setAllUsersSelected(
      filtered.length > 0 && filtered.every(user => user.selected)
    );
  };

  const toggleSelectAllShipments = () => {
    const newSelectedState = !allShipmentsSelected;
    
    // Update filtered shipments selection state
    const updatedFilteredShipments = filteredShipments.map(shipment => ({
      ...shipment,
      selected: newSelectedState
    }));
    
    // Update all shipments, maintaining selection state for filtered shipments
    const updatedShipments = shipments.map(shipment => {
      const filteredShipment = updatedFilteredShipments.find(fs => fs.id === shipment.id);
      return filteredShipment || shipment;
    });
    
    setShipments(updatedShipments);
    setFilteredShipments(updatedFilteredShipments);
    setAllShipmentsSelected(newSelectedState);
  };

  const toggleSelectAllUsers = () => {
    const newSelectedState = !allUsersSelected;
    
    // Update filtered users selection state
    const updatedFilteredUsers = filteredUsers.map(user => ({
      ...user,
      selected: newSelectedState
    }));
    
    // Update all users, maintaining selection state for filtered users
    const updatedUsers = users.map(user => {
      const filteredUser = updatedFilteredUsers.find(fu => fu.id === user.id);
      return filteredUser || user;
    });
    
    setUsers(updatedUsers);
    setFilteredUsers(updatedFilteredUsers);
    setAllUsersSelected(newSelectedState);
  };

  const toggleShipmentSelection = (id: string) => {
    // Update shipments array
    const updatedShipments = shipments.map(shipment => 
      shipment.id === id ? { ...shipment, selected: !shipment.selected } : shipment
    );
    
    setShipments(updatedShipments);
    
    // Update filtered shipments array
    const updatedFilteredShipments = filteredShipments.map(shipment => 
      shipment.id === id ? { ...shipment, selected: !shipment.selected } : shipment
    );
    
    setFilteredShipments(updatedFilteredShipments);
    
    // Update "select all" checkbox state
    setAllShipmentsSelected(
      updatedFilteredShipments.length > 0 && 
      updatedFilteredShipments.every(shipment => shipment.selected)
    );
  };

  const toggleUserSelection = (id: string) => {
    // Update users array
    const updatedUsers = users.map(user => 
      user.id === id ? { ...user, selected: !user.selected } : user
    );
    
    setUsers(updatedUsers);
    
    // Update filtered users array
    const updatedFilteredUsers = filteredUsers.map(user => 
      user.id === id ? { ...user, selected: !user.selected } : user
    );
    
    setFilteredUsers(updatedFilteredUsers);
    
    // Update "select all" checkbox state
    setAllUsersSelected(
      updatedFilteredUsers.length > 0 && 
      updatedFilteredUsers.every(user => user.selected)
    );
  };

  // Bulk update shipment statuses
  const bulkUpdateShipmentStatus = async () => {
    setIsProcessing(true);
    const selectedShipmentIds = shipments
      .filter(shipment => shipment.selected)
      .map(shipment => shipment.id);
    
    if (selectedShipmentIds.length === 0 || !selectedShipmentStatus) {
      setIsProcessing(false);
      return;
    }
    
    try {
      let successCount = 0;
      let failedCount = 0;
      
      // Update shipments one by one (Supabase doesn't support bulk updates with filters)
      for (const shipmentId of selectedShipmentIds) {
        const { error } = await supabase
          .from('shipments')
          .update({
            status: selectedShipmentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', shipmentId);
        
        if (error) {
          console.error(`Error updating shipment ${shipmentId}:`, error);
          failedCount++;
        } else {
          successCount++;
        }
      }
      
      // Update local state
      const updatedShipments = shipments.map(shipment => 
        shipment.selected ? { ...shipment, status: selectedShipmentStatus, selected: false } : shipment
      );
      
      setShipments(updatedShipments);
      
      // Set processing result
      setProcessingResult({
        success: successCount,
        failed: failedCount,
        message: `Successfully updated ${successCount} shipments to status "${selectedShipmentStatus}"${
          failedCount > 0 ? `. Failed to update ${failedCount} shipments.` : ''
        }`
      });
      
      setShowResult(true);
      setIsStatusUpdateDialogOpen(false);
      
      toast({
        title: 'Status Updated',
        description: `Updated ${successCount} shipments to "${selectedShipmentStatus}"`,
      });
      
      // Reset selected state
      setTimeout(() => {
        setShowResult(false);
        setProcessingResult(null);
      }, 5000);
    } catch (error: any) {
      console.error('Error in bulk update:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shipments',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    const statusLower = status.toLowerCase();
    
    switch (true) {
      case statusLower.includes('processing'):
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case statusLower.includes('transit'):
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case statusLower.includes('out for delivery'):
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case statusLower.includes('delivered'):
        return 'bg-green-100 text-green-800 border-green-300';
      case statusLower.includes('delayed'):
        return 'bg-red-100 text-red-800 border-red-300';
      case statusLower.includes('returned'):
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  // Export selected shipments as CSV
  const exportShipmentsCSV = () => {
    const selectedShipmentData = shipments
      .filter(shipment => shipment.selected);
    
    if (selectedShipmentData.length === 0) {
      toast({
        title: 'No shipments selected',
        description: 'Please select shipments to export',
        variant: 'destructive',
      });
      return;
    }
    
    // Create CSV content
    const headers = ['Tracking Number', 'Origin', 'Destination', 'Status', 'Created At'];
    const csvRows = [headers];
    
    selectedShipmentData.forEach(shipment => {
      csvRows.push([
        shipment.tracking_number,
        shipment.origin,
        shipment.destination,
        shipment.status,
        format(new Date(shipment.created_at), 'yyyy-MM-dd HH:mm:ss')
      ]);
    });
    
    const csvContent = csvRows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shipments_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Export Complete',
      description: `Exported ${selectedShipmentData.length} shipments to CSV`,
    });
  };

  // Export selected users as CSV
  const exportUsersCSV = () => {
    const selectedUserData = users
      .filter(user => user.selected);
    
    if (selectedUserData.length === 0) {
      toast({
        title: 'No users selected',
        description: 'Please select users to export',
        variant: 'destructive',
      });
      return;
    }
    
    // Create CSV content
    const headers = ['Email', 'Full Name', 'Admin', 'Created At'];
    const csvRows = [headers];
    
    selectedUserData.forEach(user => {
      csvRows.push([
        user.email,
        user.full_name || '',
        user.is_admin ? 'Yes' : 'No',
        format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss')
      ]);
    });
    
    const csvContent = csvRows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Export Complete',
      description: `Exported ${selectedUserData.length} users to CSV`,
    });
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Shipments</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Shipments Tab */}
        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Bulk Shipment Operations</CardTitle>
                  <CardDescription>Manage multiple shipments at once</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchShipments}
                    disabled={loading}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportShipmentsCSV}
                    disabled={!hasSelectedShipments}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                  <Input
                    placeholder="Search shipments..."
                    className="pl-10"
                    value={shipmentsSearchQuery}
                    onChange={(e) => setShipmentsSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <Select value={shipmentsStatusFilter} onValueChange={setShipmentsStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="in transit">In Transit</SelectItem>
                    <SelectItem value="out for delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="text-center p-12">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No shipments found</h3>
                  <p className="text-gray-500">
                    {shipmentsSearchQuery || shipmentsStatusFilter !== 'all'
                      ? "Try adjusting your filters"
                      : "There are no shipments in the system"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox 
                            checked={allShipmentsSelected}
                            onCheckedChange={toggleSelectAllShipments}
                          />
                        </TableHead>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell>
                            <Checkbox 
                              checked={shipment.selected}
                              onCheckedChange={() => toggleShipmentSelection(shipment.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{shipment.origin}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{shipment.destination}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(shipment.status)}>
                              {shipment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between py-4 border-t">
              <div className="text-sm text-gray-500">
                {hasSelectedShipments 
                  ? `${shipments.filter(s => s.selected).length} shipments selected`
                  : `0 shipments selected`
                }
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-zim-green hover:bg-zim-green/90"
                  disabled={!hasSelectedShipments}
                  onClick={() => setIsStatusUpdateDialogOpen(true)}
                >
                  Update Status
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Status Update Dialog */}
          <Dialog open={isStatusUpdateDialogOpen} onOpenChange={setIsStatusUpdateDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Update Shipment Status</DialogTitle>
                <DialogDescription>
                  Change the status for {shipments.filter(s => s.selected).length} selected shipments.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="mb-4">
                  <label className="text-sm font-medium mb-1 block">New Status</label>
                  <Select
                    value={selectedShipmentStatus}
                    onValueChange={setSelectedShipmentStatus}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Processing">Processing</SelectItem>
                      <SelectItem value="In Transit">In Transit</SelectItem>
                      <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="Delayed">Delayed</SelectItem>
                      <SelectItem value="Returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsStatusUpdateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-zim-green hover:bg-zim-green/90"
                  onClick={bulkUpdateShipmentStatus}
                  disabled={isProcessing || !selectedShipmentStatus}
                >
                  {isProcessing ? 'Processing...' : 'Update Status'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Bulk User Operations</CardTitle>
                  <CardDescription>Manage multiple users at once</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUsers}
                    disabled={loading}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportUsersCSV}
                    disabled={!hasSelectedUsers}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                  <Input
                    placeholder="Search users..."
                    className="pl-10"
                    value={usersSearchQuery}
                    onChange={(e) => setUsersSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center p-12">
                  <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No users found</h3>
                  <p className="text-gray-500">
                    {usersSearchQuery
                      ? "Try adjusting your search"
                      : "There are no users in the system"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox 
                            checked={allUsersSelected}
                            onCheckedChange={toggleSelectAllUsers}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox 
                              checked={user.selected}
                              onCheckedChange={() => toggleUserSelection(user.id)}
                            />
                          </TableCell>
                          <TableCell>{user.full_name || 'Unknown'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge className={user.is_admin 
                              ? "bg-red-100 text-red-800 border-red-300" 
                              : "bg-blue-100 text-blue-800 border-blue-300"
                            }>
                              {user.is_admin ? 'Admin' : 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between py-4 border-t">
              <div className="text-sm text-gray-500">
                {hasSelectedUsers
                  ? `${users.filter(u => u.selected).length} users selected`
                  : `0 users selected`
                }
              </div>
              <div className="flex gap-2">
                {/* Add user bulk operations here */}
                <Button
                  className="bg-zim-green hover:bg-zim-green/90"
                  disabled={!hasSelectedUsers}
                >
                  Send Email
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Processing Result Notification */}
      {showResult && processingResult && (
        <div className="fixed bottom-4 right-4 max-w-md bg-white shadow-lg rounded-md p-4 border">
          <div className="flex items-start gap-3">
            {processingResult.failed === 0 ? (
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-gray-900">{
                processingResult.failed === 0 ? 'Success!' : 'Partial Success'
              }</p>
              <p className="text-gray-600">{processingResult.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOperations;
