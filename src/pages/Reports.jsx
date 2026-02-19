import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import ExportActions from '../components/ExportActions';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { projectAPI, truckAPI, invoiceAPI, estimateAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  TrendingUp, DollarSign, FileText, Truck, Calendar, BarChart3, Loader2
} from 'lucide-react';

const Reports = () => {
  const navigate = useNavigate();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: [],
    workOrdersByStatus: {},
    topCustomers: [],
    revenueByMonth: [],
    avgRepairCost: 0,
    totalWorkOrders: 0,
    completionRate: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [effectiveCompanyId]);

  const fetchAnalytics = async () => {
    try {
      // Use effectiveCompanyId which respects impersonation
      const [projectsRes, invoicesRes, trucksRes] = await Promise.allSettled([
        projectAPI.list(effectiveCompanyId),
        invoiceAPI.list(),
        truckAPI.list(effectiveCompanyId)
      ]);

      const projects = projectsRes.status === 'fulfilled' ? (projectsRes.value?.data ?? []) : [];
      const invoices = invoicesRes.status === 'fulfilled' ? (invoicesRes.value?.data ?? []) : [];
      const trucks = trucksRes.status === 'fulfilled' ? (trucksRes.value?.data ?? []) : [];

      // Calculate total revenue
      const totalRevenue = invoices
        .filter(inv => inv?.status === 'paid')
        .reduce((sum, inv) => sum + (inv?.total_amount ?? 0), 0);

      // Work orders by status
      const workOrdersByStatus = projects.reduce((acc, project) => {
        const status = project?.status ?? 'draft';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Revenue by month (last 6 months)
      const revenueByMonth = calculateMonthlyRevenue(invoices);

      // Top customers by revenue
      const customerRevenue = {};
      invoices.forEach(inv => {
        if (inv?.customer_name) {
          customerRevenue[inv.customer_name] = (customerRevenue[inv.customer_name] || 0) + (inv?.total_amount ?? 0);
        }
      });
      const topCustomers = Object.entries(customerRevenue)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, revenue]) => ({ name, revenue }));

      // Average repair cost
      const paidInvoices = invoices.filter(inv => inv?.status === 'paid');
      const avgRepairCost = paidInvoices.length > 0 
        ? paidInvoices.reduce((sum, inv) => sum + (inv?.total_amount ?? 0), 0) / paidInvoices.length 
        : 0;

      // Completion rate
      const completedProjects = projects.filter(p => p?.status === 'completed').length;
      const completionRate = projects.length > 0 ? (completedProjects / projects.length) * 100 : 0;

      setStats({
        totalRevenue,
        workOrdersByStatus,
        topCustomers,
        revenueByMonth,
        avgRepairCost,
        totalWorkOrders: projects.length,
        completionRate
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyRevenue = (invoices) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleDateString('en-US', { month: 'short' });
      
      const monthRevenue = invoices
        .filter(inv => {
          const invDate = new Date(inv?.created_at ?? 0);
          return invDate.getMonth() === month.getMonth() && 
                 invDate.getFullYear() === month.getFullYear() &&
                 inv?.status === 'paid';
        })
        .reduce((sum, inv) => sum + (inv?.total_amount ?? 0), 0);
      
      months.push({ month: monthName, revenue: monthRevenue });
    }
    
    return months;
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

  const maxRevenue = Math.max(...(stats?.revenueByMonth ?? []).map(m => m?.revenue ?? 0), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="mr-3 h-8 w-8 text-[#124481]" />
                Reports & Analytics
              </h1>
              <p className="text-gray-600 mt-1">Track performance and business metrics</p>
            </div>
            <ExportActions 
              data={stats.topCustomers}
              fileName="fleetwise-report"
              type="report"
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${(stats?.totalRevenue ?? 0).toFixed(0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Work Orders</p>
                  <p className="text-2xl font-bold text-[#124481]">{stats?.totalWorkOrders ?? 0}</p>
                </div>
                <FileText className="h-8 w-8 text-[#124481]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Repair Cost</p>
                  <p className="text-2xl font-bold text-[#1E7083]">${(stats?.avgRepairCost ?? 0).toFixed(0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-[#1E7083]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-[#289790]">{(stats?.completionRate ?? 0).toFixed(0)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#289790]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend */}
          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => navigate('/reports/revenue')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Revenue Trend (Last 6 Months)</span>
                <Badge className="bg-[#289790]">Click for Details</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(stats?.revenueByMonth ?? []).map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item?.month ?? 'N/A'}</span>
                      <span className="text-gray-600">${(item?.revenue ?? 0).toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#124481] to-[#289790] h-2 rounded-full transition-all"
                        style={{ width: `${((item?.revenue ?? 0) / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Work Orders by Status */}
          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => navigate('/reports/work-orders')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Work Orders by Status</span>
                <Badge className="bg-[#289790]">Click for Details</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats?.workOrdersByStatus ?? {}).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No work order data available</p>
                ) : (
                  Object.entries(stats?.workOrdersByStatus ?? {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={
                          status === 'completed' ? 'bg-green-500' :
                          status === 'in_progress' ? 'bg-blue-500' :
                          status === 'draft' ? 'bg-gray-500' : 'bg-orange-500'
                        }>
                          {(status ?? 'unknown').replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-600">{count ?? 0} orders</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{count ?? 0}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Report Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Fleet Health Report */}
          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => navigate('/reports/fleet-health')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Fleet Health Overview</span>
                <Badge className="bg-[#289790]">Click for Details</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-[#289790] mb-2">{stats?.totalTrucks ?? 0}</p>
                <p className="text-sm text-gray-600">Trucks monitored for health & performance</p>
                <p className="text-xs text-gray-500 mt-3">View detailed health scores, maintenance history, and alerts</p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Value Report */}
          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => navigate('/reports/customer-value')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Customer Value Analysis</span>
                <Badge className="bg-[#289790]">Click for Details</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-[#124481] mb-2">{(stats?.topCustomers ?? []).length}</p>
                <p className="text-sm text-gray-600">Customer lifetime value & loyalty</p>
                <p className="text-xs text-gray-500 mt-3">Analyze customer tiers, spending patterns, and growth</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.topCustomers ?? []).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No customer data available</p>
            ) : (
              <div className="space-y-3">
                {(stats?.topCustomers ?? []).map((customer, index) => (
                  <div 
                    key={customer?.name ?? index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#124481] text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer?.name ?? 'Unknown'}</p>
                        <p className="text-sm text-gray-600">${(customer?.revenue ?? 0).toFixed(0)} total revenue</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">${(customer?.revenue ?? 0).toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
