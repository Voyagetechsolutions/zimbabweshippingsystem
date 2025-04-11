
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Truck, Shield, Clock, Home, CreditCard, Smile, PackageCheck } from 'lucide-react';

const AboutUs = () => {
  useEffect(() => {
    // Update the document title when component mounts
    document.title = 'About Us | Zimbabwe Shipping Services';
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-8">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-zim-green/10 to-zim-red/10 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">About Zimbabwe Shipping Services</h1>
              <p className="text-lg text-gray-600 mb-8">
                A family-run business dedicated to reliable shipping between the UK and Zimbabwe since 2011.
              </p>
            </div>
          </div>
        </section>

        {/* About Us Content */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 md:p-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-6 text-zim-green">Our Story</h2>
                <div className="prose max-w-none">
                  <p className="mb-4">
                    Zimbabwe Shipping Services is a family run business based in Northamptonshire. 
                    We're proud to be one of the leading shipping companies, delivering goods from the UK to Zimbabwe. 
                    Our journey began with a passion for safe and reliable transportation and logistics, 
                    strongly influenced in our director's early years as a FedEx driver. 
                    His reputation for diligent goods handling and trustworthiness laid the foundation for our company's values.
                  </p>
                  
                  <p className="mb-4">
                    Before venturing into shipping, our director successfully established Telk Removals, 
                    a well regarded home removals family run company in the UK. 
                    This experience not only sharpened our team's skills in handling diverse goods but also 
                    deepened our understanding of what matters most to our customers: care, reliability, and trust. 
                    Treating every goods as if they were our own.
                  </p>
                  
                  <p className="mb-4">
                    In 2011, we took the bold step into international shipping, driven by a commitment to 
                    connect people and businesses between the UK and Zimbabwe. Over the past 14 years, 
                    we've built a reputation for excellence, safety, and customer satisfaction. 
                    Our growth is a reflection to our team's hard work and dedication.
                    In 2013 we ventured into trucking logistics business in Zimbabwe, which complimented 
                    the shipping business and ensured progressive goods movement.
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-8 mb-4 text-zim-red">Our Vision</h3>
                  <p className="mb-4">
                    As we have expanded from Bulawayo Shipping Services to Zimbabwe Shipping Services, 
                    we now deliver to all cities in Zimbabwe. The year 2025 began with us opening a new branch in Ireland. 
                    This expansion allows us to better serve our clients across the UK and beyond, 
                    including our valued customers in Scotland. We're committed to providing the same level of 
                    service and care that our customers expect from us.
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-8 mb-4 text-zim-yellow">Our Promise</h3>
                  <p className="mb-4">
                    We take pride in the safe handling of our customers' goods, reliability, and trustworthiness. 
                    We understand that every item we transport holds nostalgic value and we treat each shipment 
                    with the care it deserves. Our team is dedicated to ensuring that your goods arrive safely and without fail.
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-8 mb-4 text-zim-black">Why Choose Us?</h3>
                  <ul className="space-y-4 mt-6">
                    <li className="flex items-start">
                      <span className="bg-zim-green/10 p-2 rounded-full mr-3 mt-1">
                        <Clock className="h-5 w-5 text-zim-green" />
                      </span>
                      <div>
                        <span className="font-bold">14 Years of Experience:</span> With over a decade of experience in shipping, 
                        we have the expertise to handle any logistics challenge.
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-zim-yellow/10 p-2 rounded-full mr-3 mt-1">
                        <Shield className="h-5 w-5 text-zim-yellow" />
                      </span>
                      <div>
                        <span className="font-bold">Safety First:</span> We prioritize the safety of your goods, 
                        ensuring they reach their destination in perfect condition.
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-zim-red/10 p-2 rounded-full mr-3 mt-1">
                        <PackageCheck className="h-5 w-5 text-zim-red" />
                      </span>
                      <div>
                        <span className="font-bold">Reliability:</span> Our commitment to reliability means 
                        you can trust us to deliver your goods as anticipated.
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-zim-green/10 p-2 rounded-full mr-3 mt-1">
                        <Home className="h-5 w-5 text-zim-green" />
                      </span>
                      <div>
                        <span className="font-bold">Free collection from your home in the UK:</span> We collect goods anywhere in the UK free of charge.
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-zim-yellow/10 p-2 rounded-full mr-3 mt-1">
                        <CreditCard className="h-5 w-5 text-zim-yellow" />
                      </span>
                      <div>
                        <span className="font-bold">Flexible payment terms:</span> We give you 30-day payment period from collection.
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-zim-red/10 p-2 rounded-full mr-3 mt-1">
                        <Truck className="h-5 w-5 text-zim-red" />
                      </span>
                      <div>
                        <span className="font-bold">Competitive prices:</span> Our prices are budget friendly.
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-zim-black/10 p-2 rounded-full mr-3 mt-1">
                        <Smile className="h-5 w-5 text-zim-black" />
                      </span>
                      <div>
                        <span className="font-bold">Customs clearance and assistance:</span> We provide customs clearance and assistance to returning residents' relocation.
                      </div>
                    </li>
                  </ul>
                  
                  <div className="mt-10 p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <p className="mb-4">
                      Whether you're shipping personal items, business goods, or gifts to loved ones, we're here to help. 
                      Contact us today to learn more about how we can assist with your shipping needs.
                    </p>
                    <p className="font-bold text-lg">+447584100552</p>
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
