
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AddressCard, { Address } from '@/components/address/AddressCard';
import AddressForm from '@/components/address/AddressForm';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WhatsAppButton from '@/components/WhatsAppButton';

const AddressBook: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | undefined>(undefined);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch addresses on component mount
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setAddresses(data || []);
      } catch (error: any) {
        console.error('Error fetching addresses:', error.message);
        toast({
          title: 'Failed to load addresses',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [user, toast]);

  const handleAddAddress = () => {
    setSelectedAddress(undefined);
    setIsFormOpen(true);
  };

  const handleEditAddress = (address: Address) => {
    setSelectedAddress(address);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedAddress(undefined);
  };

  const handleSaveAddress = async (formData: Omit<Address, 'id'>, addressId?: string) => {
    if (!user) return;

    try {
      if (addressId) {
        // Update existing address
        const { error } = await supabase
          .from('addresses')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', addressId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new address
        const { error } = await supabase
          .from('addresses')
          .insert({
            ...formData,
            user_id: user.id,
          });

        if (error) throw error;
      }

      // Refresh the addresses list
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAddresses(data || []);
      setIsFormOpen(false);
    } catch (error: any) {
      console.error('Error saving address:', error.message);
      toast({
        title: 'Error saving address',
        description: error.message,
        variant: 'destructive',
      });
      throw error; // Re-throw for the form to handle
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setAddresses((currentAddresses) =>
        currentAddresses.filter((address) => address.id !== addressId)
      );

      toast({
        title: 'Address deleted',
        description: 'The address has been removed from your address book',
      });
    } catch (error: any) {
      console.error('Error deleting address:', error.message);
      toast({
        title: 'Error deleting address',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user) return;

    try {
      // Our database trigger will handle setting other addresses to non-default
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state to reflect the change
      setAddresses((currentAddresses) =>
        currentAddresses.map((address) => ({
          ...address,
          is_default: address.id === addressId,
        }))
      );
    } catch (error: any) {
      console.error('Error setting default address:', error.message);
      toast({
        title: 'Error setting default address',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">Address Book</CardTitle>
                <CardDescription>Manage your saved shipping addresses</CardDescription>
              </div>
              <Button onClick={handleAddAddress} className="bg-zim-green hover:bg-zim-green/90 flex items-center">
                <PlusCircle className="mr-1 h-5 w-5" />
                Add New Address
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-zim-green border-t-transparent rounded-full"></div>
              </div>
            ) : addresses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    onEdit={handleEditAddress}
                    onDelete={handleDeleteAddress}
                    onSetDefault={handleSetDefaultAddress}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <h3 className="text-lg font-medium text-gray-500">No addresses saved yet</h3>
                <p className="text-sm text-gray-400 mb-6">Add your first address to speed up your checkout process</p>
                <Button onClick={handleAddAddress} className="bg-zim-green hover:bg-zim-green/90">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Add New Address
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          <AddressForm
            address={selectedAddress}
            onSubmit={handleSaveAddress}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default AddressBook;
