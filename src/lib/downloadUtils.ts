import * as XLSX from 'xlsx';

export const downloadExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-width columns based on content
  const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
  worksheet['!cols'] = colWidths;

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
};

export const formatDocumentsData = (documents: any[]) => {
  return documents.map(doc => ({
    'Document Title': doc.title,
    'File Name': doc.file_name,
    'Student': doc.children ? `${doc.children.first_name} ${doc.children.last_name}` : 'N/A',
    'Category': doc.category || 'Uncategorized',
    'File Type': doc.file_type || 'Unknown',
    'Upload Date': new Date(doc.created_at).toLocaleDateString(),
  }));
};

