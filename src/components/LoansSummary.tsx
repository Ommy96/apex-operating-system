import { useState } from "react";
import { Download, FileText, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface LoanSummary {
  id: string;
  borrowerName: string;
  loanAmount: number;
  totalPaid: number;
  remainingBalance: number;
  loanStatus: string;
}

export const LoansSummary = () => {
  const { isAdmin, isManagement } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch self-empowerment records with loan status
  const { data: loanRecords } = useQuery({
    queryKey: ['loans-summary'],
    queryFn: async () => {
      const { data: selfEmpowermentData, error: seError } = await supabase
        .from('self_empowerment')
        .select('*')
        .eq('amount_status', 'Loan')
        .order('full_name');
      
      if (seError) throw seError;

      // Fetch all loan repayments
      const { data: repaymentsData, error: repayError } = await supabase
        .from('loan_repayments')
        .select('self_empowerment_id, amount_paid');
      
      if (repayError) throw repayError;

      // Aggregate data
      const summaryData: LoanSummary[] = selfEmpowermentData.map(loan => {
        const loanRepayments = repaymentsData.filter(r => r.self_empowerment_id === loan.id);
        const totalPaid = loanRepayments.reduce((sum, r) => sum + Number(r.amount_paid), 0);
        const loanAmount = Number(loan.amount_approved) || 0;
        const remainingBalance = Math.max(0, loanAmount - totalPaid);
        
        return {
          id: loan.id,
          borrowerName: loan.full_name,
          loanAmount,
          totalPaid,
          remainingBalance,
          loanStatus: remainingBalance === 0 ? 'Cleared' : 'Active'
        };
      });

      return summaryData;
    },
    enabled: isAdmin || isManagement,
  });

  const canExport = isAdmin || isManagement;

  const totalLoanAmount = loanRecords?.reduce((sum, record) => sum + record.loanAmount, 0) || 0;
  const totalPaidAmount = loanRecords?.reduce((sum, record) => sum + record.totalPaid, 0) || 0;
  const totalRemainingBalance = loanRecords?.reduce((sum, record) => sum + record.remainingBalance, 0) || 0;
  const clearedLoans = loanRecords?.filter(record => record.loanStatus === 'Cleared').length || 0;
  const activeLoans = loanRecords?.filter(record => record.loanStatus === 'Active').length || 0;

  const exportToCSV = () => {
    if (!loanRecords || loanRecords.length === 0) {
      toast({
        title: "No Data",
        description: "No loan data available to export",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const csvHeaders = "Borrower Name,Loan Amount (KSH),Total Paid (KSH),Remaining Balance (KSH),Loan Status\n";
    const csvData = loanRecords.map(record => 
      `"${record.borrowerName}",${record.loanAmount},${record.totalPaid},${record.remainingBalance},"${record.loanStatus}"`
    ).join('\n');
    
    const csvContent = csvHeaders + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'loans_summary.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setIsLoading(false);
    toast({
      title: "Export Successful",
      description: "Loans summary exported to CSV",
    });
  };

  const exportToPDF = () => {
    if (!loanRecords || loanRecords.length === 0) {
      toast({
        title: "No Data",
        description: "No loan data available to export",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Loans Summary Report', 14, 22);
    
    // Summary statistics
    doc.setFontSize(12);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 35);
    doc.text(`Total Borrowers: ${loanRecords.length}`, 14, 42);
    doc.text(`Active Loans: ${activeLoans}`, 14, 49);
    doc.text(`Cleared Loans: ${clearedLoans}`, 14, 56);
    doc.text(`Total Loan Amount: KSH ${totalLoanAmount.toLocaleString()}`, 14, 63);
    doc.text(`Total Amount Paid: KSH ${totalPaidAmount.toLocaleString()}`, 14, 70);
    doc.text(`Total Outstanding: KSH ${totalRemainingBalance.toLocaleString()}`, 14, 77);
    
    // Table
    const tableColumns = ['Borrower Name', 'Loan Amount', 'Total Paid', 'Remaining Balance', 'Status'];
    const tableRows = loanRecords.map(record => [
      record.borrowerName,
      `KSH ${record.loanAmount.toLocaleString()}`,
      `KSH ${record.totalPaid.toLocaleString()}`,
      `KSH ${record.remainingBalance.toLocaleString()}`,
      record.loanStatus
    ]);
    
    (doc as any).autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 90,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.text('Powered by Infera Tech Solutions', 14, pageHeight - 10);
    
    doc.save('loans_summary.pdf');
    
    setIsLoading(false);
    toast({
      title: "Export Successful",
      description: "Loans summary exported to PDF",
    });
  };

  if (!canExport) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Access restricted to Admin and Management roles only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Borrowers</CardTitle>
            <TableIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanRecords?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All loan recipients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <TableIcon className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{activeLoans}</div>
            <p className="text-xs text-muted-foreground">Outstanding loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleared Loans</CardTitle>
            <TableIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{clearedLoans}</div>
            <p className="text-xs text-muted-foreground">Fully paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <TableIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">KSH {totalLoanAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TableIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">KSH {totalRemainingBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Remaining balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Loans Summary</h2>
          <p className="text-muted-foreground">Overview of all loan recipients and repayment status</p>
        </div>
        
        {loanRecords && loanRecords.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={isLoading}
              className="bg-gradient-primary hover:bg-gradient-primary/90 flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Recipients Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loanRecords && loanRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower Name</TableHead>
                    <TableHead className="text-right">Loan Amount</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-right">Remaining Balance</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.borrowerName}</TableCell>
                      <TableCell className="text-right font-mono">
                        KSH {record.loanAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        KSH {record.totalPaid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        KSH {record.remainingBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={record.loanStatus === 'Cleared' ? 'default' : 'secondary'}>
                          {record.loanStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <TableIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No loan data available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Loan recipients will appear here once loans are approved
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};