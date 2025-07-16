
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Truck, Shield, Clock, Home, CreditCard, Smile, PackageCheck, Award, Users, Globe } from 'lucide-react';
import { Helmet } from 'react-helmet';

const AboutUs = () => {
  useEffect(() => {
    // Update the document title when component mounts
    document.title = 'About Zimbabwe Shipping Services | Our Story, Mission & 14+ Years Experience';
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>About Zimbabwe Shipping Services | Our Story, Mission & 14+ Years Experience</title>
        <meta
          name="description"
          content="Learn about Zimbabwe Shipping Services - a family-run business since 2011. Discover our journey from FedEx experience to becoming Zimbabwe's trusted UK shipping partner with door-to-door delivery."
        />
        <meta name="keywords" content="Zimbabwe Shipping Services history, family shipping business, UK Zimbabwe logistics company, shipping experience, Telk Removals background" />
        <meta name="author" content="Zimbabwe Shipping Services" />

        {/* Open Graph */}
        <meta property="og:title" content="About Zimbabwe Shipping Services | Our Story & 14+ Years Experience" />
        <meta property="og:description" content="Family-run Zimbabwe shipping business since 2011 with FedEx heritage and door-to-door delivery expertise." />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About Zimbabwe Shipping Services | Our Story & Experience" />
        <meta name="twitter:description" content="Family-run Zimbabwe shipping business since 2011 with FedEx heritage and door-to-door delivery expertise." />
      </Helmet>

      <Navbar />
      <main className="min-h-screen pt-8">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-zim-green/10 to-zim-red/10 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">About Zimbabwe Shipping Services</h1>
              <p className="text-xl text-gray-600 mb-8">
                A family-run business dedicated to reliable shipping between the UK and Zimbabwe since 2011. Built on a foundation of trust, experience, and unwavering commitment to customer satisfaction.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-zim-green/10 flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-zim-green" />
                  </div>
                  <h3 className="font-bold text-2xl">14+</h3>
                  <p className="text-gray-600">Years of Experience</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-zim-yellow/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-zim-yellow" />
                  </div>
                  <h3 className="font-bold text-2xl">1000+</h3>
                  <p className="text-gray-600">Satisfied Customers</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-zim-red/10 flex items-center justify-center mx-auto mb-4">
                    <Globe className="h-8 w-8 text-zim-red" />
                  </div>
                  <h3 className="font-bold text-2xl">All</h3>
                  <p className="text-gray-600">Zimbabwe Cities Served</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Us Content */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-zim-green">Our Heritage and Foundation</h2>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Zimbabwe Shipping Services began as a vision rooted in professional logistics experience and family values. Our director's early career as a FedEx driver instilled the core principles that define our company today: meticulous goods handling, unwavering reliability, and absolute trustworthiness in every shipping transaction.
                </p>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  This foundation of excellence was further strengthened through the successful establishment of Telk Removals, a highly regarded family-run home removals company in the UK. This venture not only enhanced our team's expertise in handling diverse goods but also deepened our understanding of what customers value most: careful handling, transparent communication, and treating every item as if it were our own precious possession.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The transition from domestic removals to international shipping in 2011 marked a significant milestone in our journey. We recognized the need for reliable, family-oriented shipping services connecting the UK and Zimbabwe communities, and we were determined to fill that gap with the same level of care and professionalism that built our reputation in the removals industry.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-8">
                <h3 className="text-xl font-semibold mb-6 text-center">Our Journey Timeline</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-zim-green mr-4"></div>
                    <div>
                      <p className="font-medium">Early Career</p>
                      <p className="text-sm text-gray-600">FedEx driver experience building foundation</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-zim-yellow mr-4"></div>
                    <div>
                      <p className="font-medium">Business Development</p>
                      <p className="text-sm text-gray-600">Established Telk Removals in the UK</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-zim-red mr-4"></div>
                    <div>
                      <p className="font-medium">2011</p>
                      <p className="text-sm text-gray-600">Started international Zimbabwe shipping</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-zim-black mr-4"></div>
                    <div>
                      <p className="font-medium">2013</p>
                      <p className="text-sm text-gray-600">Expanded trucking logistics in Zimbabwe</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-zim-green mr-4"></div>
                    <div>
                      <p className="font-medium">2025</p>
                      <p className="text-sm text-gray-600">Opened new branch in Ireland</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-8 md:p-12">
                <h2 className="text-3xl font-bold mb-8 text-zim-green text-center">Our Story of Growth and Excellence</h2>
                
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-zim-red">From Bulawayo to All Zimbabwe</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      Our journey began as Bulawayo Shipping Services, focusing on connecting the UK with Zimbabwe's second-largest city. However, our commitment to serving the entire Zimbabwe community led us to expand our services nationwide. Today, as Zimbabwe Shipping Services, we proudly deliver to all cities across Zimbabwe, ensuring that no matter where your loved ones or business partners are located, we can reach them reliably and efficiently.
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                      This expansion reflects not just our business growth, but our deep understanding of the Zimbabwe diaspora's needs throughout the UK and beyond. We've consistently adapted our services to meet evolving customer requirements while maintaining the personal touch that sets us apart from larger, impersonal shipping corporations.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-zim-yellow">Strategic Business Expansion</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      In 2013, recognizing the importance of end-to-end logistics control, we strategically expanded into trucking logistics within Zimbabwe. This vertical integration allows us to maintain the same high standards of care and reliability throughout the entire shipping process, from collection in the UK to final delivery at your recipient's doorstep in Zimbabwe.
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                      The opening of our Ireland branch in 2025 represents our latest milestone, enabling us to better serve customers across the British Isles while maintaining our commitment to personalized service. This expansion allows us to extend our reach to valued customers in Scotland and beyond, ensuring consistent service quality regardless of location.
                    </p>
                  </div>
                </div>
                
                <div className="mb-12">
                  <h3 className="text-2xl font-semibold mb-6 text-zim-black text-center">Our Unwavering Commitment to Excellence</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed text-center max-w-4xl mx-auto">
                    At Zimbabwe Shipping Services, we understand that every item we transport carries sentimental value and emotional significance. Whether it's a care package for family, business inventory, or personal belongings for returning residents, we treat each shipment with the respect and care it deserves. Our reputation for excellence is built on years of consistent performance, transparent communication, and genuine care for our customers' needs.
                  </p>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 rounded-full bg-zim-green/10 flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-8 w-8 text-zim-green" />
                      </div>
                      <h4 className="font-bold mb-2">14+ Years of Proven Experience</h4>
                      <p className="text-gray-600 text-sm">Over a decade of reliable shipping services with consistent performance and customer satisfaction</p>
                    </div>
                    
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 rounded-full bg-zim-yellow/10 flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-zim-yellow" />
                      </div>
                      <h4 className="font-bold mb-2">Safety and Security Priority</h4>
                      <p className="text-gray-600 text-sm">Advanced security measures and careful handling ensure your goods arrive safely and intact</p>
                    </div>
                    
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 rounded-full bg-zim-red/10 flex items-center justify-center mx-auto mb-4">
                        <PackageCheck className="h-8 w-8 text-zim-red" />
                      </div>
                      <h4 className="font-bold mb-2">Reliability You Can Trust</h4>
                      <p className="text-gray-600 text-sm">Consistent delivery schedules and transparent tracking for complete peace of mind</p>
                    </div>
                    
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 rounded-full bg-zim-green/10 flex items-center justify-center mx-auto mb-4">
                        <Home className="h-8 w-8 text-zim-green" />
                      </div>
                      <h4 className="font-bold mb-2">Complimentary UK Collection</h4>
                      <p className="text-gray-600 text-sm">Free collection service from any UK address, making shipping convenient and accessible</p>
                    </div>
                    
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 rounded-full bg-zim-yellow/10 flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="h-8 w-8 text-zim-yellow" />
                      </div>
                      <h4 className="font-bold mb-2">Flexible Payment Solutions</h4>
                      <p className="text-gray-600 text-sm">Generous 30-day payment terms from collection date for improved cash flow management</p>
                    </div>
                    
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 rounded-full bg-zim-red/10 flex items-center justify-center mx-auto mb-4">
                        <Truck className="h-8 w-8 text-zim-red" />
                      </div>
                      <h4 className="font-bold mb-2">Competitive Transparent Pricing</h4>
                      <p className="text-gray-600 text-sm">Budget-friendly rates with no hidden fees and clear pricing structure for all services</p>
                    </div>
                    
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 rounded-full bg-zim-black/10 flex items-center justify-center mx-auto mb-4">
                        <Smile className="h-8 w-8 text-zim-black" />
                      </div>
                      <h4 className="font-bold mb-2">Comprehensive Support Services</h4>
                      <p className="text-gray-600 text-sm">Complete customs clearance assistance and relocation support for returning residents</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-zim-green/10 to-zim-red/10 rounded-lg p-8 text-center">
                  <h3 className="text-2xl font-bold mb-4">Ready to Experience the Zimbabwe Shipping Services Difference?</h3>
                  <p className="text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
                    Whether you're shipping personal items, business goods, or gifts to loved ones in Zimbabwe, our experienced team is ready to provide the exceptional service that has made us the trusted choice for thousands of customers. Contact us today to discuss your shipping requirements and discover why families and businesses across the UK choose Zimbabwe Shipping Services for their most important shipments.
                  </p>
                  <div className="space-y-2">
                    <p className="font-bold text-lg">Contact Zimbabwe Shipping Services</p>
                    <p className="font-bold text-xl text-zim-green">+447584100552</p>
                    <p className="text-gray-600">Available for consultations and quotes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AboutUs;
