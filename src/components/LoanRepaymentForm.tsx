import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

interface LoanRepaymentFormProps {
  selfEmpowermentId: string;
  applicantName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LoanRepaymentForm({ selfEmpowermentId, applicantName, onSuccess, onCancel }: LoanRepaymentFormProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    repayment_date: new Date().toISOString().split('T')[0],
    amount_paid: "",
    payment_method: "",
    reference_number: "",
    notes: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentOrganization?.organization_id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('loan_repayments')
        .insert({
          self_empowerment_id: selfEmpowermentId,
          repayment_date: formData.repayment_date,
          amount_paid: parseFloat(formData.amount_paid),
          payment_method: formData.payment_method || null,
          reference_number: formData.reference_number || null,
          notes: formData.notes || null,
          organization_id: currentOrganization.organization_id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Loan repayment recorded successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error recording loan repayment:', error);
      toast({
        title: "Error",
        description: "Failed to record loan repayment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-[80vh]">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Recording repayment for: {applicantName}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="repayment_date">Repayment Date *</Label>
            <Input
              id="repayment_date"
              type="date"
              value={formData.repayment_date}
              onChange={(e) => handleInputChange('repayment_date', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="amount_paid">Amount Paid (KSH) *</Label>
            <Input
              id="amount_paid"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount_paid}
              onChange={(e) => handleInputChange('amount_paid', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => handleInputChange('reference_number', e.target.value)}
              placeholder="e.g., M-Pesa transaction ID"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this repayment..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Recording..." : "Record Repayment"}
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
}