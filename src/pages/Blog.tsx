
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { Calculator, Package, Truck, Phone } from 'lucide-react';
import { Helmet } from 'react-helmet';

const Blog = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>How to Ship from UK to Zimbabwe - Complete Guide | Zimbabwe Shipping</title>
        <meta name="description" content="Complete guide on shipping from UK to Zimbabwe. Learn about costs, timelines, door-to-door delivery and tips for affordable Zimbabwe shipping." />
        <meta name="keywords" content="UK to Zimbabwe shipping guide, shipping costs Zimbabwe, door-to-door delivery Zimbabwe, Zimbabwe courier" />
      </Helmet>
      
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <article className="prose prose-lg max-w-none">
            <header className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                🇬🇧✈️🇿🇼 How to Ship from the UK to Zimbabwe – A Complete Guide
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Shipping from the UK to Zimbabwe has never been easier. Whether you're sending personal items to loved ones, restocking your business back home, or relocating, having a reliable courier partner is key. This guide walks you through everything you need to know about <strong>Zimbabwe shipping</strong>, <strong>door-to-door delivery</strong>, costs, timelines, and choosing the right provider.
              </p>
            </header>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                🚚 Why People Ship from the UK to Zimbabwe
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Many Zimbabweans living in the UK regularly send parcels home. From groceries, clothes, electronics, and car parts to essential documents, the need for fast, affordable, and secure <strong>UK to Zimbabwe shipping</strong> is growing.
              </p>
              <p className="text-gray-700 leading-relaxed">
                That's where trusted shipping companies like <strong>Zimbabwe Shipping</strong> come in — providing professional and transparent solutions to keep families and businesses connected.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                📦 Step-by-Step: How to Ship from the UK to Zimbabwe
              </h2>
              <div className="space-y-4">
                <div className="border-l-4 border-zim-green pl-6">
                  <h3 className="text-xl font-semibold mb-2">1. Prepare your package</h3>
                  <p className="text-gray-700">Secure your items in sturdy boxes or suitcases. Avoid prohibited items like flammable materials or illegal goods.</p>
                </div>
                <div className="border-l-4 border-zim-green pl-6">
                  <h3 className="text-xl font-semibold mb-2">2. Get a quote</h3>
                  <p className="text-gray-700">
                    Use our <Link to="/" className="text-zim-green hover:underline font-medium">Quick Shipping Calculator</Link> to estimate your <strong>shipping cost to Zimbabwe</strong>.
                  </p>
                </div>
                <div className="border-l-4 border-zim-green pl-6">
                  <h3 className="text-xl font-semibold mb-2">3. Book your shipment</h3>
                  <p className="text-gray-700">Schedule a pickup or drop-off online. We offer flexible collection slots across the UK.</p>
                </div>
                <div className="border-l-4 border-zim-green pl-6">
                  <h3 className="text-xl font-semibold mb-2">4. Track your parcel</h3>
                  <p className="text-gray-700">Use our real-time tracking tool to follow your package every step of the way.</p>
                </div>
                <div className="border-l-4 border-zim-green pl-6">
                  <h3 className="text-xl font-semibold mb-2">5. Delivery to Zimbabwe</h3>
                  <p className="text-gray-700">
                    Choose <strong>door-to-door shipping Zimbabwe</strong> or collection from a local depot in major cities like Harare, Bulawayo, Gweru, or Mutare.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                📋 What Can You Ship?
              </h2>
              <p className="text-gray-700 mb-4">We ship a wide range of items, including:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Clothes and shoes</li>
                  <li>Food parcels (non-perishable)</li>
                  <li>Electronics (TVs, phones, laptops)</li>
                  <li>Car parts</li>
                </ul>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Toiletries and cosmetics</li>
                  <li>School supplies</li>
                  <li>Furniture and household items</li>
                </ul>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                <p className="text-gray-700"><strong>Note:</strong> All goods are handled with care and cleared through customs on your behalf.</p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                ⏱️ How Long Does Shipping Take?
              </h2>
              <p className="text-gray-700 mb-4">Shipping time depends on the service you choose:</p>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">✈️</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Air freight</h3>
                      <p className="text-gray-600">5–10 business days</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 font-bold">🚢</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Sea freight</h3>
                      <p className="text-gray-600">3–5 weeks (great for large or bulk items)</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 mt-4">We offer <strong>weekly departures</strong>, ensuring your goods arrive on time.</p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                💰 What's the Cost of Shipping?
              </h2>
              <p className="text-gray-700 mb-4">Shipping rates are based on:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li><strong>Weight and size</strong></li>
                <li><strong>Destination city</strong></li>
                <li><strong>Shipping method (air or sea)</strong></li>
              </ul>
              <p className="text-gray-700">
                Use our online calculator to get an instant, no-obligation quote. We offer <strong>transparent pricing</strong> — no hidden fees.
              </p>
              <div className="mt-6">
                <Link to="/pricing">
                  <Button className="bg-zim-green hover:bg-zim-green/90">
                    <Calculator className="mr-2 h-4 w-4" />
                    View Our Pricing
                  </Button>
                </Link>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                🏠 Door-to-Door vs Collection Point
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">Door-to-door</h3>
                  <p className="text-gray-700">We pick up from your UK address and deliver straight to the recipient's home in Zimbabwe.</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-3">Collection point</h3>
                  <p className="text-gray-700">Cheaper option. You drop off your parcel in the UK and your recipient collects it from a depot in Zimbabwe.</p>
                </div>
              </div>
              <p className="text-gray-700 mt-4">Choose the option that fits your needs and budget.</p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                💡 Tips to Reduce Shipping Costs
              </h2>
              <div className="bg-yellow-50 rounded-lg p-6">
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Pack efficiently — avoid oversized boxes.</li>
                  <li>Combine multiple small parcels into one.</li>
                  <li>Ship in groups with friends or family.</li>
                  <li>Use sea freight for large shipments.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                🙌 Why Choose Zimbabwe Shipping?
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✅</span>
                    <span className="text-gray-700">Weekly pickups from across the UK</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✅</span>
                    <span className="text-gray-700">Door-to-door delivery to all major Zimbabwean cities</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✅</span>
                    <span className="text-gray-700">Friendly and reliable customer support</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✅</span>
                    <span className="text-gray-700">Fully insured and trackable</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✅</span>
                    <span className="text-gray-700">Affordable and competitive rates</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✅</span>
                    <span className="text-gray-700">Hassle-free customs clearance</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                ❓ Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Q: How do I pay for shipping?</h3>
                  <p className="text-gray-700">A: You can pay via bank transfer, card, or online payment.</p>
                </div>
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Q: Can I ship fragile items?</h3>
                  <p className="text-gray-700">A: Yes. We handle fragile items with extra care. Please notify us when booking.</p>
                </div>
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Q: Can I track my parcel?</h3>
                  <p className="text-gray-700">A: Absolutely! We provide live tracking updates from pickup to delivery.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Q: Do you offer storage?</h3>
                  <p className="text-gray-700">A: Yes, we can hold your parcel for a few days before shipping if needed.</p>
                </div>
              </div>
            </section>

            <section className="bg-zim-green text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-6 flex items-center justify-center">
                📞 Ready to Ship?
              </h2>
              <p className="text-lg mb-8">Let us take care of your next shipment.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="outline" className="bg-white text-zim-green hover:bg-gray-100">
                  <Link to="/booking" className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Book a Shipment
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-white text-zim-green hover:bg-gray-100">
                  <Link to="/track" className="flex items-center">
                    <Truck className="mr-2 h-5 w-5" />
                    Track Your Parcel
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-white text-zim-green hover:bg-gray-100">
                  <Link to="/contact" className="flex items-center">
                    <Phone className="mr-2 h-5 w-5" />
                    Contact Us
                  </Link>
                </Button>
              </div>
            </section>

            <footer className="text-center mt-12 pt-8 border-t border-gray-200">
              <p className="text-xl font-bold text-gray-900 mb-2">Zimbabwe Shipping – Your Trusted UK to Zimbabwe Courier.</p>
              <p className="text-gray-600">Fast. Reliable. Affordable.</p>
            </footer>
          </article>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Blog;
