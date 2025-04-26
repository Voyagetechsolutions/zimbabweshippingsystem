
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface Testimonial {
  id: string;
  name: string;
  company?: string;
  testimonial: string;
  imageUrl?: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'John Smith',
    company: 'Tech Solutions Ltd',
    testimonial: 'The shipping service was excellent! My package arrived faster than expected and in perfect condition.',
    imageUrl: '/lovable-uploads/f427ac1e-be37-4600-94e5-cc4115c6e4c4.png',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    company: 'Global Imports',
    testimonial: 'I\'ve been using this service for my business shipments for over a year now. Reliable, efficient, and great customer service!',
    imageUrl: '/lovable-uploads/91ced7e2-c45b-4edd-a64b-6853e014c0ce.png',
  },
  {
    id: '3',
    name: 'Michael Brown',
    testimonial: 'Shipping to Zimbabwe has never been easier. The tracking system is very accurate and gives me peace of mind.',
    imageUrl: '/lovable-uploads/9c6e5aa8-fd5f-45ee-8e2e-80e1bfeae1b5.png',
  },
  {
    id: '4',
    name: 'Grace Moyo',
    company: 'Family Shop',
    testimonial: 'Incredible door-to-door service! They handled my drums with care and delivered right to my family in Harare.',
    imageUrl: '/lovable-uploads/8aba4bb5-76cc-4202-a81d-e765192b2dbc.png',
  },
  {
    id: '5',
    name: 'David Chen',
    company: 'Import Export Co.',
    testimonial: 'Best shipping rates I\'ve found for UK to Zimbabwe. The customer service team is always helpful and responsive.',
    imageUrl: '/lovable-uploads/28deab65-7859-4a23-8d21-37afd6bcda2a.png',
  },
  {
    id: '6',
    name: 'Emily Williams',
    testimonial: 'Used their service to send care packages to family. Everything arrived safely and the tracking updates were great!',
    imageUrl: '/lovable-uploads/27c10d33-77e5-440a-ad90-8cc4b2daad65.png',
  }
];

const TestimonialSection = () => {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">What Our Customers Say</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Hear from our satisfied customers about their experience with our shipping services
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="overflow-hidden border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {testimonial.imageUrl && (
                    <img 
                      src={testimonial.imageUrl}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{testimonial.name}</h3>
                    {testimonial.company && (
                      <p className="text-gray-500 text-sm">{testimonial.company}</p>
                    )}
                  </div>
                </div>
                <p className="text-gray-700">{testimonial.testimonial}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
