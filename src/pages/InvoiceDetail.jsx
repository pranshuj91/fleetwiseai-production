import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { invoiceAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, FileText, Loader2, Download, Send, DollarSign, CheckCircle
} from 'lucide-react';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await invoiceAPI.get(id);
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setActionLoading(true);
    try {
      await invoiceAPI.send(id);
      fetchInvoice();
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to send invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!window.confirm('Mark this invoice as paid?')) return;
    
    setActionLoading(true);
    try {
      await invoiceAPI.markPaid(id);
      fetchInvoice();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('Failed to mark invoice as paid');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await invoiceAPI.exportCSV(id);
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice.invoice_number}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      paid: 'bg-green-600 text-white',
      void: 'bg-red-100 text-red-700',
    };
    return colors[status] || colors.draft;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Invoice not found</h3>
              <Button onClick={() => navigate('/invoices')}>Back to Invoices</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/invoices')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="mr-3 h-8 w-8 text-[#289790]" />
                Invoice {invoice.invoice_number}
              </h1>
              <p className="text-gray-600 mt-1">
                Created {new Date(invoice.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge className={getStatusColor(invoice.status)}>
              {invoice.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          {invoice.status === 'draft' && (
            <Button
              onClick={handleSend}
              disabled={actionLoading}
              className="bg-[#124481] hover:bg-[#1E7083]"
            >
              <Send className="mr-2 h-4 w-4" />
              Send to Customer
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'approved') && (
            <Button
              onClick={handleMarkPaid}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
          )}
          <Button
            onClick={handleExportCSV}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Invoice Document */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">INVOICE</CardTitle>
                <p className="text-sm opacity-90">Fleetwise AI</p>
                <p className="text-sm opacity-90">Fleet Maintenance Solutions</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{invoice.invoice_number}</div>
                <div className="text-sm opacity-90 mt-1">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Customer Info */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
              <p className="text-lg font-medium">{invoice.customer_name || 'N/A'}</p>
              {invoice.truck_info && (
                <p className="text-sm text-gray-600 mt-1">
                  {invoice.truck_info.year} {invoice.truck_info.make} {invoice.truck_info.model}
                  {invoice.truck_info.truck_number && ` • Truck #${invoice.truck_info.truck_number}`}
                  {invoice.truck_info.vin && (
                    <span className="block mt-1">VIN: {invoice.truck_info.vin}</span>
                  )}
                </p>
              )}
            </div>

            {/* Labor Items */}
            {invoice.labor_items && invoice.labor_items.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Labor</h3>
                <div className="space-y-2">
                  {invoice.labor_items.map((labor, idx) => (
                    <div key={idx} className="flex justify-between items-start py-2 border-b border-gray-100">
                      <div className="flex-1">
                        <p className="font-medium">{labor.description}</p>
                        <p className="text-sm text-gray-600">
                          {labor.hours} hours × ${labor.rate.toFixed(2)}/hr
                        </p>
                      </div>
                      <span className="font-semibold">${labor.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <span className="font-semibold">Labor Subtotal:</span>
                  <span className="font-bold text-green-600">${invoice.subtotal_labor.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Parts */}
            {invoice.parts && invoice.parts.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Parts</h3>
                <div className="space-y-2">
                  {invoice.parts.map((part, idx) => (
                    <div key={idx} className="flex justify-between items-start py-2 border-b border-gray-100">
                      <div className="flex-1">
                        <p className="font-medium">{part.part_name}</p>
                        <p className="text-sm text-gray-600">
                          {part.part_number} • Qty: {part.quantity} × ${part.unit_price.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-semibold">${part.total_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <span className="font-semibold">Parts Subtotal:</span>
                  <span className="font-bold text-green-600">${invoice.subtotal_parts.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Fees */}
            <div className="mb-6 space-y-2">
              {invoice.shop_supplies_fee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Shop Supplies Fee:</span>
                  <span className="font-medium">${invoice.shop_supplies_fee.toFixed(2)}</span>
                </div>
              )}
              {invoice.environmental_fee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Environmental Fee:</span>
                  <span className="font-medium">${invoice.environmental_fee.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold">${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-700">Tax ({(invoice.tax_rate * 100).toFixed(2)}%):</span>
                <span className="font-semibold">${invoice.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2">
                <span className="text-2xl font-bold text-gray-900">Total:</span>
                <span className="text-3xl font-bold text-[#289790]">
                  ${invoice.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-2">Notes:</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}

            {/* Payment Info */}
            <div className="mt-6 pt-6 border-t bg-gray-50 -mx-6 px-6 py-4 text-sm text-gray-600">
              {invoice.status === 'paid' && invoice.paid_at && (
                <div className="flex items-center text-green-600 font-semibold mb-2">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Paid on {new Date(invoice.paid_at).toLocaleDateString()}
                </div>
              )}
              {invoice.status === 'sent' && invoice.sent_at && (
                <p className="mb-2">
                  Sent to customer on {new Date(invoice.sent_at).toLocaleDateString()}
                </p>
              )}
              <p>Thank you for your business!</p>
              <p className="mt-1">Please make payment within 30 days.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceDetail;
