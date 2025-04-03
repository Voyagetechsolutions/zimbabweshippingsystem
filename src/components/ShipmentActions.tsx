
import React, { useState } from 'react';
import { Edit2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShipmentActionsProps {
  shipmentId: string;
  canModify: boolean | null;
  canCancel: boolean | null;
  onActionComplete: () => void;
}

const ShipmentActions: React.FC<ShipmentActionsProps> = ({
  shipmentId,
  canModify,
  canCancel,
  onActionComplete,
}) => {
  const { toast } = useToast();
  const [isCancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleModify = () => {
    // Redirect to the edit shipment page
    window.location.href = `/create-shipment?edit=${shipmentId}`;
  };

  const handleCancelShipment = async () => {
    try {
      setIsLoading(true);
      
      // Update the shipment status to cancelled
      const { error } = await supabase
        .from('shipments')
        .update({
          status: 'Cancelled',
          can_modify: false,
          can_cancel: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipmentId);

      if (error) throw error;

      // Create a notification for the user about the cancellation
      const { error: notificationError } = await (supabase
        .from('notifications' as any)
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title: 'Shipment Cancelled',
          message: 'Your shipment has been successfully cancelled.',
          type: 'shipment_update',
          related_id: shipmentId,
        }) as any);

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      toast({
        title: 'Shipment Cancelled',
        description: 'Your shipment has been cancelled successfully.',
      });
      
      setCancelDialogOpen(false);
      onActionComplete();
    } catch (error: any) {
      console.error('Error cancelling shipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel shipment. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex space-x-2">
        {canModify && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={handleModify}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Modify
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setCancelDialogOpen(true)}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>

      <Dialog open={isCancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle>Cancel Shipment</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to cancel this shipment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isLoading}
            >
              Keep Shipment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelShipment}
              disabled={isLoading}
            >
              {isLoading ? 'Cancelling...' : 'Yes, Cancel Shipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShipmentActions;
