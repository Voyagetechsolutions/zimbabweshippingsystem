
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// Icons
import { Search, RefreshCcw, User, Mail, MessageSquare } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  is_admin: boolean;
  avatar_url?: string;
}

const CustomerManagementTab = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [searchQuery, profiles]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched profiles:', data);
      setProfiles(data || []);
      setFilteredProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer profiles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    if (!searchQuery) {
      setFilteredProfiles(profiles);
      return;
    }

    const filtered = profiles.filter(
      (profile) =>
        profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredProfiles(filtered);
  };

  const handleSendEmail = async (customer: Profile) => {
    setSelectedCustomerId(customer.id);
    setEmailSubject('');
    setEmailContent('');
  };

  const sendEmail = async () => {
    if (!selectedCustomerId || !emailSubject || !emailContent) {
      toast({
        title: 'Error',
        description: 'Please fill in all email fields',
        variant: 'destructive',
      });
      return;
    }

    setSendingEmail(true);
    try {
      const customer = profiles.find(p => p.id === selectedCustomerId);
      if (!customer) throw new Error('Customer not found');

      const { error } = await supabase.functions.invoke('send-brevo-email', {
        body: {
          to: [{ email: customer.email, name: customer.full_name }],
          subject: emailSubject,
          htmlContent: emailContent
        }
      });

      if (error) throw error;

      toast({
        title: 'Email Sent',
        description: `Email sent successfully to ${customer.email}`,
      });

      // Reset form
      setSelectedCustomerId(null);
      setEmailSubject('');
      setEmailContent('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
          <CardDescription>View and manage customer accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={fetchProfiles} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No customers found</h3>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              {profile.avatar_url ? (
                                <img 
                                  src={profile.avatar_url} 
                                  alt={profile.full_name} 
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                            <span>{profile.full_name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>
                          {profile.is_admin ? (
                            <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
                          ) : (
                            <Badge variant="outline">{profile.role || 'Customer'}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {profile.created_at 
                            ? format(new Date(profile.created_at), 'MMM d, yyyy') 
                            : 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleSendEmail(profile)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground mt-2">
            Showing {filteredProfiles.length} of {profiles.length} customers
          </div>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      {selectedCustomerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h3 className="font-bold text-lg mb-4">Send Email</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Subject</label>
                <Input 
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Content</label>
                <textarea
                  className="w-full p-2 border rounded-md min-h-[150px]"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Email content (HTML supported)"
                ></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setSelectedCustomerId(null)}
                disabled={sendingEmail}
              >
                Cancel
              </Button>
              <Button 
                onClick={sendEmail}
                disabled={sendingEmail || !emailSubject || !emailContent}
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagementTab;
