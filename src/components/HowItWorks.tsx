import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Truck, Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { photos } from '@/data/sitePhotos';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: Calendar,
      number: '01',
      title: 'Book in minutes',
      description:
        'Pick your service and a collection date, then tell us where to come. The whole thing takes under five minutes — no account needed to start.',
      photo: photos.vanPacked,
    },
    {
      icon: Truck,
      number: '02',
      title: 'We collect — free',
      description:
        'A member of our team comes to your door anywhere in the UK or Ireland, wraps and seals your goods, and takes them to our warehouse.',
      photo: photos.applianceCollection,
    },
    {
      icon: Home,
      number: '03',
      title: 'Delivered in Zimbabwe',
      description:
        'Our own fleet delivers door-to-door, from Harare to Bulawayo and everywhere between. You track every step until it arrives.',
      photo: photos.containerLoading,
    },
  ];

  return (
    <section className="bg-white py-20 md:py-28 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink md:text-4xl dark:text-white">
            Three steps from your door to theirs
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            We handle the heavy lifting — literally. Here's how your shipment gets home.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-paper shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-800"
            >
              {/* Real photo */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={step.photo.src}
                  alt={step.photo.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <span className="absolute left-4 top-4 font-display text-5xl font-extrabold text-white/90">
                  {step.number}
                </span>
                <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-zim-green text-white shadow-lg">
                  <step.icon className="h-5 w-5" />
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-display text-xl font-bold text-ink dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link to="/book">
            <Button size="lg" className="h-auto bg-zim-green px-8 py-6 text-lg font-semibold hover:bg-zim-green-dark">
              Start your booking
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
