
import { Button } from "@/components/ui/button";
import { Shipment } from "@/types/shipment";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';

interface ShipmentExporterProps {
  shipments: Shipment[];
  isLoading?: boolean;
}

const ShipmentExporter: React.FC<ShipmentExporterProps> = ({
  shipments,
  isLoading = false
}) => {
  const exportToExcel = () => {
    if (!shipments || shipments.length === 0) {
      console.error('No shipments to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      shipments.map(shipment => {
        // Extract metadata fields
        const metadata = shipment.metadata as any || {};
        
        return {
          'Tracking Number': shipment.tracking_number,
          'Status': shipment.status,
          'Origin': shipment.origin,
          'Destination': shipment.destination,
          'Created Date': new Date(shipment.created_at).toLocaleDateString(),
          'Sender Name': metadata.firstName ? `${metadata.firstName} ${metadata.lastName || ''}` : 'N/A',
          'Sender Email': metadata.email || 'N/A',
          'Sender Phone': metadata.phone || 'N/A',
          'Recipient Name': metadata.recipientName || 'N/A',
          'Recipient Phone': metadata.recipientPhone || 'N/A',
          'Shipment Type': metadata.includeDrums ? 'Drum' : (metadata.includeOtherItems ? 'Other Item' : 'N/A'),
          'Drums Quantity': metadata.drumQuantity || 'N/A',
          'Item Description': metadata.otherItemDescription || 'N/A',
          'Payment Method': metadata.paymentOption || 'N/A',
          'Amount Paid': metadata.amountPaid ? `£${metadata.amountPaid}` : 'N/A',
        };
      })
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Shipments');
    XLSX.writeFile(workbook, `shipments_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToCSV = () => {
    if (!shipments || shipments.length === 0) {
      console.error('No shipments to export');
      return;
    }

    const csvRows = [];
    
    // Header row
    const headers = [
      'Tracking Number', 'Status', 'Origin', 'Destination', 'Created Date',
      'Sender Name', 'Sender Email', 'Sender Phone', 'Recipient Name', 'Recipient Phone',
      'Shipment Type', 'Drums Quantity', 'Item Description', 'Payment Method', 'Amount Paid'
    ];
    csvRows.push(headers.join(','));
    
    // Data rows
    for (const shipment of shipments) {
      const metadata = shipment.metadata as any || {};
      const row = [
        `"${shipment.tracking_number}"`,
        `"${shipment.status}"`,
        `"${shipment.origin}"`,
        `"${shipment.destination}"`,
        `"${new Date(shipment.created_at).toLocaleDateString()}"`,
        `"${metadata.firstName ? `${metadata.firstName} ${metadata.lastName || ''}` : 'N/A'}"`,
        `"${metadata.email || 'N/A'}"`,
        `"${metadata.phone || 'N/A'}"`,
        `"${metadata.recipientName || 'N/A'}"`,
        `"${metadata.recipientPhone || 'N/A'}"`,
        `"${metadata.includeDrums ? 'Drum' : (metadata.includeOtherItems ? 'Other Item' : 'N/A')}"`,
        `"${metadata.drumQuantity || 'N/A'}"`,
        `"${metadata.otherItemDescription || 'N/A'}"`,
        `"${metadata.paymentOption || 'N/A'}"`,
        `"${metadata.amountPaid ? `£${metadata.amountPaid}` : 'N/A'}"`
      ];
      csvRows.push(row.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `shipments_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToExcel}
        disabled={isLoading || !shipments || shipments.length === 0}
        className="flex items-center gap-1"
      >
        <Download className="h-4 w-4" />
        Export Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToCSV}
        disabled={isLoading || !shipments || shipments.length === 0}
        className="flex items-center gap-1"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
};

export default ShipmentExporter;
