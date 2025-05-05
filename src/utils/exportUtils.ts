
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

// Helper function to convert data to CSV format
export const exportToCsv = async (data: any[], toast: any) => {
  try {
    if (!data.length) {
      toast({
        title: 'No data to export',
        description: 'There is no data available to export.',
        variant: 'destructive',
      });
      return;
    }

    // Convert the data to CSV format
    const headers = Object.keys(data[0]).map(key => key.replace(/_/g, ' ').toUpperCase());
    const csvRows = [headers];

    for (const item of data) {
      const values = headers.map(header => {
        const key = header.toLowerCase().replace(/ /g, '_');
        let value = item[key];
        
        // Format dates
        if (key.includes('date') || key.includes('created_at') || key.includes('updated_at')) {
          if (value) {
            value = format(new Date(value), 'yyyy-MM-dd HH:mm');
          }
        }
        
        // Ensure string is wrapped in quotes if it contains commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        
        return value || '';
      });
      
      csvRows.push(values);
    }

    // Join rows with newlines and create a Blob
    const csvString = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
    
    // Generate filename with date
    const filename = `shipments_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    // Save the file
    saveAs(blob, filename);
    
    toast({
      title: 'Export Successful',
      description: `Data has been exported to ${filename}`,
    });
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    toast({
      title: 'Export Failed',
      description: 'There was an error exporting your data to CSV.',
      variant: 'destructive',
    });
  }
};

// Helper function to convert data to PDF format
export const exportToPdf = async (data: any[], toast: any) => {
  try {
    if (!data.length) {
      toast({
        title: 'No data to export',
        description: 'There is no data available to export.',
        variant: 'destructive',
      });
      return;
    }

    // Create new PDF document
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text('Shipments Export', 15, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 15, 22);
    
    // Define table columns
    const columns = [
      'Tracking Number', 
      'Status', 
      'Origin', 
      'Destination', 
      'Created'
    ];
    
    // Prepare data rows
    const rows = data.map(item => [
      item.tracking_number || '-',
      (item.status || '-').replace(/_/g, ' '),
      item.origin || '-',
      item.destination || '-',
      item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd') : '-'
    ]);
    
    // Add table
    doc.autoTable({
      head: [columns],
      body: rows,
      startY: 30,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [0, 100, 0]
      }
    });
    
    // Generate filename with date
    const filename = `shipments_export_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    toast({
      title: 'Export Successful',
      description: `Data has been exported to ${filename}`,
    });
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    toast({
      title: 'Export Failed',
      description: 'There was an error exporting your data to PDF.',
      variant: 'destructive',
    });
  }
};
