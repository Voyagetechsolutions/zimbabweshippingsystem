
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';
import { Shipment } from '@/types/shipment';
import { supabase } from '@/integrations/supabase/client';

interface ShipmentExporterProps {
  shipments?: Shipment[];
}

// Helper function to convert shipments to CSV
const convertToCSV = (shipments: Shipment[]) => {
  // Get all possible headers from the shipments
  const headers = ['tracking_number', 'status', 'origin', 'destination', 'created_at'];
  
  // Create CSV header row
  let csv = headers.join(',') + '\n';
  
  // Add each shipment as a row
  shipments.forEach(shipment => {
    const row = headers.map(header => {
      // Handle nested properties in metadata
      if (header === 'recipient_name' && shipment.metadata?.recipientDetails?.name) {
        return `"${shipment.metadata.recipientDetails.name}"`;
      }
      if (header === 'sender_name' && shipment.metadata?.senderDetails?.name) {
        return `"${shipment.metadata.senderDetails.name}"`;
      }
      
      // Handle direct properties
      const value = shipment[header as keyof Shipment];
      // Wrap strings in quotes and handle null/undefined
      return typeof value === 'string' ? `"${value}"` : (value || '');
    });
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
};

// Helper function to convert shipments to JSON
const convertToJSON = (shipments: Shipment[]) => {
  return JSON.stringify(shipments, null, 2);
};

const ShipmentExporter: React.FC<ShipmentExporterProps> = ({ shipments = [] }) => {
  const [open, setOpen] = useState(false);
  
  const handleExportCSV = () => {
    const csv = convertToCSV(shipments);
    downloadFile(csv, 'zimbabwe-shipping-export.csv', 'text/csv');
    setOpen(false);
  };
  
  const handleExportJSON = () => {
    const json = convertToJSON(shipments);
    downloadFile(json, 'zimbabwe-shipping-export.json', 'application/json');
    setOpen(false);
  };
  
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Shipments</DialogTitle>
          <DialogDescription>
            Choose the format you want to export your shipment data in.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2"
            onClick={handleExportCSV}
          >
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <span>CSV Format</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2"
            onClick={handleExportJSON}
          >
            <FileJson className="h-8 w-8 text-blue-600" />
            <span>JSON Format</span>
          </Button>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShipmentExporter;
