
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const AboutPage = () => {
  useEffect(() => {
    // Set page title when component mounts
    document.title = 'About Us | UK to Zimbabwe Shipping';
  }, []);

  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              About Our Service
            </h1>
            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
              Connecting the UK and Zimbabwe with reliable shipping solutions.
            </p>
          </div>

          <div className="prose prose-lg prose-indigo mx-auto">
            <p>
              We are a dedicated shipping service specializing in transporting goods between the United Kingdom and Zimbabwe. 
              With years of experience in international logistics, we offer reliable and affordable shipping solutions for 
              individuals and businesses alike.
            </p>
            
            <h2>Our Mission</h2>
            <p>
              Our mission is to provide a seamless connection between the UK and Zimbabwe, helping families stay connected
              and businesses thrive by ensuring their goods arrive safely and on time.
            </p>
            
            <h2>Our History</h2>
            <p>
              Founded in 2015, our company began as a small family operation helping Zimbabwean expatriates in the UK send 
              packages home. As demand grew, we expanded our services, building a reputation for reliability and customer care.
              Today, we're proud to be one of the leading shipping providers connecting these two nations.
            </p>
            
            <h2>Why Choose Us?</h2>
            <ul>
              <li>Experienced team with deep knowledge of UK-Zimbabwe shipping routes</li>
              <li>Transparent pricing with no hidden fees</li>
              <li>Door-to-door delivery options for ultimate convenience</li>
              <li>Secure handling of all shipments</li>
              <li>Regular departure schedules for predictable delivery times</li>
              <li>Personalized customer service to address your specific needs</li>
            </ul>
            
            <h2>Our Commitment to Quality</h2>
            <p>
              We understand that each package represents a connection between loved ones or a business opportunity. 
              That's why we handle every shipment with care and attention to detail. Our quality control procedures and 
              tracking systems ensure that your goods arrive in the same condition they were sent.
            </p>
            
            <p>
              Thank you for considering our services. We look forward to becoming your trusted shipping partner 
              between the UK and Zimbabwe.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default AboutPage;
