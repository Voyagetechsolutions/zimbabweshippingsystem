
import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Clock } from 'lucide-react';

interface QuoteData {
  id: string;
  description: string;
  phone_number: string;
  created_at: string;
}

const QuoteSubmitted = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const quoteData = location.state?.quoteData as QuoteData;
  
  // Format the date nicely
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', 
      month: 'long', 
      year: 'numeric'
    });
  };
  
  // Redirect if no quote data is available
  React.useEffect(() => {
    if (!quoteData) {
      navigate('/custom-quote-new', { replace: true });
    }
  }, [quoteData, navigate]);
  
  if (!quoteData) {
    return null;
  }

  return (
    <div className="container max-w-lg mx-auto py-10 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-100 w-16 h-16 flex items-center justify-center rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Quote Request Submitted!</CardTitle>
          <CardDescription>
            Your custom quote request was successfully received.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-t border-b py-4">
            <h3 className="font-medium mb-2">Request Details:</h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Reference ID:</strong> {quoteData.id.substring(0, 8)}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Submitted:</strong> {formatDate(quoteData.created_at)}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Contact Number:</strong> {quoteData.phone_number}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Description:</strong> {quoteData.description.substring(0, 100)}
              {quoteData.description.length > 100 ? '...' : ''}
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md flex items-start">
            <Clock className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 mb-1">What happens next?</h4>
              <p className="text-sm text-blue-700">
                Our team will review your request and provide a quote within 24 hours.
                You'll be notified when your quote is ready to view in your dashboard.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            className="w-full" 
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Link to="/" className="text-sm text-center text-gray-500 hover:text-gray-700">
            Return to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default QuoteSubmitted;
