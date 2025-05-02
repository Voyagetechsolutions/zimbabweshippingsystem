
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { submitCustomQuote } from "@/utils/supabaseUtils";
import { useAuth } from '@/hooks/useAuth';

// Define the form schema with zod
const formSchema = z.object({
  phone_number: z.string().min(1, "Phone number is required"),
  category: z.string().optional(),
  specific_item: z.string().optional(),
  description: z.string().min(10, "Please provide a detailed description of your shipment"),
});

const categories = [
  { value: "automotive", label: "Automotive Parts & Vehicles" },
  { value: "electronics", label: "Electronics & Appliances" },
  { value: "furniture", label: "Furniture" },
  { value: "medical", label: "Medical Equipment" },
  { value: "personal", label: "Personal Effects" },
  { value: "commercial", label: "Commercial Goods" },
  { value: "construction", label: "Construction Materials" },
  { value: "agricultural", label: "Agricultural Equipment" },
  { value: "other", label: "Other" }
];

const specificItems = {
  automotive: [
    { value: "car", label: "Car" },
    { value: "truck", label: "Truck" },
    { value: "parts", label: "Vehicle Parts" },
    { value: "motorcycle", label: "Motorcycle" },
    { value: "other", label: "Other Automotive Item" }
  ],
  electronics: [
    { value: "tv", label: "Television" },
    { value: "fridge", label: "Refrigerator" },
    { value: "freezer", label: "Freezer" },
    { value: "washer", label: "Washing Machine" },
    { value: "generator", label: "Generator" },
    { value: "other", label: "Other Electronics" }
  ],
  furniture: [
    { value: "sofa", label: "Sofa/Couch" },
    { value: "bed", label: "Bed" },
    { value: "cabinet", label: "Cabinets/Wardrobes" },
    { value: "table", label: "Tables/Chairs" },
    { value: "other", label: "Other Furniture" }
  ],
  medical: [
    { value: "equipment", label: "Medical Equipment" },
    { value: "supplies", label: "Medical Supplies" },
    { value: "other", label: "Other Medical Item" }
  ],
  personal: [
    { value: "clothing", label: "Clothing" },
    { value: "books", label: "Books" },
    { value: "housewares", label: "Housewares" },
    { value: "other", label: "Other Personal Items" }
  ],
  commercial: [
    { value: "inventory", label: "Shop Inventory" },
    { value: "equipment", label: "Business Equipment" },
    { value: "other", label: "Other Commercial Goods" }
  ],
  construction: [
    { value: "tools", label: "Tools & Equipment" },
    { value: "materials", label: "Building Materials" },
    { value: "other", label: "Other Construction Items" }
  ],
  agricultural: [
    { value: "tractor", label: "Tractor" },
    { value: "tools", label: "Farming Tools" },
    { value: "equipment", label: "Farming Equipment" },
    { value: "other", label: "Other Agricultural Items" }
  ],
  other: [
    { value: "custom", label: "Custom Item (Specify in Description)" }
  ]
};

interface CustomQuoteFormProps {
  initialData?: any;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
}

const CustomQuoteForm = ({ initialData, onSubmit, onCancel }: CustomQuoteFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Redirect unauthenticated users
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to request a quote.",
        variant: "destructive",
      });
      navigate('/auth', { state: { returnUrl: '/custom-quote' } });
    }
  }, [user, navigate, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone_number: initialData?.senderDetails?.phone || "",
      category: initialData?.shipmentDetails?.category || "",
      specific_item: initialData?.shipmentDetails?.specificItem || "",
      description: initialData?.shipmentDetails?.description || "",
    },
  });

  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to request a quote.",
          variant: "destructive",
        });
        navigate('/auth', { state: { returnUrl: '/custom-quote' } });
        return;
      }
      
      const quoteData = {
        phone_number: values.phone_number,
        category: values.category || null,
        specific_item: values.specific_item || null,
        description: values.description,
      };

      if (onSubmit) {
        onSubmit(quoteData);
      } else {
        const result = await submitCustomQuote(quoteData);
        
        if (result.success) {
          toast({
            title: "Quote Request Submitted",
            description: "We'll review your request and get back to you soon.",
          });
          
          // Navigate to receipt or confirmation page with the quote data
          navigate("/custom-quote-confirmation", {
            state: { 
              customQuoteData: {
                id: result.quoteId,
                ...quoteData
              }
            }
          });
        } else {
          throw new Error(result.error || "Failed to submit quote");
        }
      }
    } catch (error: any) {
      console.error("Error submitting custom quote:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    form.setValue("category", category);
    form.setValue("specific_item", "");
  };

  if (!user) {
    return null; // Return null while redirecting to login page
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Request a Custom Quote</CardTitle>
        <CardDescription>
          Need to ship something special? Tell us about your item and we'll provide a custom quote.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+44 7123 456789" {...field} />
                  </FormControl>
                  <FormDescription>
                    We'll contact you on this number with your quote.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Category (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => handleCategoryChange(value)} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedCategory && (
              <FormField
                control={form.control}
                name="specific_item"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Item (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specific item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {specificItems[selectedCategory as keyof typeof specificItems]?.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please describe your item, including dimensions, weight, and any special handling requirements." 
                      {...field}
                      rows={5}
                    />
                  </FormControl>
                  <FormDescription>
                    The more detail you provide, the more accurate our quote will be.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex gap-3 justify-end">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Back
                </Button>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-gray-500 flex-wrap">
        <p>We aim to respond to all quote requests within 24 hours.</p>
      </CardFooter>
    </Card>
  );
};

export default CustomQuoteForm;
