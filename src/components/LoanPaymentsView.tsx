import { useState, useEffect } from "react";
import { Eye, Calendar, Coins, Receipt, Download } from "lucide-react";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface LoanPaymentsViewProps {
  selfEmpowermentRecord: any;
}

interface PaymentRecord {
  id: string;
  repayment_date: string;
  amount_paid: number;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
}

export const LoanPaymentsView = ({ selfEmpowermentRecord }: LoanPaymentsViewProps) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin, isManagement } = useAuth();

  const fetchPayments = async () => {
    if (!selfEmpowermentRecord?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loan_repayments')
        .select('*')
        .eq('self_empowerment_id', selfEmpowermentRecord.id)
        .order('repayment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payment history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPayments();
    }
  }, [isOpen, selfEmpowermentRecord?.id]);

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount_paid), 0);
  const originalAmount = Number(selfEmpowermentRecord?.amount_approved || 0);
  const remainingBalance = Math.max(0, originalAmount - totalPaid);

  const canExport = isAdmin || isManagement;

  const exportToCSV = () => {
    const csvHeaders = "Date,Amount Paid,Payment Method,Reference,Notes\n";
    const csvData = payments.map(payment => 
      `${new Date(payment.repayment_date).toLocaleDateString()},${payment.amount_paid},${payment.payment_method || ''},${payment.reference_number || ''},${payment.notes || ''}`
    ).join('\n');
    
    const csvContent = csvHeaders + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `loan_payments_${selfEmpowermentRecord?.full_name || 'export'}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Export Successful",
      description: "Payment history exported to CSV",
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Loan Payment History', 14, 22);
    
    // Borrower info
    doc.setFontSize(12);
    doc.text(`Borrower: ${selfEmpowermentRecord?.full_name}`, 14, 35);
    doc.text(`Business: ${selfEmpowermentRecord?.business_name || 'Not specified'}`, 14, 42);
    doc.text(`Original Loan: KSH ${originalAmount.toLocaleString()}`, 14, 49);
    doc.text(`Total Paid: KSH ${totalPaid.toLocaleString()}`, 14, 56);
    doc.text(`Remaining: KSH ${remainingBalance.toLocaleString()}`, 14, 63);
    
    // Payment table
    const tableColumns = ['Date', 'Amount Paid', 'Method', 'Reference', 'Notes'];
    const tableRows = payments.map(payment => [
      new Date(payment.repayment_date).toLocaleDateString(),
      `KSH ${Number(payment.amount_paid).toLocaleString()}`,
      payment.payment_method || '-',
      payment.reference_number || '-',
      payment.notes || '-'
    ]);
    
    (doc as any).autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 75,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`loan_payments_${selfEmpowermentRecord?.full_name || 'export'}.pdf`);
    
    toast({
      title: "Export Successful",
      description: "Payment history exported to PDF",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex-1">
          <Eye className="h-3 w-3 mr-1" />
          View Payments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Loan Payment History - {selfEmpowermentRecord?.full_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Payment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Original Loan Amount</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KSH {originalAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Initial disbursement</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <Receipt className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">KSH {totalPaid.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{payments.length} payment(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
                <Coins className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">KSH {remainingBalance.toLocaleString()}</div>
                <Badge variant={remainingBalance === 0 ? "default" : "secondary"}>
                  {remainingBalance === 0 ? "Fully Paid" : "Outstanding"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loan Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground"><strong>Business Name:</strong> {selfEmpowermentRecord?.business_name || 'Not specified'}</p>
                <p className="text-sm text-muted-foreground"><strong>Business Type:</strong> {selfEmpowermentRecord?.type_of_business || 'Not specified'}</p>
                <p className="text-sm text-muted-foreground"><strong>Location:</strong> {selfEmpowermentRecord?.business_location || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground"><strong>Start Date:</strong> {selfEmpowermentRecord?.start_date ? new Date(selfEmpowermentRecord.start_date).toLocaleDateString() : 'Not specified'}</p>
                <p className="text-sm text-muted-foreground"><strong>Contact:</strong> {selfEmpowermentRecord?.contact || 'Not provided'}</p>
                <p className="text-sm text-muted-foreground"><strong>Current Status:</strong> {selfEmpowermentRecord?.current_status || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Payment History
                </div>
                {canExport && payments.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportToCSV}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportToPDF}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading payment history...</p>
                </div>
              ) : payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{new Date(payment.repayment_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium text-green-600">
                            KSH {Number(payment.amount_paid).toLocaleString()}
                          </TableCell>
                          <TableCell>{payment.payment_method || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{payment.reference_number || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No payment records found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Payments will appear here once recorded
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};