
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Address, AddressFormData } from '@/types/address';

const addressSchema = z.object({
  address_name: z.string().min(1, 'Required'),
  recipient_name: z.string().min(1, 'Required'),
  street_address: z.string().min(3, 'Please enter a valid address'),
  city: z.string().min(1, 'Required'),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country: z.string().min(1, 'Required'),
  phone_number: z.string().nullable(),
  is_default: z.boolean().default(false),
});

interface AddressFormProps {
  address?: Address;
  onSubmit: (data: AddressFormData, addressId?: string) => Promise<void>;
  onCancel?: () => void;
}

const countries = [
  'United Kingdom', 'Zimbabwe', 'South Africa', 'United States', 
  'Canada', 'Australia', 'New Zealand', 'France', 'Germany', 
  'Spain', 'Italy', 'Portugal', 'Netherlands', 'Belgium'
];

const AddressForm: React.FC<AddressFormProps> = ({ address, onSubmit, onCancel }) => {
  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: address ? {
      address_name: address.address_name,
      recipient_name: address.recipient_name,
      street_address: address.street_address,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      phone_number: address.phone_number,
      is_default: address.is_default,
    } : {
      address_name: '',
      recipient_name: '',
      street_address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'United Kingdom',
      phone_number: '',
      is_default: false,
    }
  });

  const handleSubmitAddress = async (data: AddressFormData) => {
    try {
      await onSubmit(data, address?.id);
    } catch (error) {
      // Error will be handled by the parent component
      console.error('Error in address form submission:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitAddress)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Home, Work, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="recipient_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient Name</FormLabel>
                <FormControl>
                  <Input placeholder="Full name of recipient" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="street_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address</FormLabel>
              <FormControl>
                <Input placeholder="Street address, house number, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State / Province</FormLabel>
                <FormControl>
                  <Input placeholder="State or province (optional)" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl>
                  <Input placeholder="Postal or ZIP code (optional)" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input 
                  type="tel" 
                  placeholder="Phone number (optional)" 
                  {...field} 
                  value={field.value || ''} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Set as default address
                </FormLabel>
                <p className="text-sm text-gray-500">
                  This address will be selected by default for shipping
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="bg-zim-green hover:bg-zim-green/90">
            {address ? 'Update Address' : 'Save Address'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddressForm;
