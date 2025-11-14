'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DollarSign, Loader2 } from 'lucide-react';

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
import { creditAdjustmentSchema, type CreditAdjustmentInput } from '@/lib/schemas/clients';
import { formatCurrency } from '@/lib/currency';
import { getUserMessage } from '@/lib/errors/user-messages';

interface AddCreditModalProps {
  clientId: number;
  clientName: string;
  currentBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCreditModal({
  clientId,
  clientName,
  currentBalance,
  open,
  onOpenChange,
}: AddCreditModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<CreditAdjustmentInput>({
    resolver: zodResolver(creditAdjustmentSchema),
    defaultValues: {
      amount: 0,
      reason: 'initial_credit',
      notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: CreditAdjustmentInput) => {
      const res = await fetch(`/api/clients/${clientId}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add credit');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Credit added successfully! New balance: ${formatCurrency(data.data.newBalance)}`);
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(getUserMessage(error));
    },
  });

  const watchAmount = form.watch('amount');
  const projectedBalance = currentBalance + (watchAmount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credit to {clientName}</DialogTitle>
          <DialogDescription>
            Add monetary credit to client&apos;s wallet for future projects
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
                  <span className="text-sm text-muted-foreground">After Credit</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatCurrency(projectedBalance)}
                  </span>
                </div>
              )}
            </div>

            {/* Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        className="pl-9"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Amount to add to wallet</FormDescription>
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
                      <SelectItem value="initial_credit">Initial Credit</SelectItem>
                      <SelectItem value="adjustment">Account Adjustment</SelectItem>
                      <SelectItem value="promotion">Promotional Credit</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
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
                      placeholder="Additional notes about this credit..."
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
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Credit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
