import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Truck, AlertTriangle, CheckCircle, TrendingDown, 
  Download, Loader2, ArrowLeft, Activity, Calendar
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { truckAPI, projectAPI } from '../lib/api';

const FleetHealthReport = () => {
  const navigate = useNavigate();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalTrucks: 0,
    healthyTrucks: 0,
    warningTrucks: 0,
    criticalTrucks: 0,
    avgHealthScore: 0,
    healthTrend: [],
    maintenanceHistory: [],
    commonIssues: [],
    truckDetails: []
  });

  const HEALTH_COLORS = {
    healthy: '#10B981',
    warning: '#F59E0B',
    critical: '#EF4444'
  };

  useEffect(() => {
    fetchFleetHealthData();
  }, [effectiveCompanyId]);

  const fetchFleetHealthData = async () => {
    try {
      setLoading(true);
      // Use effectiveCompanyId which respects impersonation
      const [trucksRes, projectsRes] = await Promise.allSettled([
        truckAPI.list(effectiveCompanyId),
        projectAPI.list(effectiveCompanyId)
      ]);

      const trucks = trucksRes.status === 'fulfilled' ? trucksRes.value.data : [];
      const projects = projectsRes.status === 'fulfilled' ? projectsRes.value.data : [];

      // Calculate health scores (mock algorithm - would be more sophisticated in production)
      const trucksWithHealth = trucks.map(truck => {
        const truckProjects = projects.filter(p => p.truck_id === truck.id);
        const recentIssues = truckProjects.filter(p => {
          const projectDate = new Date(p.created_at);
          const monthsAgo = (new Date() - projectDate) / (1000 * 60 * 60 * 24 * 30);
          return monthsAgo <= 6;
        }).length;

        const mileage = truck.maintenance?.current_mileage || 0;
        const age = new Date().getFullYear() - (truck.identity?.year || new Date().getFullYear());

        // Health score calculation (100 = perfect)
        let healthScore = 100;
        healthScore -= recentIssues * 10; // -10 per issue in last 6 months
        healthScore -= Math.min(age * 2, 20); // -2 per year of age (max -20)
        healthScore -= Math.min(mileage / 10000, 30); // -1 per 10k miles (max -30)
        healthScore = Math.max(0, Math.min(100, healthScore));

        let healthStatus = 'healthy';
        if (healthScore < 50) healthStatus = 'critical';
        else if (healthScore < 75) healthStatus = 'warning';

        return {
          ...truck,
          healthScore: Math.round(healthScore),
          healthStatus,
          recentIssues
        };
      });

      const totalTrucks = trucksWithHealth.length;
      const healthyTrucks = trucksWithHealth.filter(t => t.healthStatus === 'healthy').length;
      const warningTrucks = trucksWithHealth.filter(t => t.healthStatus === 'warning').length;
      const criticalTrucks = trucksWithHealth.filter(t => t.healthStatus === 'critical').length;
      const avgHealthScore = totalTrucks > 0 
        ? trucksWithHealth.reduce((sum, t) => sum + t.healthScore, 0) / totalTrucks 
        : 0;

      // Health trend (last 6 months - mock data)
      const healthTrend = [
        { month: 'Jun', score: 82 },
        { month: 'Jul', score: 80 },
        { month: 'Aug', score: 78 },
        { month: 'Sep', score: 75 },
        { month: 'Oct', score: 77 },
        { month: 'Nov', score: avgHealthScore }
      ];

      // Maintenance history
      const maintenanceHistory = projects
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(project => {
          const truck = trucks.find(t => t.id === project.truck_id);
          return {
            id: project.id,
            date: new Date(project.created_at).toLocaleDateString(),
            truck: truck?.identity?.unit_id || truck?.identity?.truck_number || 'N/A',
            issue: project.complaint || 'Maintenance',
            status: project.status
          };
        });

      // Common issues analysis
      const issueTypes = {};
      projects.forEach(project => {
        const type = project.service_type || 'General Repair';
        issueTypes[type] = (issueTypes[type] || 0) + 1;
      });

      const commonIssues = Object.entries(issueTypes)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Truck details sorted by health
      const truckDetails = trucksWithHealth
        .sort((a, b) => a.healthScore - b.healthScore)
        .slice(0, 20);

      setData({
        totalTrucks,
        healthyTrucks,
        warningTrucks,
        criticalTrucks,
        avgHealthScore: Math.round(avgHealthScore),
        healthTrend,
        maintenanceHistory,
        commonIssues,
        truckDetails
      });

    } catch (error) {
      console.error('Error fetching fleet health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthBadge = (status) => {
    const badges = {
      healthy: <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>,
      warning: <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>,
      critical: <Badge className="bg-red-500"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
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
                <Activity className="mr-3 h-8 w-8 text-[#289790]" />
                Fleet Health Report
              </h1>
              <p className="text-gray-600 mt-1">Comprehensive fleet health analysis</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Fleet</p>
                <p className="text-3xl font-bold text-gray-900">{data.totalTrucks}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-green-700 mb-1">Healthy</p>
                <p className="text-3xl font-bold text-green-600">{data.healthyTrucks}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-yellow-700 mb-1">Warning</p>
                <p className="text-3xl font-bold text-yellow-600">{data.warningTrucks}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-red-700 mb-1">Critical</p>
                <p className="text-3xl font-bold text-red-600">{data.criticalTrucks}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#124481] to-[#1E7083] text-white">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm opacity-90 mb-1">Avg Health Score</p>
                <p className="text-3xl font-bold">{data.avgHealthScore}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Health Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Fleet Health Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Healthy', value: data.healthyTrucks },
                      { name: 'Warning', value: data.warningTrucks },
                      { name: 'Critical', value: data.criticalTrucks }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill={HEALTH_COLORS.healthy} />
                    <Cell fill={HEALTH_COLORS.warning} />
                    <Cell fill={HEALTH_COLORS.critical} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Health Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Average Health Score Trend (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.healthTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#289790" 
                    strokeWidth={3}
                    name="Health Score"
                    dot={{ fill: '#289790', r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Common Issues */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Most Common Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.commonIssues}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#124481" name="Occurrences" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Truck Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fleet Health Details (Sorted by Health Score)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make/Model</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Health Score</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Recent Issues</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.truckDetails.map((truck) => (
                    <tr key={truck.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {truck.identity?.unit_id || truck.identity?.truck_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {truck.identity?.make} {truck.identity?.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <div className={`text-2xl font-bold ${
                            truck.healthScore >= 75 ? 'text-green-600' :
                            truck.healthScore >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {truck.healthScore}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getHealthBadge(truck.healthStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                        {truck.recentIssues} issues
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/trucks/${truck.id}`)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Maintenance History */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-[#289790]" />
              Recent Maintenance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.maintenanceHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-gray-900">{item.date}</div>
                    <div className="text-sm text-gray-600">Truck: {item.truck}</div>
                    <div className="text-sm text-gray-900">{item.issue}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      item.status === 'completed' ? 'bg-green-500' :
                      item.status === 'in_progress' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }>
                      {item.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/projects/${item.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FleetHealthReport;
