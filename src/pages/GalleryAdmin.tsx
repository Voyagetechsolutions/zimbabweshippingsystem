
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import GalleryManagement from '@/components/admin/GalleryManagement';

const GalleryAdmin = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-10 max-w-7xl">
          <h1 className="text-4xl font-bold mb-2">Gallery Administration</h1>
          <p className="text-gray-600 mb-6">
            Manage gallery images for the website.
          </p>
          <Separator className="my-6" />
          
          <GalleryManagement />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GalleryAdmin;
