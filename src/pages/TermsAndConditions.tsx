
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet';

const TermsAndConditions = () => {
  return (
    <>
      <Helmet>
        <title>Terms and Conditions | Zimbabwe Shipping Services Legal Agreement & Service Terms</title>
        <meta
          name="description"
          content="Read Zimbabwe Shipping Services comprehensive terms and conditions. Understand our shipping policies, payment terms, delivery procedures, and customer responsibilities for UK to Zimbabwe shipping."
        />
        <meta name="keywords" content="Zimbabwe shipping terms, shipping conditions, service agreement, shipping policies, delivery terms, payment conditions" />
        <meta name="author" content="Zimbabwe Shipping Services" />

        {/* Open Graph */}
        <meta property="og:title" content="Terms and Conditions | Zimbabwe Shipping Services" />
        <meta property="og:description" content="Comprehensive terms and conditions for Zimbabwe Shipping Services including policies and customer responsibilities." />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Terms and Conditions | Zimbabwe Shipping Services" />
        <meta name="twitter:description" content="Comprehensive terms and conditions for Zimbabwe Shipping Services including policies and customer responsibilities." />
      </Helmet>

      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Terms and Conditions</h1>
          <p className="text-lg text-gray-600 text-center mb-12">
            Please read these terms and conditions carefully before using Zimbabwe Shipping Services. By engaging our services, you agree to be bound by these terms.
          </p>
          
          <div className="prose max-w-none space-y-8">
            <section className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold mb-4 text-zim-green">1. Acceptance of Terms and Service Agreement</h2>
              <p className="mb-4 leading-relaxed">
                By accessing and using Zimbabwe Shipping Services' shipping and logistics services, you explicitly accept and agree to be bound by all terms and provisions of this comprehensive agreement. This agreement constitutes a legal contract between you (the customer) and Zimbabwe Shipping Services. If you do not agree with any part of these terms, you must not use our services.
              </p>
              <p className="mb-4 leading-relaxed">
                These terms apply to all services provided by Zimbabwe Shipping Services, including but not limited to package collection, international shipping, customs clearance assistance, delivery services, and customer support. By booking any shipment or engaging our services, you confirm that you have read, understood, and agree to comply with these terms and conditions.
              </p>
              <p className="leading-relaxed">
                We reserve the right to modify these terms at any time with notice to customers. Continued use of our services after such modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold mb-4 text-zim-green">2. Comprehensive Shipping Services and Coverage</h2>
              <p className="mb-4 leading-relaxed">
                Zimbabwe Shipping Services provides comprehensive international shipping and logistics services from the United Kingdom to all major cities and regions throughout Zimbabwe. Our service portfolio includes personal shipments, commercial freight, door-to-door delivery, customs clearance assistance, and specialized cargo handling for various item categories.
              </p>
              <p className="mb-4 leading-relaxed">
                All shipments are subject to our established shipping policies, procedures, and operational guidelines. We maintain the right to inspect packages for compliance with legal requirements and safety standards. Certain items may require special handling procedures or may be restricted or prohibited from shipping, as outlined in our prohibited items policy.
              </p>
              <p className="mb-4 leading-relaxed">
                Our services include free collection from any UK address, secure packaging and handling, international transportation, customs clearance assistance, and final delivery to the specified Zimbabwe destination. We provide tracking services and regular updates throughout the shipping process to ensure transparency and customer confidence.
              </p>
              <p className="leading-relaxed">
                Service availability may be subject to operational constraints, seasonal variations, customs requirements, and circumstances beyond our control including but not limited to weather conditions, political situations, and transportation disruptions.
              </p>
            </section>

            <section className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold mb-4 text-zim-green">3. Pricing Structure, Payment Terms, and Financial Policies</h2>
              <p className="mb-4 leading-relaxed">
                Our pricing structure is transparent and based on volume, weight, and destination within Zimbabwe. Prices for our services are clearly displayed on our website and are subject to change with notice. We reserve the right to modify our pricing structure to reflect changes in operational costs, currency fluctuations, fuel prices, and other economic factors affecting international shipping.
              </p>
              <p className="mb-4 leading-relaxed">
                Payment terms are net 30 days from the date of collection, providing customers with flexibility in managing their finances. We accept various payment methods including bank transfers, credit cards, and other approved payment systems. Late payment may result in interest charges and potential service restrictions.
              </p>
              <p className="mb-4 leading-relaxed">
                All quoted prices are in British Pounds unless otherwise specified and include standard handling and processing. Additional services such as express delivery, special packaging, or extended insurance coverage may incur additional charges that will be clearly communicated before service provision.
              </p>
              <p className="leading-relaxed">
                Customs duties, taxes, and fees imposed by Zimbabwe authorities are the responsibility of the recipient unless otherwise arranged. We provide guidance on potential customs charges but cannot guarantee specific amounts as these are determined by Zimbabwe customs authorities.
              </p>
            </section>

            <section className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold mb-4 text-zim-green">4. Delivery Timeframes, Transit Expectations, and Performance Standards</h2>
              <p className="mb-4 leading-relaxed">
                While we strive to meet all stated delivery timeframes and maintain consistent transit schedules, delivery times are estimates based on typical operational conditions and are not guaranteed. Our standard transit time from UK collection to Zimbabwe delivery is typically 4-6 weeks, though this may vary based on various factors including customs processing, destination accessibility, and seasonal demand fluctuations.
              </p>
              <p className="mb-4 leading-relaxed">
                Various factors may affect actual delivery times including but not limited to customs processing delays, weather conditions, transportation disruptions, political situations, public holidays, and circumstances beyond our reasonable control. We commit to providing regular updates and maintaining open communication regarding any delays or changes to expected delivery schedules.
              </p>
              <p className="mb-4 leading-relaxed">
                Our team works diligently to minimize delays and maintain reliable service standards. We provide tracking information and regular status updates to keep customers informed throughout the shipping process. In cases of significant delays, we will proactively communicate with customers and provide revised delivery estimates.
              </p>
              <p className="leading-relaxed">
                Express or expedited services may be available for time-sensitive shipments at additional cost. These services are subject to availability and operational feasibility, and specific timeframes will be confirmed at the time of booking.
              </p>
            </section>

            <section className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold mb-4 text-zim-green">5. Prohibited Items, Restricted Goods, and Safety Compliance</h2>
              <p className="mb-4 leading-relaxed">
                For the safety of our staff, customers, and transportation networks, certain items are strictly prohibited from shipping. This includes but is not limited to hazardous materials, flammable substances, explosives, illegal items, perishable goods without proper packaging, and items restricted by UK or Zimbabwe customs authorities.
              </p>
              <p className="mb-4 leading-relaxed">
                Customers are responsible for ensuring that all items included in their shipments comply with UK export regulations and Zimbabwe import requirements. We provide guidance on restricted items and customs requirements but customers must verify compliance with all applicable laws and regulations.
              </p>
              <p className="mb-4 leading-relaxed">
                Prohibited items discovered during processing will be removed from shipments at customer expense, and additional fees may apply for handling and disposal. Attempts to ship prohibited items may result in service termination and potential legal consequences.
              </p>
              <p className="leading-relaxed">
                We reserve the right to inspect any package and refuse shipment of items that pose safety risks, violate regulations, or are deemed inappropriate for our shipping network. Customers will be notified of any rejected items and provided with options for alternative handling where possible.
              </p>
            </section>

            <section className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold mb-4 text-zim-green">6. Customer Responsibilities, Obligations, and Service Cooperation</h2>
              <p className="mb-4 leading-relaxed">
                Customers are responsible for providing accurate and complete information regarding shipment contents, recipient details, contact information, and special handling requirements. Incorrect or incomplete information may result in delivery delays, additional charges, or shipment complications.
              </p>
              <p className="mb-4 leading-relaxed">
                Proper packaging is essential for shipment protection. While we provide professional packaging services, customers choosing to package their own items must ensure adequate protection for international transportation. We recommend professional packaging for valuable or fragile items.
              </p>
              <p className="mb-4 leading-relaxed">
                Customers must be available for collection appointments and provide reasonable access to collection addresses. Failed collection attempts due to customer unavailability may result in rescheduling fees and delays.
              </p>
              <p className="leading-relaxed">
                Recipients in Zimbabwe must be available for delivery and provide necessary identification and documentation as required by local regulations. Customers are responsible for ensuring that recipients are informed about incoming shipments and delivery procedures.
              </p>
            </section>

            <section className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold mb-4 text-zim-green">7. Liability, Insurance Coverage, and Claims Procedures</h2>
              <p className="mb-4 leading-relaxed">
                Zimbabwe Shipping Services maintains comprehensive insurance coverage for shipments in transit. Our standard coverage provides protection against loss, damage, and theft during the shipping process. Additional insurance coverage is available for high-value items at additional cost.
              </p>
              <p className="mb-4 leading-relaxed">
                Claims for lost or damaged items must be reported within 30 days of delivery or expected delivery date. Claims require supporting documentation including proof of value, photographs of damage, and detailed descriptions of missing or damaged items.
              </p>
              <p className="mb-4 leading-relaxed">
                Our liability is limited to the declared value of shipments up to maximum coverage limits as specified in our insurance policy. We recommend that customers declare accurate values for their shipments to ensure appropriate coverage levels.
              </p>
              <p className="leading-relaxed">
                We are not liable for delays caused by circumstances beyond our reasonable control, including but not limited to customs processing, weather conditions, political situations, or acts of God. Our commitment is to provide professional service and reasonable care in handling all shipments.
              </p>
            </section>

            <section className="bg-gray-50 rounded-lg border p-6 text-center">
              <h3 className="text-xl font-semibold mb-4">Questions About Our Terms and Conditions?</h3>
              <p className="text-gray-600 mb-4">
                If you have any questions about these terms and conditions or need clarification about any aspect of our services, please don't hesitate to contact our customer service team. We're here to help ensure you understand our policies and procedures.
              </p>
              <p className="font-semibold">Contact Zimbabwe Shipping Services</p>
              <p className="font-bold text-lg text-zim-green">+447584100552</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default TermsAndConditions;
