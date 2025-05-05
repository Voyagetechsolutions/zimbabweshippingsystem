import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CSVLink } from 'react-csv';
import { Button } from "@/components/ui/button";
import { tableFrom } from '@/integrations/supabase/db-types';
import { castToShipments } from '@/utils/shipmentUtils';

const AdminDashboardContent: React.FC = () => {
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);

  useEffect(() => {
    const fetchRecentShipments = async () => {
      try {
        const { data, error } = await supabase
          .from(tableFrom('shipments'))
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        
        if (data) {
          // Convert to Shipment[] with metadata extracted
          const shipmentData = castToShipments(data);
          setShipments(shipmentData);
        }
      } catch (error) {
        console.error('Error fetching recent shipments:', error);
        setError('Failed to fetch recent shipments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentShipments();
  }, []);
  
  // Update exportShipments function to use the async/await properly
  const exportShipments = async () => {
    // Set loading state before starting the export process
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from(tableFrom('shipments'))
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        const shipmentData = castToShipments(data);
        // Then use the shipmentData array for your export logic
        const shipmentsCsv = shipmentData.map(shipment => ({
          ID: shipment.id,
          TrackingNumber: shipment.tracking_number,
          Origin: shipment.origin,
          Destination: shipment.destination,
          Status: shipment.status,
          CreatedAt: shipment.created_at,
          UpdatedAt: shipment.updated_at,
          Carrier: shipment.carrier || '',
          Weight: shipment.weight || '',
          Dimensions: shipment.dimensions || '',
          EstimatedDelivery: shipment.estimated_delivery || '',
        }));
        
        setCsvData(shipmentsCsv);
      }
    } catch (error) {
      console.error('Error exporting shipments:', error);
      setError('Failed to export shipments');
    } finally {
      setIsLoading(false);
    }
  };
  
  const csvHeaders = [
    { label: 'ID', key: 'ID' },
    { label: 'Tracking Number', key: 'TrackingNumber' },
    { label: 'Origin', key: 'Origin' },
    { label: 'Destination', key: 'Destination' },
    { label: 'Status', key: 'Status' },
    { label: 'Created At', key: 'CreatedAt' },
    { label: 'Updated At', key: 'UpdatedAt' },
    { label: 'Carrier', key: 'Carrier' },
    { label: 'Weight', key: 'Weight' },
    { label: 'Dimensions', key: 'Dimensions' },
    { label: 'Estimated Delivery', key: 'EstimatedDelivery' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Recent Shipments</h2>
        {isLoading ? (
          <p>Loading shipments...</p>
        ) : (
          <ul className="list-disc pl-5">
            {shipments.map((shipment: any) => (
              <li key={shipment.id}>
                Tracking Number: {shipment.tracking_number}, Status: {shipment.status}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div>
        <Button onClick={exportShipments} disabled={isLoading}>
          {isLoading ? 'Exporting...' : 'Export Shipments to CSV'}
        </Button>
        {csvData.length > 0 && (
          <CSVLink data={csvData} headers={csvHeaders} filename={"shipments.csv"} className="ml-2">
            Download CSV
          </CSVLink>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardContent;
