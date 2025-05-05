
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, File, ChevronDown } from 'lucide-react';
import { formatDate } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { exportToCsv, exportToPdf } from '@/utils/exportUtils';

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
        await exportToCsv(data, toast);
      } else {
        await exportToPdf(data, toast);
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
            <File className="h-4 w-4" />
            <span>Export to PDF</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShipmentExporter;
