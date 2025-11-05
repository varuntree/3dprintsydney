'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DollarSign, Loader2, AlertTriangle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { removeCreditSchema, type RemoveCreditInput } from '@/lib/schemas/clients';
import { formatCurrency } from '@/lib/currency';

interface RemoveCreditModalProps {
  clientId: number;
  clientName: string;
  currentBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemoveCreditModal({
  clientId,
  clientName,
  currentBalance,
  open,
  onOpenChange,
}: RemoveCreditModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<RemoveCreditInput>({
    resolver: zodResolver(removeCreditSchema),
    defaultValues: {
      amount: 0,
      reason: 'adjustment',
      notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: RemoveCreditInput) => {
      const res = await fetch(`/api/clients/${clientId}/credit`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to remove credit');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Credit removed successfully! New balance: ${formatCurrency(data.data.newBalance)}`);
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove credit');
    },
  });

  const watchAmount = form.watch('amount');
  const projectedBalance = currentBalance - (watchAmount || 0);
  const insufficientBalance = projectedBalance < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Credit from {clientName}</DialogTitle>
          <DialogDescription>
            Deduct credit from client&apos;s wallet balance
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            {/* Current Balance Display */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Balance</span>
                <span className="text-lg font-semibold">{formatCurrency(currentBalance)}</span>
              </div>
              {watchAmount > 0 && (
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-sm text-muted-foreground">After Removal</span>
                  <span className={`text-lg font-semibold ${insufficientBalance ? 'text-red-600' : 'text-orange-600'}`}>
                    {formatCurrency(projectedBalance)}
                  </span>
                </div>
              )}
            </div>

            {/* Insufficient Balance Warning */}
            {insufficientBalance && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Insufficient balance</p>
                  <p className="text-xs mt-1">
                    Cannot remove more than the current balance. Maximum: {formatCurrency(currentBalance)}
                  </p>
                </div>
              </div>
            )}

            {/* Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to Remove</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={currentBalance}
                        placeholder="0.00"
                        className="pl-9"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Amount to deduct from wallet (max: {formatCurrency(currentBalance)})</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason Field */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="overpayment">Overpayment Correction</SelectItem>
                      <SelectItem value="error">Error Correction</SelectItem>
                      <SelectItem value="chargeback">Chargeback</SelectItem>
                      <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for removing credit..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={mutation.isPending || insufficientBalance}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove Credit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
