
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, FilePdf, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShipmentExporterProps {
  shipmentIds?: string[];
  all?: boolean;
}

const ShipmentExporter = ({ shipmentIds, all = false }: ShipmentExporterProps) => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    
    try {
      // Get the shipments data
      let query = supabase.from('shipments').select(`
        id,
        tracking_number,
        status,
        origin,
        destination,
        weight,
        dimensions,
        carrier,
        created_at,
        estimated_delivery
      `);
      
      // Filter by IDs if provided, otherwise get all user's shipments
      if (shipmentIds && shipmentIds.length > 0) {
        query = query.in('id', shipmentIds);
      } else if (!all) {
        // Get current user's ID
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        query = query.eq('user_id', session.user.id);
      }
      
      // Execute query
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast({
          title: 'No shipments found',
          description: 'There are no shipments to export.',
          variant: 'destructive',
        });
        return;
      }
      
      if (format === 'csv') {
        // Convert data to CSV
        const headers = [
          'Tracking Number',
          'Status',
          'Origin',
          'Destination',
          'Weight (kg)',
          'Dimensions',
          'Carrier',
          'Created Date',
          'Estimated Delivery'
        ];
        
        const csvRows = [
          headers.join(','),
          ...data.map(shipment => [
            `"${shipment.tracking_number}"`,
            `"${shipment.status}"`,
            `"${shipment.origin}"`,
            `"${shipment.destination}"`,
            shipment.weight,
            `"${shipment.dimensions || ''}"`,
            `"${shipment.carrier || ''}"`,
            shipment.created_at ? format(new Date(shipment.created_at), 'yyyy-MM-dd') : '',
            shipment.estimated_delivery ? format(new Date(shipment.estimated_delivery), 'yyyy-MM-dd') : ''
          ].join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        
        // Create and download the CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `shipments_export_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: 'Export successful',
          description: 'Your shipments have been exported to CSV.',
        });
      } else {
        // For PDF, we need to dynamically import html2pdf
        const html2pdf = await import('html2pdf.js');
        
        // Create a temporary HTML table
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        // Add table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Tracking Number', 'Status', 'Origin', 'Destination', 'Details', 'Date'].forEach(text => {
          const th = document.createElement('th');
          th.textContent = text;
          th.style.border = '1px solid #ddd';
          th.style.padding = '8px';
          th.style.backgroundColor = '#f2f2f2';
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Add table body
        const tbody = document.createElement('tbody');
        data.forEach(shipment => {
          const row = document.createElement('tr');
          
          // Tracking Number
          const tdTracking = document.createElement('td');
          tdTracking.textContent = shipment.tracking_number;
          tdTracking.style.border = '1px solid #ddd';
          tdTracking.style.padding = '8px';
          row.appendChild(tdTracking);
          
          // Status
          const tdStatus = document.createElement('td');
          tdStatus.textContent = shipment.status;
          tdStatus.style.border = '1px solid #ddd';
          tdStatus.style.padding = '8px';
          row.appendChild(tdStatus);
          
          // Origin
          const tdOrigin = document.createElement('td');
          tdOrigin.textContent = shipment.origin;
          tdOrigin.style.border = '1px solid #ddd';
          tdOrigin.style.padding = '8px';
          row.appendChild(tdOrigin);
          
          // Destination
          const tdDestination = document.createElement('td');
          tdDestination.textContent = shipment.destination;
          tdDestination.style.border = '1px solid #ddd';
          tdDestination.style.padding = '8px';
          row.appendChild(tdDestination);
          
          // Details (weight, dimensions, carrier)
          const tdDetails = document.createElement('td');
          tdDetails.innerHTML = `
            <strong>Weight:</strong> ${shipment.weight || 'N/A'} kg<br>
            <strong>Dimensions:</strong> ${shipment.dimensions || 'N/A'}<br>
            <strong>Carrier:</strong> ${shipment.carrier || 'N/A'}
          `;
          tdDetails.style.border = '1px solid #ddd';
          tdDetails.style.padding = '8px';
          row.appendChild(tdDetails);
          
          // Date
          const tdDate = document.createElement('td');
          tdDate.innerHTML = `
            <strong>Created:</strong> ${shipment.created_at ? format(new Date(shipment.created_at), 'yyyy-MM-dd') : 'N/A'}<br>
            <strong>Delivery:</strong> ${shipment.estimated_delivery ? format(new Date(shipment.estimated_delivery), 'yyyy-MM-dd') : 'N/A'}
          `;
          tdDate.style.border = '1px solid #ddd';
          tdDate.style.padding = '8px';
          row.appendChild(tdDate);
          
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        // Create a container with header
        const container = document.createElement('div');
        
        const header = document.createElement('div');
        header.style.textAlign = 'center';
        header.style.marginBottom = '20px';
        
        const title = document.createElement('h1');
        title.textContent = 'Zimbabwe Shipping - Shipments Report';
        title.style.color = '#2D3748';
        header.appendChild(title);
        
        const subtitle = document.createElement('p');
        subtitle.textContent = `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`;
        subtitle.style.color = '#718096';
        header.appendChild(subtitle);
        
        container.appendChild(header);
        container.appendChild(table);
        
        // Generate PDF
        const opt = {
          margin: 10,
          filename: `shipments_export_${format(new Date(), 'yyyyMMdd')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        
        await html2pdf.default().from(container).set(opt).save();
        
        toast({
          title: 'Export successful',
          description: 'Your shipments have been exported to PDF.',
        });
      }
    } catch (error) {
      console.error('Error exporting shipments:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your shipments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          disabled={exporting}
        >
          <Download className="h-4 w-4" />
          Export
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            className="flex items-center justify-start gap-2 rounded-none h-10"
            onClick={() => handleExport('csv')}
            disabled={exporting}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export to CSV</span>
          </Button>
          <Button
            variant="ghost"
            className="flex items-center justify-start gap-2 rounded-none h-10"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
          >
            <FilePdf className="h-4 w-4" />
            <span>Export to PDF</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShipmentExporter;
