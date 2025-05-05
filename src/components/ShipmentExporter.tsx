import React from 'react';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Shipment } from '@/types/shipment';
import { castToShipments } from '@/types/shipment';

interface ShipmentExporterProps {
  shipments: Shipment[] | null;
}

const ShipmentExporter: React.FC<ShipmentExporterProps> = ({ shipments }) => {
  const csvData = () => {
    if (!shipments || shipments.length === 0) return [];

    return shipments.map(shipment => ({
      ID: shipment.id,
      'Tracking Number': shipment.tracking_number,
      Origin: shipment.origin,
      Destination: shipment.destination,
      Status: shipment.status,
      'Created At': shipment.created_at,
      'Updated At': shipment.updated_at,
      'User ID': shipment.user_id || 'N/A',
      'Can Cancel': shipment.can_cancel ? 'Yes' : 'No',
      'Can Modify': shipment.can_modify ? 'Yes' : 'No',
      Carrier: shipment.carrier || 'N/A',
      Dimensions: shipment.dimensions || 'N/A',
      'Estimated Delivery': shipment.estimated_delivery || 'N/A',
      Weight: shipment.weight || 'N/A',
      'Customer Email': shipment.profiles?.email || 'N/A',
      'Customer Name': shipment.profiles?.full_name || 'N/A'
    }));
  };

  const headers = [
    { label: 'ID', key: 'ID' },
    { label: 'Tracking Number', key: 'Tracking Number' },
    { label: 'Origin', key: 'Origin' },
    { label: 'Destination', key: 'Destination' },
    { label: 'Status', key: 'Status' },
    { label: 'Created At', key: 'Created At' },
    { label: 'Updated At', key: 'Updated At' },
    { label: 'User ID', key: 'User ID' },
    { label: 'Can Cancel', key: 'Can Cancel' },
    { label: 'Can Modify', key: 'Can Modify' },
    { label: 'Carrier', key: 'Carrier' },
    { label: 'Dimensions', key: 'Dimensions' },
    { label: 'Estimated Delivery', key: 'Estimated Delivery' },
    { label: 'Weight', key: 'Weight' },
    { label: 'Customer Email', key: 'Customer Email' },
    { label: 'Customer Name', key: 'Customer Name' }
  ];

  const csvReport = {
    data: csvData(),
    headers: headers,
    filename: 'ShipmentData.csv'
  };

  const exportToCSV = () => {
    if (shipments && shipments.length > 0) {
      // Make sure we're working with proper Shipment objects
      const validShipments = castToShipments(shipments);
      
      const csvString = [
        headers.map(header => header.label).join(','), // CSV headers
        ...validShipments.map(shipment => [
          shipment.id,
          shipment.tracking_number,
          shipment.origin,
          shipment.destination,
          shipment.status,
          shipment.created_at,
          shipment.updated_at,
          shipment.user_id || 'N/A',
          shipment.can_cancel ? 'Yes' : 'No',
          shipment.can_modify ? 'Yes' : 'No',
          shipment.carrier || 'N/A',
          shipment.dimensions || 'N/A',
          shipment.estimated_delivery || 'N/A',
          shipment.weight || 'N/A',
          shipment.profiles?.email || 'N/A',
          shipment.profiles?.full_name || 'N/A'
        ].join(',')) // CSV rows
      ].join('\r\n');
  
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', 'ShipmentData.csv');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const exportToExcel = () => {
    if (shipments && shipments.length > 0) {
      // Make sure we're working with proper Shipment objects
      const validShipments = castToShipments(shipments);
  
      const data = validShipments.map(shipment => ({
        ID: shipment.id,
        'Tracking Number': shipment.tracking_number,
        Origin: shipment.origin,
        Destination: shipment.destination,
        Status: shipment.status,
        'Created At': shipment.created_at,
        'Updated At': shipment.updated_at,
        'User ID': shipment.user_id || 'N/A',
        'Can Cancel': shipment.can_cancel ? 'Yes' : 'No',
        'Can Modify': shipment.can_modify ? 'Yes' : 'No',
        Carrier: shipment.carrier || 'N/A',
        Dimensions: shipment.dimensions || 'N/A',
        'Estimated Delivery': shipment.estimated_delivery || 'N/A',
        Weight: shipment.weight || 'N/A',
        'Customer Email': shipment.profiles?.email || 'N/A',
        'Customer Name': shipment.profiles?.full_name || 'N/A'
      }));
  
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Shipments');
      XLSX.writeFile(workbook, 'ShipmentData.xlsx');
    }
  };

  return (
    <div className="flex space-x-2">
      <Button variant="outline" onClick={exportToCSV}>
        <Download className="mr-2 h-4 w-4" />
        Export to CSV
      </Button>
      <Button variant="outline" onClick={exportToExcel}>
        <Download className="mr-2 h-4 w-4" />
        Export to Excel
      </Button>
    </div>
  );
};

export default ShipmentExporter;
