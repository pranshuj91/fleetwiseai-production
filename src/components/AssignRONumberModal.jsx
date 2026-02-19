import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Hash, Loader2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

const AssignRONumberModal = ({ isOpen, onClose, workOrder, onSuccess }) => {
  const [roNumber, setRoNumber] = useState(workOrder?.work_order_number || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!roNumber.trim()) {
      toast.error('Please enter an RO number');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ work_order_number: roNumber.trim() })
        .eq('id', workOrder.id);

      if (error) throw error;

      toast.success(`RO Number "${roNumber}" assigned successfully!`);
      onSuccess?.(roNumber.trim());
      onClose();
    } catch (error) {
      console.error('Error assigning RO number:', error);
      toast.error('Failed to assign RO number');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] z-50 bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Hash className="mr-2 h-5 w-5 text-[#289790]" />
            Assign RO Number
          </DialogTitle>
          <DialogDescription>
            Enter the official Repair Order number from your Enrich system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ro-number">RO Number</Label>
              <Input
                id="ro-number"
                value={roNumber}
                onChange={(e) => setRoNumber(e.target.value)}
                placeholder="e.g., RO-2024-001234"
                className="text-lg"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                This number will be used to link this work order to the official repair order.
              </p>
            </div>

            {workOrder?.work_order_number && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Current RO Number:</strong> {workOrder.work_order_number}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Saving will overwrite the existing RO number.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !roNumber.trim()}
              className="bg-[#289790] hover:bg-[#289790]/90"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                'Assign RO Number'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignRONumberModal;
