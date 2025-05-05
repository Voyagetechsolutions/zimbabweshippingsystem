
import React, { useEffect } from 'react';
import { useLocation, Link } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mb-6">
          <div className="relative inline-block">
            <div className="text-9xl font-bold text-gray-200">404</div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
            </div>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Page Not Found</h1>
        <p className="text-xl text-gray-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link to="/" className="flex items-center">
              <Home className="mr-2 h-5 w-5" /> Go Home
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()} className="flex items-center justify-center">
            <ArrowLeft className="mr-2 h-5 w-5" /> Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
