import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import ExportActions from '../components/ExportActions';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { projectAPI, invoiceAPI, truckAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, DollarSign, Truck, Wrench, Calendar, Users,
  BarChart3, Loader2, ArrowUp, ArrowDown
} from 'lucide-react';

const FleetAnalytics = () => {
  const navigate = useNavigate();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months'); // 7days, 30days, 6months, 1year
  const [analyticsData, setAnalyticsData] = useState({
    revenueGrowth: 12.5,
    avgRepairCost: 1250,
    totalRevenue: 45600,
    completionRate: 87,
    monthlyRevenue: [],
    workOrdersByMonth: [],
    technicianPerformance: [],
    serviceDistribution: [],
    fleetHealth: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, effectiveCompanyId]);

  const fetchAnalytics = async () => {
    try {
      // Use effectiveCompanyId which respects impersonation
      const [projectsRes, invoicesRes, trucksRes] = await Promise.allSettled([
        projectAPI.list(effectiveCompanyId),
        invoiceAPI.list(),
        truckAPI.list(effectiveCompanyId)
      ]);

      const projects = projectsRes.status === 'fulfilled' ? projectsRes.value.data : [];
      const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value.data : [];
      const trucks = trucksRes.status === 'fulfilled' ? trucksRes.value.data : [];

      // Calculate monthly revenue
      const monthlyRevenue = calculateMonthlyRevenue(invoices);
      
      // Calculate work orders by month
      const workOrdersByMonth = calculateMonthlyWorkOrders(projects);
      
      // Mock technician performance data
      const technicianPerformance = [
        { name: 'John Doe', completed: 45, efficiency: 92, revenue: 18500 },
        { name: 'Jane Smith', completed: 38, efficiency: 88, revenue: 15800 },
        { name: 'Mike Wilson', completed: 32, efficiency: 85, revenue: 13200 },
        { name: 'Tom Brown', completed: 28, efficiency: 81, revenue: 11500 }
      ];

      // Service type distribution
      const serviceDistribution = [
        { name: 'Engine', value: 35, color: '#124481' },
        { name: 'Transmission', value: 20, color: '#1E7083' },
        { name: 'Brakes', value: 18, color: '#289790' },
        { name: 'Electrical', value: 15, color: '#FFA500' },
        { name: 'Other', value: 12, color: '#808080' }
      ];

      // Fleet health overview
      const fleetHealth = trucks.map(truck => ({
        unit: truck.identity?.unit_id || truck.identity?.truck_number || 'N/A',
        health: Math.floor(Math.random() * 30) + 70, // Mock health score
        mileage: truck.identity?.odometer_mi || 0
      })).slice(0, 10);

      const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total_amount, 0);

      const avgRepairCost = invoices.length > 0 
        ? totalRevenue / invoices.length 
        : 0;

      setAnalyticsData({
        revenueGrowth: 12.5,
        avgRepairCost,
        totalRevenue,
        completionRate: projects.length > 0 
          ? (projects.filter(p => p.status === 'completed').length / projects.length) * 100 
          : 0,
        monthlyRevenue,
        workOrdersByMonth,
        technicianPerformance,
        serviceDistribution,
        fleetHealth
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
          const invDate = new Date(inv.created_at);
          return invDate.getMonth() === month.getMonth() && 
                 invDate.getFullYear() === month.getFullYear() &&
                 inv.status === 'paid';
        })
        .reduce((sum, inv) => sum + inv.total_amount, 0);
      
      months.push({ 
        month: monthName, 
        revenue: monthRevenue,
        target: 8000 // Target revenue
      });
    }
    
    return months;
  };

  const calculateMonthlyWorkOrders = (projects) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleDateString('en-US', { month: 'short' });
      
      const monthProjects = projects.filter(proj => {
        const projDate = new Date(proj.created_at);
        return projDate.getMonth() === month.getMonth() && 
               projDate.getFullYear() === month.getFullYear();
      });
      
      months.push({ 
        month: monthName, 
        total: monthProjects.length,
        completed: monthProjects.filter(p => p.status === 'completed').length,
        inProgress: monthProjects.filter(p => p.status === 'in_progress').length
      });
    }
    
    return months;
  };

  const COLORS = ['#124481', '#1E7083', '#289790', '#FFA500', '#808080'];

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
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="mr-3 h-8 w-8 text-[#124481]" />
                Fleet Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Visual insights and performance metrics</p>
            </div>
            <div className="flex gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border rounded-md bg-white"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>
              <ExportActions 
                data={analyticsData.monthlyRevenue}
                fileName="fleet-analytics"
                type="analytics"
              />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigate('/reports/revenue')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Total Revenue</div>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                ${analyticsData.totalRevenue.toLocaleString()}
              </div>
              <div className="flex items-center text-sm text-green-600 mt-2">
                <ArrowUp className="h-4 w-4 mr-1" />
                {analyticsData.revenueGrowth}% from last period
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigate('/reports/revenue')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Avg Repair Cost</div>
                <Wrench className="h-5 w-5 text-[#1E7083]" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                ${analyticsData.avgRepairCost.toFixed(0)}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Per work order
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigate('/reports/work-orders')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Completion Rate</div>
                <TrendingUp className="h-5 w-5 text-[#289790]" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {analyticsData.completionRate.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Work orders completed
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigate('/trucks')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Active Fleet</div>
                <Truck className="h-5 w-5 text-[#124481]" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {analyticsData.fleetHealth.length}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Trucks monitored
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.monthlyRevenue}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#124481" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#124481" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#124481" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    name="Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#FFA500" 
                    strokeDasharray="5 5"
                    fillOpacity={0}
                    name="Target"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Orders by Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.workOrdersByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#289790" name="Completed" />
                  <Bar dataKey="inProgress" fill="#1E7083" name="In Progress" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Technician Performance & Service Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Technician Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.technicianPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#124481" name="Completed WOs" />
                  <Bar dataKey="efficiency" fill="#289790" name="Efficiency %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.serviceDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Fleet Health Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Fleet Health Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.fleetHealth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="unit" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="health" fill="#289790" name="Health Score %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FleetAnalytics;
