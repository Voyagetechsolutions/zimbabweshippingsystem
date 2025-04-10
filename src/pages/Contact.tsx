
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, MessageSquare, Send, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    // Mock form submission
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      
      // Reset submitted state after a delay
      setTimeout(() => setSubmitted(false), 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Contact Us
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Get in touch with our team for inquiries, quotes, or support
              </p>
              <div className="flex justify-center mt-6">
                <div className="h-1 w-20 bg-zim-green rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-yellow rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-red rounded-full mx-1"></div>
              </div>
            </div>
            
            <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
                  
                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                        <Check className="h-8 w-8 text-green-600 dark:text-green-300" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-center">
                        Thank you for contacting us. We'll get back to you as soon as possible.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium mb-2">
                            Your Name
                          </label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium mb-2">
                            Email Address
                          </label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium mb-2">
                            Phone Number (Optional)
                          </label>
                          <Input
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+44 7123 456789"
                          />
                        </div>
                        <div>
                          <label htmlFor="subject" className="block text-sm font-medium mb-2">
                            Subject
                          </label>
                          <Input
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                            placeholder="Shipping Inquiry"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="message" className="block text-sm font-medium mb-2">
                          Your Message
                        </label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          required
                          rows={5}
                          placeholder="Enter your message here..."
                        />
                      </div>
                      
                      <Button
                        type="submit"
                        className="bg-zim-red hover:bg-zim-red/90 text-white w-full"
                        disabled={sending}
                      >
                        {sending ? (
                          <div className="flex items-center">
                            <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-white rounded-full" />
                            Sending...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Send className="mr-2 h-4 w-4" /> Send Message
                          </div>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
              
              <div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
                  <div className="p-8">
                    <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-start">
                        <div className="w-12 h-12 rounded-full bg-zim-red/10 flex items-center justify-center mr-4">
                          <MapPin className="h-6 w-6 text-zim-red" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Office Address</h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            Pastures Lodge Farm, Raunds Road<br />
                            Chelveston, Wellingborough<br />
                            Northamptonshire, NN9 6AA
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-12 h-12 rounded-full bg-zim-yellow/10 flex items-center justify-center mr-4">
                          <Phone className="h-6 w-6 text-zim-yellow" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Phone Number</h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            <a href="tel:+447584100552" className="hover:text-zim-yellow transition-colors">
                              +44 7584 100552
                            </a>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-12 h-12 rounded-full bg-zim-green/10 flex items-center justify-center mr-4">
                          <Mail className="h-6 w-6 text-zim-green" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Email Address</h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            <a href="mailto:info@zimbabweshipping.com" className="hover:text-zim-green transition-colors">
                              info@zimbabweshipping.com
                            </a>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-12 h-12 rounded-full bg-green-600/10 flex items-center justify-center mr-4">
                          <MessageSquare className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">WhatsApp Support</h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            <a 
                              href="https://wa.me/447584100552" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-green-600 transition-colors"
                            >
                              +44 7584 100552
                            </a>
                          </p>
                          <a 
                            href="https://wa.me/447584100552" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md mt-2"
                          >
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                            </svg>
                            Chat on WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="p-8">
                    <h2 className="text-2xl font-bold mb-6">Business Hours</h2>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Monday - Friday</span>
                        <span>9:00 AM - 6:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Saturday</span>
                        <span>10:00 AM - 4:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Sunday</span>
                        <span>Closed</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-300">
                        For urgent matters outside business hours, please use our WhatsApp support or email us.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
