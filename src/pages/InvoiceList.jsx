import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { invoiceAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  FileText, Loader2, DollarSign, TrendingUp, Clock, CheckCircle, Plus
} from 'lucide-react';

const InvoiceList = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = filter ? { status: filter } : {};
      const response = await invoiceAPI.list(params);
      setInvoices(response?.data ?? []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
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

  const calculateStats = () => {
    const safeInvoices = invoices ?? [];
    const total = safeInvoices.reduce((sum, inv) => sum + (inv?.total_amount ?? 0), 0);
    const paid = safeInvoices.filter(inv => inv?.status === 'paid').reduce((sum, inv) => sum + (inv?.total_amount ?? 0), 0);
    const outstanding = safeInvoices.filter(inv => inv?.status === 'sent' || inv?.status === 'approved').reduce((sum, inv) => sum + (inv?.total_amount ?? 0), 0);
    
    return { total: total ?? 0, paid: paid ?? 0, outstanding: outstanding ?? 0 };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="mr-3 h-8 w-8 text-[#289790]" />
              Invoices
            </h1>
            <p className="text-gray-600 mt-1">Manage and track all invoices</p>
          </div>
          <Button 
            onClick={() => navigate('/invoices/create')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                </div>
                <FileText className="h-8 w-8 text-[#124481]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Billed</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.total.toFixed(0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-[#289790]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-green-600">${stats.paid.toFixed(0)}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600">${stats.outstanding.toFixed(0)}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={filter === '' ? 'default' : 'outline'}
            onClick={() => setFilter('')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === 'draft' ? 'default' : 'outline'}
            onClick={() => setFilter('draft')}
            size="sm"
          >
            Draft
          </Button>
          <Button
            variant={filter === 'sent' ? 'default' : 'outline'}
            onClick={() => setFilter('sent')}
            size="sm"
          >
            Sent
          </Button>
          <Button
            variant={filter === 'paid' ? 'default' : 'outline'}
            onClick={() => setFilter('paid')}
            size="sm"
          >
            Paid
          </Button>
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
          </div>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600 mb-4">Create invoices from completed work orders</p>
              <Button onClick={() => navigate('/projects')} className="bg-[#289790] hover:bg-[#1E7083]">
                View Work Orders
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <Card 
                key={invoice.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-[#289790] bg-opacity-10 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-[#289790]" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {invoice.invoice_number}
                          </h3>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {invoice.customer_name || 'No customer'} • {new Date(invoice.created_at).toLocaleDateString()}
                        </p>
                        {invoice.truck_info && (
                          <p className="text-sm text-gray-500 mt-1">
                            {invoice.truck_info.year} {invoice.truck_info.make} {invoice.truck_info.model}
                            {invoice.truck_info.truck_number && ` • Truck #${invoice.truck_info.truck_number}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-2xl font-bold text-[#289790]">
                        ${(invoice?.total_amount ?? 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {invoice?.labor_items?.length ?? 0} labor • {invoice?.parts?.length ?? 0} parts
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;
