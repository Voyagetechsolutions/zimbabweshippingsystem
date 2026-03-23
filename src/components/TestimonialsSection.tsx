import React from 'react';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  name: string;
  location: string;
  text: string;
  rating: number;
  date: string;
}

const TestimonialsSection: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      name: 'Sarah M.',
      location: 'Birmingham, UK',
      text: 'Excellent service! My drums arrived in Harare within 3 weeks. The tracking was accurate and the team kept me updated throughout. Will definitely use again.',
      rating: 5,
      date: 'January 2025',
    },
    {
      name: 'Tendai C.',
      location: 'London, UK',
      text: 'Been using Zimbabwe Shipping for 3 years now. Always reliable, fair prices, and the collection is always on time. Highly recommend to anyone sending goods home.',
      rating: 5,
      date: 'December 2024',
    },
    {
      name: 'Patrick O.',
      location: 'Dublin, Ireland',
      text: 'First time using them from Ireland and very impressed. Good communication, competitive Euro pricing, and my family received everything in perfect condition.',
      rating: 5,
      date: 'February 2025',
    },
    {
      name: 'Grace N.',
      location: 'Manchester, UK',
      text: 'Shipped furniture and it arrived without a scratch. The team handled everything professionally. A bit pricey for large items but worth it for the peace of mind.',
      rating: 4,
      date: 'November 2024',
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            What Our Customers Say
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Trusted by thousands of customers across UK & Ireland
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 relative"
              >
                {/* Quote icon */}
                <Quote className="absolute top-4 right-4 h-8 w-8 text-gray-200 dark:text-gray-700" />

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < testimonial.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Text */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {testimonial.location}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {testimonial.date}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Trust indicator */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-6 py-3 rounded-full">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-white"
                  >
                    {['S', 'T', 'P', 'G'][i]}
                  </div>
                ))}
              </div>
              <span className="ml-2 font-medium">
                Join 1,000+ satisfied customers
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
