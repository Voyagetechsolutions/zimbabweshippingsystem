
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoIcon } from 'lucide-react';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pickupAddress: string;
  pickupPostcode: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  shipmentType: string;
  weight: string;
  itemCategory: string;
  itemDescription: string;
  terms: boolean;
}

const BookingForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    pickupAddress: '',
    pickupPostcode: '',
    recipientName: '',
    recipientPhone: '',
    deliveryAddress: '',
    deliveryCity: '',
    shipmentType: 'parcel',
    weight: '',
    itemCategory: '',
    itemDescription: '',
    terms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPostcodeWarning, setShowPostcodeWarning] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      terms: checked
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      shipmentType: value
    }));
  };

  const validate = () => {
    let tempErrors: Record<string, string> = {};
    tempErrors.firstName = formData.firstName ? "" : "First name is required";
    tempErrors.lastName = formData.lastName ? "" : "Last name is required";
    tempErrors.email = /\S+@\S+\.\S+/.test(formData.email) ? "" : "Email is not valid";
    tempErrors.phone = formData.phone.length > 9 ? "" : "Phone must be at least 10 numbers";
    tempErrors.pickupAddress = formData.pickupAddress ? "" : "Pickup address is required";
    tempErrors.pickupPostcode = formData.pickupPostcode ? "" : "Pickup postcode is required";
    tempErrors.recipientName = formData.recipientName ? "" : "Recipient name is required";
    tempErrors.recipientPhone = formData.recipientPhone.length > 9 ? "" : "Recipient phone must be at least 10 numbers";
    tempErrors.deliveryAddress = formData.deliveryAddress ? "" : "Delivery address is required";
    tempErrors.deliveryCity = formData.deliveryCity ? "" : "Delivery city is required";
    tempErrors.weight = formData.weight ? "" : "Weight is required";
    tempErrors.itemCategory = formData.itemCategory ? "" : "Item category is required";
    tempErrors.itemDescription = formData.itemDescription ? "" : "Item description is required";
    tempErrors.terms = formData.terms ? "" : "You must agree to the terms and conditions";

    setErrors({
      ...tempErrors
    });

    return Object.values(tempErrors).every(x => x === "");
  }

  const handleSubmit = () => {
    if (validate()) {
      console.log("Form submitted:", formData);
      // Here you would typically handle form submission, e.g., sending data to an API
      navigate('/some-path');
    }
  };

  const checkPostcode = (postcode: string) => {
    const restrictedPostcodes = ['PO1', 'PO2', 'PO3']; // Example restricted postcodes
    const isRestricted = restrictedPostcodes.includes(postcode.toUpperCase());
    setShowPostcodeWarning(isRestricted);
  };

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Book Your Shipment</h3>

      {showPostcodeWarning && (
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <InfoIcon className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-800">Restricted Area</AlertTitle>
          <AlertDescription className="text-amber-700">
            Your postal code is in a restricted area. Contact our support team to make special arrangements before booking.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <Input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <Input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <Input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pick Up Address *
        </label>
        <Textarea
          name="pickupAddress"
          value={formData.pickupAddress}
          onChange={handleChange}
          rows={3}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
        {errors.pickupAddress && <p className="text-red-500 text-xs mt-1">{errors.pickupAddress}</p>}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Postal Code *
        </label>
        <Input
          type="text"
          name="pickupPostcode"
          value={formData.pickupPostcode}
          onChange={handleChange}
          onBlur={(e) => checkPostcode(e.target.value)}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
        {errors.pickupPostcode && <p className="text-red-500 text-xs mt-1">{errors.pickupPostcode}</p>}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipient Name *
        </label>
        <Input
          type="text"
          name="recipientName"
          value={formData.recipientName}
          onChange={handleChange}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
        {errors.recipientName && <p className="text-red-500 text-xs mt-1">{errors.recipientName}</p>}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipient Phone Number *
        </label>
        <Input
          type="tel"
          name="recipientPhone"
          value={formData.recipientPhone}
          onChange={handleChange}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
        {errors.recipientPhone && <p className="text-red-500 text-xs mt-1">{errors.recipientPhone}</p>}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Address *
        </label>
        <Textarea
          name="deliveryAddress"
          value={formData.deliveryAddress}
          onChange={handleChange}
          rows={3}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
        {errors.deliveryAddress && <p className="text-red-500 text-xs mt-1">{errors.deliveryAddress}</p>}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delivery City *
        </label>
        <Input
          type="text"
          name="deliveryCity"
          value={formData.deliveryCity}
          onChange={handleChange}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
        {errors.deliveryCity && <p className="text-red-500 text-xs mt-1">{errors.deliveryCity}</p>}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Shipment Type *
        </label>
        <Select
          onValueChange={handleSelectChange}
          defaultValue={formData.shipmentType}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select shipment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="parcel">Parcel</SelectItem>
            <SelectItem value="drum">Drum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Weight (kg) *
        </label>
        <Input
          type="number"
          name="weight"
          value={formData.weight}
          onChange={handleChange}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
        {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item Category *
        </label>
        <Input
          type="text"
          name="itemCategory"
          value={formData.itemCategory}
          onChange={handleChange}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
        {errors.itemCategory && <p className="text-red-500 text-xs mt-1">{errors.itemCategory}</p>}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item Description *
        </label>
        <Textarea
          name="itemDescription"
          value={formData.itemDescription}
          onChange={handleChange}
          rows={3}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
        {errors.itemDescription && <p className="text-red-500 text-xs mt-1">{errors.itemDescription}</p>}
      </div>

      <div className="mt-4">
        <label className="inline-flex items-center">
          <Checkbox
            name="terms"
            checked={formData.terms}
            onCheckedChange={handleCheckboxChange}
            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <span className="ml-2 block text-sm text-gray-900">
            I agree to the terms and conditions
          </span>
        </label>
        {errors.terms && <p className="text-red-500 text-xs mt-1">{errors.terms}</p>}
      </div>

      <div className="mt-6">
        <Button onClick={handleSubmit} className="w-full bg-zim-green hover:bg-zim-green/90">
          Book Shipment
        </Button>
      </div>
    </Card>
  );
};

export default BookingForm;
