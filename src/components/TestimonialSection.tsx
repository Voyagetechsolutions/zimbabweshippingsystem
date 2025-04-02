
import React from 'react';
import { Star } from 'lucide-react';

const TestimonialSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Tendai Muchenje',
      location: 'Harare, Zimbabwe',
      content: 'I've been using Zimbabwe Shipping for over 3 years now. The service is consistently reliable and the prices are very competitive. My family in Harare always receives the packages on time.',
      rating: 5,
    },
    {
      name: 'Sarah Johnson',
      location: 'London, UK',
      content: 'Sending packages to my relatives in Bulawayo has never been easier. The drum shipping service is perfect for sending multiple items at once, and the tracking system keeps me updated every step of the way.',
      rating: 5,
    },
    {
      name: 'Farai Mtetwa',
      location: 'Birmingham, UK',
      content: 'Excellent service! My packages always arrive safely and the staff are very helpful with any questions. The online booking system makes the whole process quick and easy.',
      rating: 4,
    },
  ];

  return (
    <section className="py-16 bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What Our Customers Say</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our customers have to say about our shipping services to Zimbabwe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-gray-800 rounded-lg p-6 shadow-xl relative"
            >
              {/* Zimbabwe flag accent */}
              <div className="absolute top-0 left-0 right-0 h-1 zim-gradient-horizontal"></div>
              
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < testimonial.rating ? 'text-zim-yellow fill-zim-yellow' : 'text-gray-600'}`}
                  />
                ))}
              </div>
              
              <p className="text-gray-300 mb-6">"{testimonial.content}"</p>
              
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-10 h-10 rounded-full bg-zim-green flex items-center justify-center text-white font-bold">
                    {testimonial.name[0]}
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-medium">{testimonial.name}</h4>
                  <p className="text-gray-400 text-sm">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-400">
            <span className="text-zim-yellow font-bold text-xl">4.8/5</span> - Based on 250+ verified reviews
          </p>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
