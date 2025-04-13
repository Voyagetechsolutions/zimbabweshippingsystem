
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

const TestimonialSection: React.FC = () => {
  const testimonials = [
    {
      id: 1,
      name: 'Tatenda Moyo',
      location: 'Harare, Zimbabwe',
      rating: 5,
      text: 'Zimbabwe Shipping made it so easy to receive my family\'s care package from the UK. Everything arrived intact and the drum shipping option was perfect for sending multiple items at once. Highly recommend!',
      image: '/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png' // placeholder, would be a user image
    },
    {
      id: 2,
      name: 'Fungai Chikwava',
      location: 'Bulawayo, Zimbabwe',
      rating: 5,
      text: 'I\'ve been using their services for over 2 years now to receive goods from my children in the UK. Their door-to-door delivery option saves me so much time and everything always arrives safely.',
      image: '/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png'
    },
    {
      id: 3,
      name: 'Kudzai Mutasa',
      location: 'Mutare, Zimbabwe',
      rating: 4,
      text: 'Great pricing and reliable service. The tracking feature kept me informed about my package throughout the shipping process. Will definitely use their services again!',
      image: '/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png'
    },
    {
      id: 4,
      name: 'Tendai Nyamukapa',
      location: 'Gweru, Zimbabwe',
      rating: 5,
      text: 'My family sent me important medication and supplies through Zimbabwe Shipping and everything arrived quickly. The customer service team was very helpful when I had questions.',
      image: '/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png'
    },
    {
      id: 5,
      name: 'Vimbai Chikomba',
      location: 'Masvingo, Zimbabwe',
      rating: 5,
      text: 'As someone who regularly receives packages from relatives in the UK, I\'ve tried many shipping services, but Zimbabwe Shipping is by far the most reliable and affordable option.',
      image: '/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png'
    },
    {
      id: 6,
      name: 'Tanaka Manyika',
      location: 'Chinhoyi, Zimbabwe',
      rating: 5,
      text: 'The drum shipping option is brilliant! I was able to receive so many items from my family in the UK at once, saving a lot on individual shipping costs. Everything arrived safely and on time.',
      image: '/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png'
    }
  ];

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Hear from our satisfied customers in Zimbabwe who have experienced our reliable shipping services.
          </p>
        </div>

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
                    <p className="text-sm text-gray-500">{testimonial.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-lg font-medium">Trusted by hundreds of Zimbabwean families for reliable UK-to-Zimbabwe shipping.</p>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
