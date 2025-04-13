
import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Testimonial {
  id: string;
  name: string;
  avatar?: string;
  location: string;
  rating: number;
  text: string;
}

// Fallback testimonials if database fetch fails
const fallbackTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Tatenda Moyo',
    location: 'Harare, Zimbabwe',
    rating: 5,
    text: 'UK Shipping made it so easy to receive my family\'s care package from London. Everything arrived intact and the drum shipping option was perfect!'
  },
  {
    id: '2',
    name: 'Fungai Chikwava',
    location: 'Bulawayo, Zimbabwe',
    rating: 5,
    text: 'I\'ve been using their services for over 2 years now to receive supplies for my small business. The service is always reliable.'
  },
  {
    id: '3',
    name: 'David Thompson',
    location: 'Manchester, UK',
    rating: 4,
    text: 'Sending a care package to family in Zimbabwe was simple with this service. Good pricing compared to others I've tried.'
  },
  {
    id: '4',
    name: 'Vimbai Ncube',
    location: 'Gweru, Zimbabwe',
    rating: 5,
    text: 'I received my drum shipment in excellent condition. All my items were packed carefully and arrived safely.'
  },
  {
    id: '5',
    name: 'Emma Clarke',
    location: 'London, UK',
    rating: 4,
    text: 'The door-to-door delivery option made sending items to my elderly relatives so much easier for both of us.'
  },
  {
    id: '6',
    name: 'Tinashe Mabhena',
    location: 'Harare, Zimbabwe',
    rating: 5,
    text: 'The collection process in the UK was convenient for my sister, and I loved being able to track my shipment throughout the journey.'
  }
];

const TestimonialSection = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id,
            user_id,
            rating,
            comment,
            profiles(full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;

        if (data && data.length > 0) {
          // Transform data to match Testimonial interface
          const formattedTestimonials = data.map(item => ({
            id: item.id,
            name: item.profiles?.full_name || 'Anonymous Customer',
            location: 'Zimbabwe', // Default location
            rating: item.rating,
            text: item.comment || 'Great service!'
          }));
          
          setTestimonials(formattedTestimonials);
        }
      } catch (error) {
        console.error('Error fetching testimonials:', error);
        // Already using fallback testimonials as default state
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  function getInitials(name: string) {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  return (
    <section className="bg-gray-50 py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Read testimonials from satisfied customers who have used our services to send 
            and receive shipments between the UK and Zimbabwe.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start mb-4">
                  <Avatar className="h-10 w-10 mr-3">
                    {testimonial.avatar ? (
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    ) : (
                      <AvatarFallback className="bg-zim-green text-white">
                        {getInitials(testimonial.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{testimonial.name}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span>{testimonial.location}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex mb-3">
                  {renderStars(testimonial.rating)}
                </div>
                
                <p className="text-gray-600">{testimonial.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
