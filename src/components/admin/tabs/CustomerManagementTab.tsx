
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
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

// Icons
import { 
  Search, 
  RefreshCw, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Package,
  MoreHorizontal,
  UserPlus,
  Send,
  ExternalLink
} from 'lucide-react';

const CustomerManagementTab = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Fetch profiles from Supabase
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch shipment counts for each customer
      const enhancedProfiles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count, error: countError } = await supabase
            .from('shipments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id);
          
          if (countError) {
            console.error('Error fetching shipment count:', countError);
            return { ...profile, shipmentCount: 0 };
          }
          
          return { ...profile, shipmentCount: count || 0 };
        })
      );
      
      setCustomers(enhancedProfiles);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (customer.full_name && customer.full_name.toLowerCase().includes(searchLower)) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower))
    );
  });

  const viewCustomerDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setShowDetailsDialog(true);
  };

  const emailCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setEmailSubject('');
    setEmailContent(`Dear ${customer.full_name || 'Valued Customer'},

`);
    setShowEmailDialog(true);
  };

  const sendEmail = async () => {
    if (!selectedCustomer || !selectedCustomer.email) {
      toast({
        title: 'Error',
        description: 'No email address available for this customer',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Use the brevo edge function to send the email
      await supabase.functions.invoke('send-brevo-email', {
        body: {
          to: selectedCustomer.email,
          name: selectedCustomer.full_name || 'Valued Customer',
          subject: emailSubject,
          content: emailContent,
          templateId: 1 // Use a default template ID
        }
      });
      
      toast({
        title: 'Success',
        description: `Email sent to ${selectedCustomer.email}`
      });
      
      setShowEmailDialog(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email',
        variant: 'destructive'
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-500 hover:bg-red-600';
      case 'customer':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'driver':
        return 'bg-green-500 hover:bg-green-600';
      case 'logistics':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'support':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Customer Management</h2>
          <p className="text-muted-foreground">
            Manage and communicate with your customers
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="w-full sm:w-[250px] pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchCustomers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Shipments</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.full_name || 'Not specified'}
                  </TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(customer.role)}>
                      {customer.role || 'Customer'}
                    </Badge>
                  </TableCell>
                  <TableCell>{customer.shipmentCount}</TableCell>
                  <TableCell>
                    {new Date(customer.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewCustomerDetails(customer)}
                      >
                        <User className="mr-1 h-4 w-4" />
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => emailCustomer(customer)}
                      >
                        <Mail className="mr-1 h-4 w-4" />
                        Email
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground mb-4">
              {searchQuery
                ? 'No customers found matching your search'
                : 'No customers available'}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View detailed information for this customer
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Full Name</p>
                    <p>{selectedCustomer.full_name || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p>{selectedCustomer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(selectedCustomer.role)}>
                    {selectedCustomer.role || 'Customer'}
                  </Badge>
                  {selectedCustomer.is_admin && (
                    <Badge variant="outline">Admin</Badge>
                  )}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Account Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p>{new Date(selectedCustomer.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shipments</p>
                    <p>{selectedCustomer.shipmentCount}</p>
                  </div>
                </div>
              </div>
              
              {selectedCustomer.communication_preferences && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Communication Preferences</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{selectedCustomer.communication_preferences.email ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">SMS</p>
                      <p>{selectedCustomer.communication_preferences.sms ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Push</p>
                      <p>{selectedCustomer.communication_preferences.push ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowDetailsDialog(false)}
            >
              Close
            </Button>
            <Button onClick={() => {
              setShowDetailsDialog(false);
              emailCustomer(selectedCustomer);
            }}>
              <Mail className="mr-2 h-4 w-4" />
              Email Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Email Customer</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.email
                ? `Send an email to ${selectedCustomer.email}`
                : 'Compose an email to this customer'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="Email subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea
                className="w-full h-48 p-2 border rounded-md resize-none"
                placeholder="Type your message here..."
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendEmail} disabled={!emailSubject || !emailContent}>
              <Send className="mr-2 h-4 w-4" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagementTab;
