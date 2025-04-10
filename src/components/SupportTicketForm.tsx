
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SupportTicketForm: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.full_name?.split(' ')[0] || '',
    lastName: user?.user_metadata?.full_name?.split(' ')?.[1] || '',
    email: user?.email || '',
    subject: '',
    message: '',
    priority: 'Medium',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.message) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the support ticket
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id || null,
          subject: formData.subject,
          message: formData.message,
          priority: formData.priority,
          status: 'Open',
          // Add email to the metadata if user is not logged in
          ...(user ? {} : { metadata: { 
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email 
          }})
        })
        .select('id')
        .single();

      if (error) throw error;
      
      // Create notification for admins about the new ticket
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: 'system', // This can be filtered on the admin side
          title: 'New Support Ticket',
          message: `A new support ticket #${data.id.substring(0, 8)} has been created: ${formData.subject}`,
          type: 'support',
          related_id: data.id,
          is_read: false,
        });
      
      if (notificationError) console.error("Error creating notification:", notificationError);
      
      toast({
        title: "Support ticket created",
        description: `Your ticket #${data.id.substring(0, 8)} has been created successfully.`,
      });
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        subject: '',
        message: '',
        priority: 'Medium'
      }));
      
    } catch (error: any) {
      console.error("Error creating support ticket:", error);
      toast({
        title: "Error submitting ticket",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border shadow-md max-w-2xl mx-auto w-full">
      <CardHeader>
        <CardTitle>Submit a Support Ticket</CardTitle>
        <CardDescription>
          Our support team typically responds within 24 hours.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Brief description of your issue"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => handleSelectChange('priority', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Please describe your issue in detail"
              rows={5}
              required
            />
          </div>
        </CardContent>
        
        <CardFooter className="border-t pt-6 flex justify-between">
          <Button
            type="button" 
            variant="outline"
            onClick={() => {
              setFormData({
                firstName: user?.user_metadata?.full_name?.split(' ')[0] || '',
                lastName: user?.user_metadata?.full_name?.split(' ')?.[1] || '',
                email: user?.email || '',
                subject: '',
                message: '',
                priority: 'Medium',
              });
            }}
          >
            Reset
          </Button>
          
          <Button 
            type="submit" 
            className="bg-zim-green hover:bg-zim-green/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              "Submit Ticket"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SupportTicketForm;
