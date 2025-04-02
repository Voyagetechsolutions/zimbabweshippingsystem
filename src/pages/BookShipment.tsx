
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, Package, Truck, Calendar, MapPin, ChevronRight, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Collection routes and areas with pickup dates
const collectionRoutes = {
  "CARDIFF ROUTE": {
    date: "21st of April",
    areas: ["CARDIFF", "GLOUCESTER", "BRISTOL", "SWINDON", "BATH", "SALISBURY"]
  },
  "BOURNEMOUTH ROUTE": {
    date: "22nd of April",
    areas: ["SOUTHAMPTON", "OXFORD", "HAMPHIRE", "READING", "GUILFORD", "PORTSMOUTH"]
  },
  "BIRMINGHAM ROUTE": {
    date: "24th of April",
    areas: ["WOLVEHAMPTON", "COVENTRY", "WARWICK", "DUDLEY", "WALSALL", "RUGBY"]
  },
  "LONDON ROUTE": {
    date: "19th of April",
    areas: ["CENTRAL LONDON", "HEATHROW", "EAST LONDON", "ROMFORD", "ALL AREAS INSIDE M25"]
  },
  "LEEDS ROUTE": {
    date: "17th of April",
    areas: ["WAKEFIELD", "HALIFAX", "DONCASTER", "SHEFFIELD", "HUDDERSFIELD", "YORK"]
  },
  "NOTTINGHAM ROUTE": {
    date: "18th of April",
    areas: ["LIECESTER", "DERBY", "PETERSBOROUGH", "CORBY", "MARKET HARB"]
  },
  "MANCHESTER ROUTE": {
    date: "26th of April",
    areas: ["LIVERPOOL", "STOKE ON TRENT", "BOLTON", "WARRINGTON", "OLDHAM", "SHREWBURY"]
  },
  "BRIGHTON ROUTE": {
    date: "28th of April",
    areas: ["HIGH COMBE", "SLOUGH", "VRAWLEY", "LANCING", "EASTBOURNE", "CANTEBURY"]
  },
  "SOUTHEND ROUTE": {
    date: "29th of April",
    areas: ["NORWICH", "IPSWICH", "COLCHESTER", "BRAINTREE", "CAMBRIDGE", "BASILDON"]
  },
  "NORTHAMPTON ROUTE": {
    date: "16th of April",
    areas: ["KETTERING", "BEDFORD", "MILTON KEYNES", "BANBURY", "AYLESBURY", "LUTON"]
  },
  "SCOTLAND ROUTE": {
    date: "To be confirmed",
    areas: ["GLASSGOW", "EDINBURGH", "NECASTLE", "MIDDLESBROUGH", "PRESTON", "CARLLSLE"]
  }
};

const BookShipment = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drum");
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    route: '',
    area: '',
    pickupAddress: '',
    deliveryAddress: '',
    preferredDate: '',
    notes: '',
    serviceType: 'drum',
    drumQuantity: '1',
    weight: '1',
    dimensions: '',
    insurance: false,
    doorToDoor: false,
  });

  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [pickupDate, setPickupDate] = useState<string>('');

  useEffect(() => {
    // Reset area when route changes
    if (formData.route) {
      setAvailableAreas(collectionRoutes[formData.route as keyof typeof collectionRoutes].areas);
      setFormData(prev => ({ ...prev, area: '' }));
      setPickupDate('');
    } else {
      setAvailableAreas([]);
    }
  }, [formData.route]);

  useEffect(() => {
    // Set pickup date when both route and area are selected
    if (formData.route && formData.area) {
      const date = collectionRoutes[formData.route as keyof typeof collectionRoutes].date;
      setPickupDate(date);
      // Update the form's preferred date field
      setFormData(prev => ({ ...prev, preferredDate: date }));
    }
  }, [formData.route, formData.area]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setFormData(prev => ({ ...prev, serviceType: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    
    // In a real app, you would send this data to your backend
    toast({
      title: "Shipment Booked!",
      description: "We'll contact you shortly to confirm your booking details.",
    });

    // Reset form after submission
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      route: '',
      area: '',
      pickupAddress: '',
      deliveryAddress: '',
      preferredDate: '',
      notes: '',
      serviceType: activeTab,
      drumQuantity: '1',
      weight: '1',
      dimensions: '',
      insurance: false,
      doorToDoor: false,
    });
    setPickupDate('');
  };

  const calculatePrice = () => {
    if (activeTab === 'drum') {
      const qty = parseInt(formData.drumQuantity);
      if (qty >= 5) return `£${qty * 220}`; 
      if (qty >= 2) return `£${qty * 250}`;
      return '£260';
    } else if (activeTab === 'parcel') {
      const weight = parseInt(formData.weight) || 1;
      return `£${weight * 50}`;
    }
    return 'Calculate based on selection';
  };

  const additionalServices = [
    {
      name: 'doorToDoor',
      label: 'Door-to-Door Delivery',
      description: 'We pick up from your address and deliver directly to recipient',
      price: '£25'
    },
    {
      name: 'insurance',
      label: 'Shipping Insurance',
      description: 'Protect your items with our comprehensive insurance',
      price: '5% of declared value'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-zim-green/10 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Book Your Shipment</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Complete the form below to book your shipment from the UK to Zimbabwe. Our team will contact you to confirm details.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Shipping Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="drum" className="flex items-center gap-2">
                        <Ship className="h-4 w-4" />
                        Drum Shipping
                      </TabsTrigger>
                      <TabsTrigger value="parcel" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Regular Parcel
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Drum and Parcel Tabs */}
                    <TabsContent value="drum" className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="drumQuantity">Number of Drums</Label>
                        <Select 
                          value={formData.drumQuantity} 
                          onValueChange={(value) => handleSelectChange('drumQuantity', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select quantity" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} {num === 1 ? 'Drum' : 'Drums'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-2 text-sm text-gray-500 flex items-center">
                          <Info className="h-3 w-3 mr-1" />
                          <span>Each drum has a capacity of 200L</span>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-md">
                        <p className="font-medium">Pricing Tiers:</p>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li>1 Drum: £260 each</li>
                          <li>2-4 Drums: £250 each</li>
                          <li>5+ Drums: £220 each</li>
                        </ul>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="parcel" className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="weight">Package Weight (kg)</Label>
                        <Input 
                          id="weight"
                          name="weight"
                          type="number" 
                          min="1"
                          value={formData.weight}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dimensions">Package Dimensions (optional)</Label>
                        <Input 
                          id="dimensions"
                          name="dimensions"
                          placeholder="e.g. 30cm x 20cm x 15cm" 
                          value={formData.dimensions}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>
                      <div className="p-4 bg-gray-50 rounded-md">
                        <p className="font-medium">Pricing:</p>
                        <p className="mt-2 text-sm">£50 per kg</p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Collection Route Selection */}
                  <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                    <h3 className="text-lg font-medium mb-2 flex items-center">
                      <Calendar className="mr-2 h-5 w-5 text-yellow-600" />
                      Collection Schedule
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Select your route and area to see the scheduled pickup date for April 2024.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="route">Collection Route</Label>
                        <Select 
                          value={formData.route} 
                          onValueChange={(value) => handleSelectChange('route', value)}
                        >
                          <SelectTrigger id="route">
                            <SelectValue placeholder="Select collection route" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(collectionRoutes).map(route => (
                              <SelectItem key={route} value={route}>
                                {route}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="area">Area</Label>
                        <Select 
                          value={formData.area} 
                          onValueChange={(value) => handleSelectChange('area', value)}
                          disabled={!formData.route}
                        >
                          <SelectTrigger id="area">
                            <SelectValue placeholder={formData.route ? "Select your area" : "Select route first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAreas.map(area => (
                              <SelectItem key={area} value={area}>
                                {area}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {pickupDate && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="flex items-center text-green-800">
                          <Calendar className="h-4 w-4 mr-2 text-green-600" />
                          <span className="font-medium">Collection Date:</span>
                          <span className="ml-2">{pickupDate}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName"
                        name="fullName"
                        placeholder="Your full name" 
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Your email address" 
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone"
                      name="phone"
                      placeholder="Your phone number" 
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pickupAddress">UK Pickup Address</Label>
                    <Textarea 
                      id="pickupAddress"
                      name="pickupAddress"
                      placeholder="Detailed address for pickup (include house number, street, postcode)" 
                      value={formData.pickupAddress}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Make sure this address is within your selected area.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="deliveryAddress">Zimbabwe Delivery Address</Label>
                    <Textarea 
                      id="deliveryAddress"
                      name="deliveryAddress"
                      placeholder="Where should we deliver the package to?" 
                      value={formData.deliveryAddress}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Additional Services */}
                  <div>
                    <p className="font-medium mb-3">Additional Services</p>
                    <div className="space-y-4">
                      {additionalServices.map((service) => (
                        <div key={service.name} className="flex items-start space-x-3 p-4 border rounded-md">
                          <input
                            type="checkbox"
                            id={service.name}
                            name={service.name}
                            checked={formData[service.name as keyof typeof formData] as boolean}
                            onChange={handleCheckboxChange}
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor={service.name} className="cursor-pointer font-medium">
                              {service.label} <span className="text-zim-green ml-2">{service.price}</span>
                            </Label>
                            <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea 
                      id="notes"
                      name="notes"
                      placeholder="Any special instructions or information about your shipment" 
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-zim-green hover:bg-zim-green/90 text-lg">
                    Book Shipment
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-500">Service Type:</p>
                      <p className="font-medium">{activeTab === 'drum' ? 'Drum Shipping' : 'Regular Parcel'}</p>
                    </div>
                    
                    {activeTab === 'drum' && (
                      <div>
                        <p className="text-gray-500">Quantity:</p>
                        <p className="font-medium">{formData.drumQuantity} {parseInt(formData.drumQuantity) === 1 ? 'Drum' : 'Drums'}</p>
                      </div>
                    )}
                    
                    {activeTab === 'parcel' && (
                      <div>
                        <p className="text-gray-500">Weight:</p>
                        <p className="font-medium">{formData.weight} kg</p>
                      </div>
                    )}
                    
                    {formData.route && (
                      <div>
                        <p className="text-gray-500">Collection Route:</p>
                        <p className="font-medium">{formData.route}</p>
                      </div>
                    )}
                    
                    {formData.area && (
                      <div>
                        <p className="text-gray-500">Area:</p>
                        <p className="font-medium">{formData.area}</p>
                      </div>
                    )}
                    
                    {pickupDate && (
                      <div>
                        <p className="text-gray-500">Collection Date:</p>
                        <p className="font-medium text-green-700">{pickupDate}</p>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t">
                      <p className="text-gray-500">Estimated Base Price:</p>
                      <p className="font-bold text-xl text-zim-green">{calculatePrice()}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Additional services may change the final price
                      </p>
                    </div>
                    
                    <div className="pt-4">
                      <p className="font-medium">What happens next?</p>
                      <ol className="mt-2 space-y-2 text-sm text-gray-600">
                        <li className="flex">
                          <span className="font-medium text-zim-green mr-2">1.</span> 
                          We'll review your booking
                        </li>
                        <li className="flex">
                          <span className="font-medium text-zim-green mr-2">2.</span> 
                          Contact you to confirm details
                        </li>
                        <li className="flex">
                          <span className="font-medium text-zim-green mr-2">3.</span> 
                          Collect your items on the scheduled date
                        </li>
                        <li className="flex">
                          <span className="font-medium text-zim-green mr-2">4.</span> 
                          Ship to Zimbabwe
                        </li>
                        <li className="flex">
                          <span className="font-medium text-zim-green mr-2">5.</span> 
                          Deliver to the recipient
                        </li>
                      </ol>
                    </div>
                    
                    <div className="pt-4">
                      <p className="text-center text-sm text-gray-500">
                        Need help? <a href="/contact" className="text-zim-green hover:underline">Contact our team</a>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <WhatsAppButton />
      <Footer />
    </div>
  );
};

export default BookShipment;
