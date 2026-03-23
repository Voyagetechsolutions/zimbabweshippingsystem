import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Truck,
  CreditCard,
  Box,
  Clock,
  HelpCircle,
  ShoppingBag,
  MapPin,
  AlertTriangle,
  Search,
  MessageCircle,
  Phone
} from 'lucide-react';

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const faqCategories = [
    {
      id: 'shipping',
      title: 'Shipping',
      icon: Truck,
      color: 'zim-green',
      questions: [
        {
          question: 'How long does shipping from the UK to Zimbabwe take?',
          answer: 'Our standard shipping time from the UK to Zimbabwe is approximately 6 weeks. 10-14 days for parcel delivery. Transit times may vary slightly depending on customs clearance and local delivery conditions in Zimbabwe.'
        },
        {
          question: 'Do you ship from Ireland as well?',
          answer: 'Yes! We now offer shipping from Ireland to Zimbabwe. Drum shipping from Ireland starts at €340 for 5+ drums, €350 for 2-4 drums, and €360 for a single drum. Collection is available across Ireland.'
        },
        {
          question: 'What items can I ship to Zimbabwe?',
          answer: 'You can ship most personal effects, clothing, food (non-perishable), electronics, household goods, and gifts. However, there are restrictions on certain items. Please refer to our Shipping Guidelines page for a comprehensive list of prohibited and restricted items.'
        },
        {
          question: 'How do I package my items for shipping?',
          answer: 'For drum shipping, we recommend organizing items by type, using plastic bags for clothing, bubble wrap for fragile items, and filling empty spaces to prevent movement. For parcels, use appropriate boxes, cushioning material, and strong tape to ensure your items remain secure during transit.'
        },
        {
          question: 'Is insurance included in the shipping cost?',
          answer: 'Basic coverage is included in all our shipping rates. Zimbabwe Shipping does not provide insurance. We recommend purchasing it elsewhere to cover the full declared value of your shipment.'
        }
      ]
    },
    {
      id: 'payment',
      title: 'Payment',
      icon: CreditCard,
      color: 'zim-yellow',
      questions: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept cash payment, PayPal, bank transfers, payment in Zimbabwe, and mobile payment options. All payment methods are secure and encrypted for your protection.'
        },
        {
          question: 'Is there a discount for cash payments?',
          answer: 'Yes! For UK shipments, paying by cash saves you £20 per drum. Cash prices are: £240 (5+ drums), £250 (2-4 drums), £260 (1 drum). Card payments add £20 per drum.'
        },
        {
          question: 'When do I need to pay for my shipment?',
          answer: 'Payment is required at the time of booking your shipment. For business accounts with regular shipping needs, we offer payment terms and invoicing options.'
        },
        {
          question: 'Do you offer volume discounts?',
          answer: 'Yes, we offer volume discounts for multiple drums or large parcel shipments. The more drums you ship, the lower the per-drum price. 5+ drums get the best rate.'
        },
        {
          question: 'Can I pay in Euros for Ireland shipments?',
          answer: 'Yes! All Ireland shipments are priced in Euros (EUR). Our Ireland pricing is: €340 (5+ drums), €350 (2-4 drums), €360 (1 drum).'
        }
      ]
    },
    {
      id: 'collection',
      title: 'Collection',
      icon: MapPin,
      color: 'zim-red',
      questions: [
        {
          question: 'How does the collection service work?',
          answer: 'We offer FREE scheduled collections based on postal code areas across the UK and Ireland. Once you enter your postal code during booking, you\'ll see the next available collection date for your area. Our driver will arrive at your address on the scheduled date within the specified time window.'
        },
        {
          question: 'Do you collect from Ireland?',
          answer: 'Yes! We now offer free collection across Ireland. Enter your Irish Eircode during booking to see available collection dates for your area.'
        },
        {
          question: 'What if I\'m not available on my area\'s collection date?',
          answer: 'If you\'re not available on your area\'s scheduled collection date, you can either drop off your items at our depot, wait for the next collection date in your area (typically every 2-4 weeks), or instruct us on how to access your goods.'
        },
        {
          question: 'Do you collect from all areas in the UK?',
          answer: 'We cover most areas across the UK. However, some remote areas have limited collection schedules or may require additional fees. Check our collection schedule or enter your postal code during booking to confirm service availability.'
        }
      ]
    },
    {
      id: 'tracking',
      title: 'Tracking',
      icon: Box,
      color: 'zim-green',
      questions: [
        {
          question: 'How do I track my shipment?',
          answer: 'You can track your shipment on our website using the tracking number provided in your confirmation email. Simply enter the tracking number in the tracking section on our homepage or tracking page.'
        },
        {
          question: 'How often is tracking information updated?',
          answer: 'Tracking information is updated at key stages of the shipping process: collection, arrival at our UK depot, departure from the UK, arrival in Zimbabwe, customs clearance, and delivery/ready for collection. Updates typically occur within 24 hours of each milestone.'
        },
        {
          question: 'Will my recipient in Zimbabwe be able to track the shipment?',
          answer: 'Yes, anyone with the tracking number can check the shipment status. Additionally, we send SMS notifications to the recipient\'s phone number (if provided) when the shipment arrives in Zimbabwe and is ready for delivery or collection.'
        }
      ]
    },
    {
      id: 'delivery',
      title: 'Delivery in Zimbabwe',
      icon: ShoppingBag,
      color: 'zim-yellow',
      questions: [
        {
          question: 'Do you deliver to all areas in Zimbabwe?',
          answer: 'We deliver to all major cities and towns in Zimbabwe including Harare, Bulawayo, Mutare, Gweru, Kwekwe, Kadoma, Masvingo, and surrounding areas. For remote locations, delivery might take additional time or require collection from the nearest depot.'
        },
        {
          question: 'How does door-to-door delivery work in Zimbabwe?',
          answer: 'Our door-to-door service delivers your shipment directly to your recipient\'s address in Zimbabwe. We contact the recipient to inform them about the delivery day. This service costs an additional £25 per address.'
        },
        {
          question: 'Is there a depot collection option in Zimbabwe?',
          answer: 'Yes, recipients can choose to collect shipments from our depots in Harare, Bulawayo, or Mutare. This option is free of charge and convenient for many recipients. ID verification is required for collection.'
        }
      ]
    },
    {
      id: 'customs',
      title: 'Customs & Documentation',
      icon: AlertTriangle,
      color: 'zim-red',
      questions: [
        {
          question: 'What customs documentation is required?',
          answer: 'All shipments require a detailed packing list/customs declaration form, which you\'ll complete during the booking process. For commercial shipments, additional documentation such as commercial invoices and certificates of origin may be required.'
        },
        {
          question: 'Are there customs duties and taxes for shipments to Zimbabwe?',
          answer: 'Yes, importation of goods to Zimbabwe may be subject to duties and taxes. These are determined by Zimbabwean customs authorities based on the type and value of the items. The recipient is responsible for paying any applicable duties and taxes upon arrival. We pay 50% of the charge.'
        },
        {
          question: 'How do you handle customs clearance?',
          answer: 'We handle standard customs clearance procedures as part of our service. Our dedicated customs team in Zimbabwe processes documentation and works to ensure smooth clearance.'
        }
      ]
    },
    {
      id: 'business',
      title: 'Business Shipping',
      icon: Clock,
      color: 'zim-green',
      questions: [
        {
          question: 'Do you offer special rates for businesses?',
          answer: 'Yes, we offer competitive rates for businesses with regular shipping needs. Volume discounts, account management, and customized shipping solutions are available. Contact our business team for a tailored quote.'
        },
        {
          question: 'Can you ship commercial goods and merchandise?',
          answer: 'Yes, we can ship commercial goods, merchandise, and business equipment to Zimbabwe. Special documentation and customs procedures may apply. Our team can guide you through the requirements for commercial shipments.'
        },
        {
          question: 'How do I set up a business account?',
          answer: 'To set up a business account, please contact our support team at +44 7584 100552. We\'ll assess your shipping needs and set up an appropriate account structure with competitive rates.'
        }
      ]
    },
    {
      id: 'general',
      title: 'General',
      icon: HelpCircle,
      color: 'zim-yellow',
      questions: [
        {
          question: 'How do I book a shipment?',
          answer: 'You can book a shipment online through our website by clicking on "Book Shipment" and following the step-by-step process. Alternatively, you can contact our customer service team who can assist with your booking.'
        },
        {
          question: 'Can I cancel or modify my shipment?',
          answer: 'Yes, you can cancel or modify your shipment up to 24 hours before the scheduled collection date. Please contact our customer service team as soon as possible to make any changes to your booking.'
        },
        {
          question: 'What is the difference between drum shipping and other items?',
          answer: 'Drum shipping involves sending items in a large 200L - 220L drum, ideal for multiple items or bulky goods. Other items involve small parcels to palettes and are charged by volume/size/value. Drum shipping is more cost-effective for larger volumes.'
        },
        {
          question: 'Do you offer any assistance with packing?',
          answer: 'We don\'t offer packing services at your location, however we consider elderly people who are unable to package bigger items or home removal at an additional cost (rate per hour). We provide comprehensive packing guidelines on our website. For drum shipping, we can provide drums for an additional fee if you don\'t have your own.'
        }
      ]
    }
  ];

  // Filter questions based on search
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const displayCategories = searchQuery ? filteredCategories :
    activeCategory ? faqCategories.filter(c => c.id === activeCategory) : faqCategories;

  return (
    <>
      <Helmet>
        <title>FAQ | Zimbabwe Shipping - UK & Ireland to Zimbabwe</title>
        <meta name="description" content="Frequently asked questions about shipping from UK and Ireland to Zimbabwe. Learn about pricing, collection, tracking, customs, and more." />
      </Helmet>

      <Navbar />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                Got questions? We've got answers
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Everything you need to know about shipping from UK & Ireland to Zimbabwe
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zim-green focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Category Pills */}
        <section className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  !activeCategory && !searchQuery
                    ? 'bg-zim-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All Questions
              </button>
              {faqCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setSearchQuery('');
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      activeCategory === category.id
                        ? 'bg-zim-green text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {category.title}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-12 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {searchQuery && (
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Found {filteredCategories.reduce((acc, cat) => acc + cat.questions.length, 0)} results for "{searchQuery}"
                </p>
              )}

              {displayCategories.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No results found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Try a different search term or browse by category</p>
                  <Button onClick={() => setSearchQuery('')} variant="outline">
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {displayCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <div key={category.id} id={category.id} className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2 rounded-lg ${
                            category.color === 'zim-green' ? 'bg-zim-green/10' :
                            category.color === 'zim-yellow' ? 'bg-zim-yellow/10' :
                            'bg-zim-red/10'
                          }`}>
                            <Icon className={`h-5 w-5 ${
                              category.color === 'zim-green' ? 'text-zim-green' :
                              category.color === 'zim-yellow' ? 'text-zim-yellow' :
                              'text-zim-red'
                            }`} />
                          </div>
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{category.title}</h2>
                        </div>

                        <Accordion type="single" collapsible className="space-y-3">
                          {category.questions.map((faq, index) => (
                            <AccordionItem
                              key={index}
                              value={`${category.id}-${index}`}
                              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-6 overflow-hidden"
                            >
                              <AccordionTrigger className="text-left font-medium py-5 hover:no-underline text-gray-900 dark:text-white">
                                {faq.question}
                              </AccordionTrigger>
                              <AccordionContent className="pb-5 text-gray-600 dark:text-gray-400 leading-relaxed">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Still Need Help Section */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Still have questions?
                </h2>
                <p className="text-gray-300 mb-8 max-w-xl mx-auto">
                  Our friendly support team is here to help. Get in touch via WhatsApp or phone and we'll respond as quickly as possible.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="https://wa.me/447584100552"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="lg" className="bg-[#25D366] hover:bg-[#128C7E] text-white w-full sm:w-auto">
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Chat on WhatsApp
                    </Button>
                  </a>
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

export default FAQ;
