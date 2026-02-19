import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, 
  Download, Loader2, ArrowLeft, Filter
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { invoiceAPI, projectAPI } from '../lib/api';

const RevenueReport = () => {
  const navigate = useNavigate();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [data, setData] = useState({
    totalRevenue: 0,
    monthlyRevenue: [],
    revenueByService: [],
    revenueByCustomer: [],
    projectedRevenue: 0,
    growthRate: 0,
    averageInvoice: 0
  });

  useEffect(() => {
    fetchRevenueData();
  }, [timeRange, effectiveCompanyId]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      // Use effectiveCompanyId which respects impersonation
      const [invoicesRes, projectsRes] = await Promise.allSettled([
        invoiceAPI.list(),
        projectAPI.list(effectiveCompanyId)
      ]);

      const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value.data : [];
      const projects = projectsRes.status === 'fulfilled' ? projectsRes.value.data : [];

      // Filter paid invoices
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      
      // Calculate total revenue
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      
      // Average invoice
      const averageInvoice = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;

      // Monthly revenue (last 12 months)
      const monthlyRevenue = calculateMonthlyRevenue(paidInvoices);
      
      // Revenue by service type
      const serviceRevenue = {};
      projects.forEach(project => {
        const serviceType = project.service_type || 'General Repair';
        const invoice = paidInvoices.find(inv => inv.project_id === project.id);
        if (invoice) {
          serviceRevenue[serviceType] = (serviceRevenue[serviceType] || 0) + invoice.total_amount;
        }
      });
      
      const revenueByService = Object.entries(serviceRevenue)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Revenue by customer (top 10)
      const customerRevenue = {};
      paidInvoices.forEach(inv => {
        const customer = inv.customer_name || 'Unknown';
        customerRevenue[customer] = (customerRevenue[customer] || 0) + inv.total_amount;
      });
      
      const revenueByCustomer = Object.entries(customerRevenue)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Growth rate (comparing last 2 months)
      const growthRate = calculateGrowthRate(monthlyRevenue);

      // Projected revenue (based on current trend)
      const projectedRevenue = totalRevenue * 1.15; // Simple 15% projection

      setData({
        totalRevenue,
        monthlyRevenue,
        revenueByService,
        revenueByCustomer,
        projectedRevenue,
        growthRate,
        averageInvoice
      });

    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyRevenue = (invoices) => {
    const months = {};
    const now = new Date();
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), revenue: 0 };
    }

    invoices.forEach(inv => {
      const date = new Date(inv.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].revenue += inv.total_amount;
      }
    });

    return Object.values(months);
  };

  const calculateGrowthRate = (monthlyData) => {
    if (monthlyData.length < 2) return 0;
    const current = monthlyData[monthlyData.length - 1].revenue;
    const previous = monthlyData[monthlyData.length - 2].revenue;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const exportToCSV = () => {
    const csv = [
      ['Month', 'Revenue'],
      ...data.monthlyRevenue.map(item => [item.month, item.revenue])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/reports')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <DollarSign className="mr-3 h-8 w-8 text-green-600" />
                Revenue Report
              </h1>
              <p className="text-gray-600 mt-1">Detailed revenue analysis and trends</p>
            </div>
          </div>
          
          <Button
            onClick={exportToCSV}
            className="bg-[#289790] hover:bg-[#1E7083]"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold">${data.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Growth Rate</p>
                  <p className="text-2xl font-bold flex items-center">
                    {data.growthRate > 0 ? (
                      <>
                        <TrendingUp className="h-5 w-5 text-green-600 mr-1" />
                        <span className="text-green-600">+{data.growthRate.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-5 w-5 text-red-600 mr-1" />
                        <span className="text-red-600">{data.growthRate.toFixed(1)}%</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Invoice</p>
                <p className="text-2xl font-bold text-gray-900">${data.averageInvoice.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm opacity-90 mb-1">Projected (Annual)</p>
                <p className="text-2xl font-bold">${data.projectedRevenue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-[#289790]" />
              Monthly Revenue Trend (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#289790" 
                  strokeWidth={3}
                  name="Revenue"
                  dot={{ fill: '#289790', r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue by Service Type */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Service Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.revenueByService}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="value" fill="#124481" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Customers by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.revenueByCustomer.map((customer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-[#124481] text-white flex items-center justify-center font-bold mr-3">
                        {idx + 1}
                      </div>
                      <span className="font-medium text-gray-900">{customer.name}</span>
                    </div>
                    <span className="font-bold text-green-600">${customer.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Data Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Monthly Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      vs Previous
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.monthlyRevenue.map((item, idx) => {
                    const prevRevenue = idx > 0 ? data.monthlyRevenue[idx - 1].revenue : 0;
                    const change = prevRevenue > 0 ? ((item.revenue - prevRevenue) / prevRevenue) * 100 : 0;
                    
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                          ${item.revenue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {idx > 0 && (
                            <span className={`font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueReport;
