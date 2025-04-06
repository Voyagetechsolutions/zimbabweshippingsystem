
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Placeholder component that redirects to the full admin dashboard
const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-4">Admin Dashboard</h2>
          <p className="text-gray-600 mb-6">
            For full admin functionality, please use the complete admin dashboard.
          </p>
          <Button 
            onClick={() => navigate('/admin')}
            className="bg-zim-green hover:bg-zim-green/90"
          >
            Go to Admin Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
