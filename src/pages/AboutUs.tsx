import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { Truck, Shield, Users, MapPin, Calendar, ArrowRight, Phone } from 'lucide-react';
import { Helmet } from 'react-helmet';

const AboutUs = () => {
  return (
    <>
      <Helmet>
        <title>About Us | Zimbabwe Shipping - Family Business Since 2011</title>
        <meta
          name="description"
          content="Zimbabwe Shipping Services - a family-run business since 2011. We ship to all cities in Zimbabwe with our own trucks. Free UK collection, door-to-door delivery."
        />
      </Helmet>

      <Navbar />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                A Family Business That <span className="text-zim-green">Cares</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Since 2011, we've been the trusted choice for shipping from the UK to Zimbabwe.
                We're not a faceless corporation - we're a family who understands how important your shipments are.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                <div>
                  <div className="text-3xl font-bold text-zim-green">14+</div>
                  <div className="text-sm text-gray-400">Years</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-zim-yellow">1000+</div>
                  <div className="text-sm text-gray-400">Customers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-zim-red">All</div>
                  <div className="text-sm text-gray-400">ZW Cities</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                <div>
                  <h2 className="text-3xl font-bold mb-6 text-gray-900">Our Story</h2>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    Zimbabwe Shipping Services started from hands-on logistics experience. Our founder began as a FedEx driver, learning the importance of careful handling and reliability firsthand.
                  </p>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    In 2011, recognizing the need for trustworthy shipping between the UK and Zimbabwe, we launched our service. What started as Bulawayo Shipping Services has grown to cover all of Zimbabwe.
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    In 2013, we took control of our own destiny by establishing trucking operations in Zimbabwe. This means your shipment stays in our hands from collection to delivery - no third parties, no excuses.
                  </p>
                </div>

                {/* Timeline */}
                <div className="bg-gray-50 rounded-2xl p-8">
                  <h3 className="text-lg font-semibold mb-6">Key Milestones</h3>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-zim-green/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-5 w-5 text-zim-green" />
                      </div>
                      <div>
                        <div className="font-semibold">2011</div>
                        <div className="text-sm text-gray-600">Started Zimbabwe shipping services</div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-zim-yellow/10 flex items-center justify-center flex-shrink-0">
                        <Truck className="h-5 w-5 text-zim-yellow" />
                      </div>
                      <div>
                        <div className="font-semibold">2013</div>
                        <div className="text-sm text-gray-600">Own trucks in Zimbabwe for end-to-end control</div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-zim-red/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5 text-zim-red" />
                      </div>
                      <div>
                        <div className="font-semibold">2025</div>
                        <div className="text-sm text-gray-600">Expanded to Ireland branch</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why We're Different */}
              <div className="mb-16">
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-900">
                  Why We're Different
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-zim-green/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-zim-green" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Family-Run, Not Corporate</h3>
                      <p className="text-sm text-gray-600">
                        When you call us, you talk to people who care. We treat your shipment like it's going to our own family.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-zim-yellow/10 flex items-center justify-center flex-shrink-0">
                      <Truck className="h-6 w-6 text-zim-yellow" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Own Trucks in Zimbabwe</h3>
                      <p className="text-sm text-gray-600">
                        We control the entire journey. From UK collection to Zimbabwe delivery, your goods never leave our care.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-zim-red/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-6 w-6 text-zim-red" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Secure & Insured</h3>
                      <p className="text-sm text-gray-600">
                        Every drum gets a metal coded seal. Full insurance included. Your peace of mind is our priority.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">All Zimbabwe Cities</h3>
                      <p className="text-sm text-gray-600">
                        From Harare to Bulawayo, Mutare to Victoria Falls. We deliver everywhere in Zimbabwe.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-zim-green rounded-2xl p-8 md:p-12 text-center text-white">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Ready to Ship with a Company That Cares?
                </h2>
                <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                  Join thousands of satisfied customers who trust us with their shipments to Zimbabwe.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/book">
                    <Button size="lg" className="bg-white text-zim-green hover:bg-white/90 w-full sm:w-auto">
                      Book Your Shipment
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <a href="tel:+447584100552">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                      <Phone className="mr-2 h-5 w-5" />
                      +44 7584 100552
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
};

export default AboutUs;
