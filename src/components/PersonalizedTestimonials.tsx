import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  user_region?: string;
}

const PersonalizedTestimonials = () => {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  // Attempt to get user's location
  useEffect(() => {
    const getUserLocation = async () => {
      // First check if we have location in user metadata
      if (user?.user_metadata?.location) {
        setUserLocation(user.user_metadata.location);
        return;
      }

      // Otherwise try to get from IP geolocation
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_name) {
          setUserLocation(data.country_name);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        // Default to showing all testimonials if location fetch fails
        setUserLocation(null);
      }
    };

    getUserLocation();
  }, [user]);

  // Fetch testimonials based on location
  useEffect(() => {
    const fetchTestimonials = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id,
            user_id,
            rating,
            comment,
            profiles(full_name, user_metadata->location)
          `)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;

        if (data) {
          // Transform data to match Testimonial interface
          const formattedTestimonials = data.map(item => ({
            id: item.id,
            name: item.profiles?.full_name || 'Anonymous Customer',
            location: item.profiles?.location || 'Global',
            rating: item.rating,
            text: item.comment || 'Great service!',
            user_region: item.profiles?.location
          }));

          // Prioritize testimonials from the user's region if available
          if (userLocation) {
            const localTestimonials = formattedTestimonials.filter(t => 
              t.user_region && t.user_region.toLowerCase().includes(userLocation.toLowerCase())
            );
            
            const otherTestimonials = formattedTestimonials.filter(t => 
              !t.user_region || !t.user_region.toLowerCase().includes(userLocation.toLowerCase())
            );
            
            setTestimonials([...localTestimonials, ...otherTestimonials].slice(0, 6));
          } else {
            setTestimonials(formattedTestimonials);
          }
        }
      } catch (error) {
        console.error('Error fetching testimonials:', error);
        // Fallback to static testimonials if the fetch fails
        setTestimonials(fallbackTestimonials);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [userLocation]);

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  // Fallback testimonials if database fetch fails
  const fallbackTestimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Tatenda Moyo',
      location: 'Harare, Zimbabwe',
      rating: 5,
      text: 'Zimbabwe Shipping made it so easy to receive my family\'s care package from the UK. Everything arrived intact and the drum shipping option was perfect!'
    },
    {
      id: '2',
      name: 'Fungai Chikwava',
      location: 'Bulawayo, Zimbabwe',
      rating: 5,
      text: 'I\'ve been using their services for over 2 years now to receive goods from my children in the UK. Their door-to-door delivery option saves me so much time.'
    },
    {
      id: '3',
      name: 'Kudzai Mutasa',
      location: 'London, UK',
      rating: 4,
      text: 'Great pricing and reliable service. The tracking feature kept me informed about my package throughout the shipping process.'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-gray-200 animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded w-full mb-4"></div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="ml-3">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 mt-2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {testimonials.map((testimonial) => (
        <Card key={testimonial.id} className="border-gray-200 hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="flex">
                {renderStars(testimonial.rating)}
              </div>
            </div>
            <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                <span className="text-xl font-bold text-gray-500">{testimonial.name.charAt(0)}</span>
              </div>
              <div className="ml-3">
                <h3 className="font-semibold">{testimonial.name}</h3>
                <p className="text-sm text-gray-500 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {testimonial.location}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PersonalizedTestimonials;
