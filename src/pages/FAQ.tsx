
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Truck, 
  CreditCard, 
  Box, 
  Clock, 
  HelpCircle, 
  ShoppingBag,
  MapPin,
  AlertTriangle
} from 'lucide-react';

const FAQ = () => {
  const faqCategories = [
    {
      id: 'shipping',
      title: 'Shipping',
      icon: <Truck className="h-5 w-5 text-zim-green" />,
      questions: [
        {
          question: 'How long does shipping from the UK to Zimbabwe take?',
          answer: 'Our standard shipping time from the UK to Zimbabwe is approximately 6 weeks. 10-14 days for parcel delivery. Transit times may vary slightly depending on customs clearance and local delivery conditions in Zimbabwe.'
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
      icon: <CreditCard className="h-5 w-5 text-zim-yellow" />,
      questions: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept cash payment, PayPal, bank transfers, payment in zimbabwe and mobile payment options. All payment methods are secure and encrypted for your protection.'
        },
        {
          question: 'When do I need to pay for my shipment?',
          answer: 'Payment is required at the time of booking your shipment. For business accounts with regular shipping needs, we offer payment terms and invoicing options.'
        },
        {
          question: 'Do you offer volume discounts?',
          answer: 'Yes, we offer volume discounts for multiple drums or large parcel shipments. Please contact our customer service team for a custom quote based on your specific shipping requirements.'
        },
        {
          question: 'Can I pay in Zimbabwean currency?',
          answer: 'Currently, all payments must be made in British Pounds (GBP) and United States Dollar (USD). However, we are working on implementing local payment options for recipients in Zimbabwe for certain services.'
        }
      ]
    },
    {
      id: 'collection',
      title: 'Collection',
      icon: <MapPin className="h-5 w-5 text-zim-red" />,
      questions: [
        {
          question: 'How does the collection service work?',
          answer: 'We offer scheduled collections based on postal code areas across the UK. Once you enter your postal code during booking, you\'ll see the next available collection date for your area. Our driver will arrive at your address on the scheduled date within the specified time window.'
        },
        {
          question: 'What if I\'m not available on my area\'s collection date?',
          answer: 'If you\'re not available on your area\'s scheduled collection date, you can either drop off your items at our depot, or wait for the next collection date in your area (typically every 2-4 weeks) or instruct us on how to access your goods'
        },
        {
          question: 'Do you collect from all areas in the UK?',
          answer: 'We cover most areas across the UK. However, some remote have limited collection schedules or may require additional fees. Check our collection schedule or enter your postal code during booking to confirm service availability.'
        },
        {
          question: 'What happens if my postal code is in a restricted area?',
          answer: 'For postal codes in restricted areas, we offer collection services only for large business shipments. If you\'re in a restricted area, please contact our support team via WhatsApp at +44 7584 100552 to discuss possible arrangements.'
        }
      ]
    },
    {
      id: 'tracking',
      title: 'Tracking',
      icon: <Box className="h-5 w-5 text-zim-green" />,
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
          question: 'What if my tracking information hasn\'t updated for several days?',
          answer: 'Occasional delays in tracking updates can occur, especially during customs processing. If your tracking hasn\'t updated for more than 3-4 days, please contact our customer service team for assistance.'
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
      icon: <ShoppingBag className="h-5 w-5 text-zim-yellow" />,
      questions: [
        {
          question: 'Do you deliver to all areas in Zimbabwe?',
          answer: 'We deliver to all major cities and towns in Zimbabwe including Harare, Bulawayo, Mutare, Gweru, Kwekwe, Kadoma, Masvingo, and surrounding areas. For remote locations, delivery might take additional time or require collection from the nearest depot.'
        },
        {
          question: 'How does door-to-door delivery work in Zimbabwe?',
          answer: 'Our door-to-door service delivers your shipment directly to your recipient\'s address in Zimbabwe. We contact the recipient to inform them about the delivery day. A small additional fee applies for this service.'
        },
        {
          question: 'What happens if no one is available to receive the delivery?',
          answer: 'If no one is available at the delivery address, our driver will leave a notification and attempt delivery once more. After two failed attempts, the shipment will be held at our nearest depot for collection. You can also add or change the receiptant if the main receiptant is not available this is done by contacting support.'
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
      icon: <AlertTriangle className="h-5 w-5 text-zim-red" />,
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
          answer: 'We handle standard customs clearance procedures as part of our service. Our dedicated customs team in Zimbabwe processes documentation and works to ensure smooth clearance. For complex shipments or commercial goods, additional services may be required.'
        },
        {
          question: 'What happens if my shipment is held by customs?',
          answer: 'If your shipment is held for inspection or requires additional documentation, our customs team will contact you or your recipient promptly with instructions. Most issues can be resolved quickly with proper documentation or clarification.'
        }
      ]
    },
    {
      id: 'business',
      title: 'Business Shipping',
      icon: <Clock className="h-5 w-5 text-zim-green" />,
      questions: [
        {
          question: 'Do you offer special rates for businesses?',
          answer: 'Yes, we offer competitive rates for businesses with regular shipping needs. Volume discounts, account management, and customized shipping solutions are available. Contact our business team for a tailored quote.'
        },
        {
          question: 'What additional services do you provide for business customers?',
          answer: 'Business customers benefit from dedicated account management, bulk shipping discounts, extended payment terms, customized reporting, and priority handling. We also offer specialized services for specific industry requirements.'
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
      icon: <HelpCircle className="h-5 w-5 text-zim-yellow" />,
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
          answer: 'Drum shipping involves sending items in a large 200L - 220L drums, ideal for multiple items or bulky goods. Other items involves small parcels to palletes and is charged by volume/size/value. Drum shipping is more cost-effective for larger volumes, while parcel shipping may be better for smaller, urgent shipments.'
        },
        {
          question: 'Do you offer any assistance with packing?',
          answer: 'We don\'t offer packing services at your location, however we consider elderly people who are unable package bigger items or home removal at an additional cost (rate per hour). We provide comprehensive packing guidelines on our website. For drum shipping, we can provide drums for an additional fee if you don\'t have your own.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Find answers to common questions about our UK to Zimbabwe shipping services. If you can't find what you're looking for, please contact our support team.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 mb-12">
            <div className="md:w-1/4">
              <div className="bg-white rounded-lg shadow p-4 sticky top-20">
                <h3 className="font-bold text-lg mb-4">Categories</h3>
                <nav className="space-y-2">
                  {faqCategories.map((category) => (
                    <a 
                      key={category.id}
                      href={`#${category.id}`}
                      className="flex items-center p-2 hover:bg-gray-100 rounded transition-colors"
                    >
                      {category.icon}
                      <span className="ml-2">{category.title}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </div>
            
            <div className="md:w-3/4">
              {faqCategories.map((category) => (
                <div key={category.id} id={category.id} className="mb-10 scroll-mt-20">
                  <Card className="border-t-4 border-t-zim-green">
                    <CardContent className="pt-6">
                      <h2 className="text-2xl font-bold mb-6 flex items-center">
                        {category.icon}
                        <span className="ml-2">{category.title} Questions</span>
                      </h2>
                      
                      <Accordion type="single" collapsible className="space-y-4">
                        {category.questions.map((faq, index) => (
                          <AccordionItem key={index} value={`${category.id}-${index}`} className="border rounded-md shadow-sm px-4">
                            <AccordionTrigger className="text-left font-medium py-4">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 text-gray-600">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
