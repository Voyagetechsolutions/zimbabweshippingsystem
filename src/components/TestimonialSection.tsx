import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight } from 'lucide-react';

const TestimonialSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      title: 'Marketing Manager',
      company: 'Acme Corp',
      image: '/lovable-uploads/sarah-johnson.jpg',
      testimonial: "Zimbabwe Shipping has transformed our shipping process. Their reliability and speed are unmatched, making them an invaluable partner for our business.",
    },
    {
      name: 'David Lee',
      title: 'CEO',
      company: 'GlobalTech',
      image: '/lovable-uploads/david-lee.jpg',
      testimonial: "I've been consistently impressed with Zimbabwe Shipping's professionalism and customer service. They handle our shipments with care and always deliver on time.",
    },
    {
      name: 'Emily Chen',
      title: 'Sales Director',
      company: 'Innovate Solutions',
      image: '/lovable-uploads/emily-chen.jpg',
      testimonial: "Thanks to Zimbabwe Shipping, we've been able to expand our reach in Zimbabwe. Their efficient and cost-effective services have greatly contributed to our growth.",
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Clients Say</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Read why businesses trust us with their shipping needs from the UK to Zimbabwe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">{testimonial.name}</CardTitle>
                <CardDescription className="text-gray-500">{testimonial.title}, {testimonial.company}</CardDescription>
              </CardHeader>
              <CardContent>
                <Avatar className="w-16 h-16 rounded-full overflow-hidden mb-4">
                  <AvatarImage src={testimonial.image} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="text-gray-700">{testimonial.testimonial}</p>
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="outline" className="border-zim-black text-zim-black hover:bg-zim-black hover:text-white">
                  Read More <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Button className="bg-zim-green hover:bg-zim-green/90 text-lg px-8">
            View All Testimonials
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
