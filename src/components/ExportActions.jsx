import React from 'react';
import { Button } from '../components/ui/button';
import { 
  Download, Printer, FileText, FileSpreadsheet, Mail
} from 'lucide-react';

const ExportActions = ({ data, fileName = 'export', type = 'invoice' }) => {
  
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // In production, this would generate a proper PDF
    // For now, we'll use the browser's print to PDF functionality
    alert('Use Print > Save as PDF from your browser');
    window.print();
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    // Convert data to CSV
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!data) {
      alert('No data to export');
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleEmail = () => {
    // In production, this would integrate with email service
    alert('Email functionality - In production, this would send via email service');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </Button>

      {Array.isArray(data) && data.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="flex items-center gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export CSV
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleExportJSON}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export JSON
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleEmail}
        className="flex items-center gap-2"
      >
        <Mail className="h-4 w-4" />
        Email
      </Button>
    </div>
  );
};

export default ExportActions;
