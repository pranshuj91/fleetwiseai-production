import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, DollarSign, TrendingUp, Star, 
  Download, Loader2, ArrowLeft, Award
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { invoiceAPI, projectAPI } from '../lib/api';

const CustomerValueReport = () => {
  const navigate = useNavigate();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    avgCustomerValue: 0,
    topCustomers: [],
    customerGrowth: [],
    customerSegments: [],
    revenueByCustomer: [],
    loyaltyTiers: []
  });

  useEffect(() => {
    fetchCustomerData();
  }, [effectiveCompanyId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      // Use effectiveCompanyId which respects impersonation
      const [invoicesRes, projectsRes] = await Promise.allSettled([
        invoiceAPI.list(),
        projectAPI.list(effectiveCompanyId)
      ]);

      const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value.data : [];
      const projects = projectsRes.status === 'fulfilled' ? projectsRes.value.data : [];

      // Customer revenue calculation
      const customerRevenue = {};
      const customerProjects = {};
      const customerFirstSeen = {};

      invoices.forEach(inv => {
        const customer = inv.customer_name || 'Unknown';
        if (inv.status === 'paid') {
          customerRevenue[customer] = (customerRevenue[customer] || 0) + inv.total_amount;
        }
      });

      projects.forEach(proj => {
        const customer = proj.customer_name || 'Unknown';
        customerProjects[customer] = (customerProjects[customer] || 0) + 1;
        
        const projDate = new Date(proj.created_at);
        if (!customerFirstSeen[customer] || projDate < customerFirstSeen[customer]) {
          customerFirstSeen[customer] = projDate;
        }
      });

      const totalRevenue = Object.values(customerRevenue).reduce((sum, val) => sum + val, 0);
      const totalCustomers = Object.keys(customerRevenue).length;
      const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

      // Top customers
      const topCustomers = Object.entries(customerRevenue)
        .map(([name, revenue]) => ({
          name,
          revenue,
          projects: customerProjects[name] || 0,
          avgOrderValue: revenue / (customerProjects[name] || 1),
          tier: revenue > 10000 ? 'Platinum' : revenue > 5000 ? 'Gold' : revenue > 2000 ? 'Silver' : 'Bronze'
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20);

      // Customer segments
      const segments = [
        { name: 'High Value (>$10k)', count: topCustomers.filter(c => c.revenue > 10000).length },
        { name: 'Medium ($5k-$10k)', count: topCustomers.filter(c => c.revenue > 5000 && c.revenue <= 10000).length },
        { name: 'Regular ($2k-$5k)', count: topCustomers.filter(c => c.revenue > 2000 && c.revenue <= 5000).length },
        { name: 'Occasional (<$2k)', count: topCustomers.filter(c => c.revenue <= 2000).length }
      ];

      // Loyalty tiers
      const loyaltyTiers = [
        { tier: 'Platinum', count: topCustomers.filter(c => c.tier === 'Platinum').length, minSpend: 10000 },
        { tier: 'Gold', count: topCustomers.filter(c => c.tier === 'Gold').length, minSpend: 5000 },
        { tier: 'Silver', count: topCustomers.filter(c => c.tier === 'Silver').length, minSpend: 2000 },
        { tier: 'Bronze', count: topCustomers.filter(c => c.tier === 'Bronze').length, minSpend: 0 }
      ];

      // Customer growth (mock - last 6 months)
      const customerGrowth = [
        { month: 'Jun', new: 5, total: 45 },
        { month: 'Jul', new: 3, total: 48 },
        { month: 'Aug', new: 7, total: 55 },
        { month: 'Sep', new: 4, total: 59 },
        { month: 'Oct', new: 6, total: 65 },
        { month: 'Nov', new: 8, total: totalCustomers }
      ];

      setData({
        totalCustomers,
        totalRevenue,
        avgCustomerValue,
        topCustomers,
        customerGrowth,
        customerSegments: segments,
        revenueByCustomer: topCustomers.slice(0, 10),
        loyaltyTiers
      });

    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier) => {
    const badges = {
      Platinum: <Badge className="bg-purple-600"><Award className="h-3 w-3 mr-1" />Platinum</Badge>,
      Gold: <Badge className="bg-yellow-500"><Award className="h-3 w-3 mr-1" />Gold</Badge>,
      Silver: <Badge className="bg-gray-400"><Award className="h-3 w-3 mr-1" />Silver</Badge>,
      Bronze: <Badge className="bg-orange-600"><Award className="h-3 w-3 mr-1" />Bronze</Badge>
    };
    return badges[tier] || <Badge>{tier}</Badge>;
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
                <Users className="mr-3 h-8 w-8 text-[#124481]" />
                Customer Value Report
              </h1>
              <p className="text-gray-600 mt-1">Customer lifetime value and loyalty analysis</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Customers</p>
                  <p className="text-3xl font-bold text-gray-900">{data.totalCustomers}</p>
                </div>
                <Users className="h-10 w-10 text-[#124481] opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm opacity-90 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold">${data.totalRevenue.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Customer Value</p>
                <p className="text-3xl font-bold text-[#289790]">${data.avgCustomerValue.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm opacity-90 mb-1">Platinum Customers</p>
                <p className="text-3xl font-bold">
                  {data.loyaltyTiers.find(t => t.tier === 'Platinum')?.count || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customer Segments */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Segments by Value</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.customerSegments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#124481" name="Customers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Customer Growth */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Growth (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.customerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#124481" 
                    strokeWidth={3}
                    name="Total Customers"
                    dot={{ fill: '#124481', r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="new" 
                    stroke="#289790" 
                    strokeWidth={2}
                    name="New Customers"
                    dot={{ fill: '#289790', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Loyalty Tiers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="mr-2 h-5 w-5 text-[#289790]" />
              Customer Loyalty Tiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {data.loyaltyTiers.map((tier, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-2 ${
                  tier.tier === 'Platinum' ? 'border-purple-500 bg-purple-50' :
                  tier.tier === 'Gold' ? 'border-yellow-500 bg-yellow-50' :
                  tier.tier === 'Silver' ? 'border-gray-400 bg-gray-50' :
                  'border-orange-500 bg-orange-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    {getTierBadge(tier.tier)}
                    <span className="text-2xl font-bold">{tier.count}</span>
                  </div>
                  <p className="text-xs text-gray-600">Min Spend: ${tier.minSpend.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top 20 Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Projects</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Order</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tier</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.topCustomers.map((customer, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            idx < 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            idx < 10 ? 'bg-[#124481]' : 'bg-gray-400'
                          }`}>
                            {idx + 1}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                        ${customer.revenue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                        {customer.projects}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${customer.avgOrderValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getTierBadge(customer.tier)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/customers')}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerValueReport;
