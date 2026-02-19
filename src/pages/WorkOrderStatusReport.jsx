import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  FileText, Clock, CheckCircle, AlertCircle, 
  Download, Loader2, ArrowLeft, TrendingUp
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { projectAPI } from '../lib/api';

const WorkOrderStatusReport = () => {
  const navigate = useNavigate();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalWorkOrders: 0,
    byStatus: [],
    byPriority: [],
    completionRate: 0,
    avgCompletionTime: 0,
    workOrdersOverTime: [],
    recentWorkOrders: []
  });

  const STATUS_COLORS = {
    'open': '#3B82F6',
    'in_progress': '#F59E0B',
    'completed': '#10B981',
    'cancelled': '#EF4444'
  };

  useEffect(() => {
    fetchWorkOrderData();
  }, [effectiveCompanyId]);

  const fetchWorkOrderData = async () => {
    try {
      setLoading(true);
      // Use effectiveCompanyId which respects impersonation
      const response = await projectAPI.list(effectiveCompanyId);
      const projects = response.data || [];

      // Total work orders
      const totalWorkOrders = projects.length;

      // By status
      const statusCount = {};
      projects.forEach(project => {
        const status = project.status || 'open';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      const byStatus = Object.entries(statusCount).map(([name, value]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        value,
        percentage: ((value / totalWorkOrders) * 100).toFixed(1)
      }));

      // By priority
      const priorityCount = {};
      projects.forEach(project => {
        const priority = project.priority || 'normal';
        priorityCount[priority] = (priorityCount[priority] || 0) + 1;
      });

      const byPriority = Object.entries(priorityCount).map(([name, value]) => ({
        name: name.toUpperCase(),
        value
      }));

      // Completion rate
      const completedCount = projects.filter(p => p.status === 'completed').length;
      const completionRate = totalWorkOrders > 0 ? (completedCount / totalWorkOrders) * 100 : 0;

      // Average completion time (mock data - would need timestamps)
      const avgCompletionTime = 4.5; // days

      // Work orders over time (last 6 months)
      const workOrdersOverTime = calculateMonthlyWorkOrders(projects);

      // Recent work orders (last 10)
      const recentWorkOrders = projects
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);

      setData({
        totalWorkOrders,
        byStatus,
        byPriority,
        completionRate,
        avgCompletionTime,
        workOrdersOverTime,
        recentWorkOrders
      });

    } catch (error) {
      console.error('Error fetching work order data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyWorkOrders = (projects) => {
    const months = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { 
        month: date.toLocaleDateString('en-US', { month: 'short' }), 
        total: 0,
        completed: 0,
        in_progress: 0
      };
    }

    projects.forEach(project => {
      const date = new Date(project.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].total += 1;
        if (project.status === 'completed') months[key].completed += 1;
        if (project.status === 'in_progress') months[key].in_progress += 1;
      }
    });

    return Object.values(months);
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: <Badge className="bg-blue-500">Open</Badge>,
      in_progress: <Badge className="bg-yellow-500">In Progress</Badge>,
      completed: <Badge className="bg-green-500">Completed</Badge>,
      cancelled: <Badge className="bg-red-500">Cancelled</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: <Badge variant="secondary">Low</Badge>,
      normal: <Badge className="bg-blue-500">Normal</Badge>,
      high: <Badge className="bg-orange-500">High</Badge>,
      urgent: <Badge className="bg-red-600">Urgent</Badge>
    };
    return badges[priority] || <Badge>{priority}</Badge>;
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
                <FileText className="mr-3 h-8 w-8 text-[#124481]" />
                Work Order Status Report
              </h1>
              <p className="text-gray-600 mt-1">Comprehensive work order tracking and analysis</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-[#124481] to-[#1E7083] text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Total Work Orders</p>
                  <p className="text-3xl font-bold">{data.totalWorkOrders}</p>
                </div>
                <FileText className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-600">{data.completionRate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Completion</p>
                <p className="text-2xl font-bold text-gray-900">{data.avgCompletionTime} days</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Orders</p>
                <p className="text-2xl font-bold text-[#289790]">
                  {data.byStatus.find(s => s.name === 'IN_PROGRESS')?.value || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Work Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.byStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(STATUS_COLORS)[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="mt-4 space-y-2">
                {data.byStatus.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{item.name}</span>
                    <Badge>{item.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Work Orders by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.byPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1E7083" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-[#289790]" />
              Work Orders Over Time (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.workOrdersOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#10B981" name="Completed" />
                <Bar dataKey="in_progress" stackId="a" fill="#F59E0B" name="In Progress" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.recentWorkOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {wo.work_order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {wo.customer_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(wo.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getPriorityBadge(wo.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(wo.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/projects/${wo.id}`)}
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

export default WorkOrderStatusReport;
