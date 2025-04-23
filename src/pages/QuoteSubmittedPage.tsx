
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, MessageSquare } from 'lucide-react';

const QuoteSubmittedPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set page title
    document.title = 'Quote Submitted | UK to Zimbabwe Shipping';
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Custom Quote Request Submitted
              </h1>
              <p className="text-lg text-gray-600">
                Thank you for submitting your custom quote request.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">What happens next?</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zim-green text-white flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Our team will review your request</p>
                    <p className="text-gray-600 text-sm">
                      We'll carefully assess the details you've provided to prepare your custom quote.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zim-green text-white flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">You'll receive a quote within 24 hours</p>
                    <p className="text-gray-600 text-sm">
                      We aim to respond quickly with an accurate quote for your shipment.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zim-green text-white flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Review and accept the quote</p>
                    <p className="text-gray-600 text-sm">
                      Once you receive the quote, you can review and accept it to proceed with payment.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zim-green text-white flex items-center justify-center font-semibold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Complete payment and arrange shipping</p>
                    <p className="text-gray-600 text-sm">
                      After payment, we'll arrange for collection and shipping of your items.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-5 mb-8">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Questions about your request?</h3>
                  <p className="text-blue-800 text-sm">
                    If you have any questions or need to update your request, please contact our support team.
                    You can also check your quote status in your customer dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                Return to Home
              </Button>
              <Button
                className="bg-zim-green hover:bg-zim-green/90"
                onClick={() => navigate('/dashboard')}
              >
                <span>View Dashboard</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default QuoteSubmittedPage;
