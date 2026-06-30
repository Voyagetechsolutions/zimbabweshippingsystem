import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Quote, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Testimonial {
  name: string;
  location: string;
  text: string;
  rating: number;
  date: string;
  initial: string;
  color: string;
}

const TestimonialsSection: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      name: 'Sarah M.',
      location: 'Birmingham, UK',
      text: 'Excellent service! My drums arrived in Harare within 3 weeks. The tracking was accurate and the team kept me updated throughout. Will definitely use again.',
      rating: 5,
      date: 'January 2025',
      initial: 'S',
      color: 'bg-zim-green',
    },
    {
      name: 'Tendai C.',
      location: 'London, UK',
      text: "Been using Zimbabwe Shipping for 3 years now. Always reliable, fair prices, and the collection is always on time. Highly recommend to anyone sending goods home.",
      rating: 5,
      date: 'December 2024',
      initial: 'T',
      color: 'bg-zim-red',
    },
    {
      name: 'Patrick O.',
      location: 'Dublin, Ireland',
      text: 'First time using them from Ireland and very impressed. Good communication, competitive Euro pricing, and my family received everything in perfect condition.',
      rating: 5,
      date: 'February 2025',
      initial: 'P',
      color: 'bg-zim-green',
    },
    {
      name: 'Grace N.',
      location: 'Manchester, UK',
      text: 'Shipped furniture and it arrived without a scratch. The team handled everything professionally. Worth every penny for the peace of mind.',
      rating: 5,
      date: 'November 2024',
      initial: 'G',
      color: 'bg-amber-500',
    },
  ];

  return (
    <section className="reviews-section bg-white py-20 md:py-28 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="eyebrow">Reviews</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink md:text-4xl dark:text-white">
            Loved by the diaspora
          </h2>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 fill-zim-yellow text-zim-yellow" />
              ))}
            </div>
            <span className="font-display text-2xl font-bold text-ink dark:text-white">4.9</span>
            <span className="text-gray-500 dark:text-gray-400">· 1,000+ families served</span>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative rounded-2xl border border-gray-100 bg-paper p-7 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
            >
              <Quote className="absolute right-6 top-6 h-9 w-9 text-zim-green/15" />

              <div className="mb-4 flex gap-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-zim-yellow text-zim-yellow" />
                ))}
              </div>

              <p className="mb-6 leading-relaxed text-gray-700 dark:text-gray-300">
                "{testimonial.text}"
              </p>

              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${testimonial.color} font-bold text-white`}>
                  {testimonial.initial}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-ink dark:text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.location}</p>
                </div>
                <span className="text-xs text-gray-400">{testimonial.date}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link to="/reviews">
            <Button variant="outline" className="gap-2 border-2">
              Read all reviews
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
