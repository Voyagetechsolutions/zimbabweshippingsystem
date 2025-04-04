
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TaskManagement from '@/components/admin/TaskManagement';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const TaskManagementPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  // Redirect if not logged in or not an admin
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Task Management</h1>
        <TaskManagement />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default TaskManagementPage;
