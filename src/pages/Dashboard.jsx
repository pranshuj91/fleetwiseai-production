import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import AlertsWidget from '../components/AlertsWidget';
import QuickActionsPanel from '../components/QuickActionsPanel';
import LiveStatusIndicator from '../components/LiveStatusIndicator';
import WarrantyAutoDetect from '../components/WarrantyAutoDetect';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Truck, FileText, TrendingUp, Plus, Upload, DollarSign, 
  Clock, Package, Wrench, AlertTriangle, CheckCircle, Calendar, Building2
} from 'lucide-react';

const Dashboard = () => {
  const { user, profile, isMasterAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalTrucks: 0,
    totalProjects: 0,
    inProgressProjects: 0,
    completedProjects: 0,
    totalEstimates: 0,
    pendingEstimates: 0,
    estimatesValue: 0,
    totalInvoices: 0,
    unpaidInvoices: 0,
    unpaidValue: 0,
    upcomingPM: 0,
    overduePM: 0,
    totalParts: 0,
    lowStockParts: 0,
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get effective company ID - for super admins, check if they're impersonating
  const getEffectiveCompanyId = () => {
    const impersonatedCompanyId = typeof window !== 'undefined' 
      ? sessionStorage.getItem('fleetwise_active_company_id') 
      : null;
    
    if (isMasterAdmin && impersonatedCompanyId) {
      return impersonatedCompanyId;
    }
    
    return profile?.company_id;
  };

  const effectiveCompanyId = useMemo(() => getEffectiveCompanyId(), [profile, isMasterAdmin]);
  const isImpersonating = isMasterAdmin && sessionStorage.getItem('fleetwise_active_company_id');
  const isSuperAdminWithoutCompany = isMasterAdmin && !effectiveCompanyId;

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Super Admin without impersonation - don't fetch company data
      if (isSuperAdminWithoutCompany) {
        setLoading(false);
        return;
      }

      if (!effectiveCompanyId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch trucks count
        const { count: trucksCount } = await supabase
          .from('trucks')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', effectiveCompanyId);

        // Fetch work orders with status counts
        const { data: workOrders } = await supabase
          .from('work_orders')
          .select('id, status, created_at')
          .eq('company_id', effectiveCompanyId)
          .order('created_at', { ascending: false });

        const totalProjects = workOrders?.length || 0;
        const inProgressProjects = workOrders?.filter(wo => 
          wo.status === 'in_progress' || wo.status === 'pending' || wo.status === 'extracted'
        ).length || 0;
        const completedProjects = workOrders?.filter(wo => 
          wo.status === 'completed' || wo.status === 'closed'
        ).length || 0;

        // Get recent 5 work orders for the recent projects section
        const recentWOs = workOrders?.slice(0, 5) || [];

        setStats({
          totalTrucks: trucksCount || 0,
          totalProjects,
          inProgressProjects,
          completedProjects,
          totalEstimates: 0, // Mock for now - no estimates table yet
          pendingEstimates: 0,
          estimatesValue: 0,
          totalInvoices: 0, // Mock for now - no invoices table yet
          unpaidInvoices: 0,
          unpaidValue: 0,
          upcomingPM: 0, // Mock for now
          overduePM: 0,
          totalParts: 0, // Mock for now - no parts_catalog table in Supabase
          lowStockParts: 0,
        });
        setRecentProjects(recentWOs);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [effectiveCompanyId, isSuperAdminWithoutCompany]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Super Admin without impersonation - show system-level dashboard
  if (isSuperAdminWithoutCompany) {
    return (
      <div className="min-h-screen bg-gray-50" data-testid="super-admin-dashboard">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="dashboard-title">
              Welcome back, {profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'Super Admin'}
            </h1>
            <p className="text-muted-foreground">System Administration Dashboard</p>
          </div>
          
          {/* System Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => navigate('/team')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Management</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#124481]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#124481]">Manage</div>
                <p className="text-xs text-muted-foreground mt-1">Users & roles across all companies</p>
              </CardContent>
            </Card>

            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => navigate('/companies')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Companies</CardTitle>
                <Building2 className="h-4 w-4 text-[#1E7083]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1E7083]">Manage</div>
                <p className="text-xs text-muted-foreground mt-1">All registered organizations</p>
              </CardContent>
            </Card>

            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => navigate('/rag-feeder')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RAG Feeder</CardTitle>
                <FileText className="h-4 w-4 text-[#289790]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#289790]">Configure</div>
                <p className="text-xs text-muted-foreground mt-1">AI knowledge base management</p>
              </CardContent>
            </Card>

            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => navigate('/knowledge-curator')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Knowledge Curator</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">Curate</div>
                <p className="text-xs text-muted-foreground mt-1">Review & approve content</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions for Super Admin */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2 hover:bg-primary/5"
                onClick={() => navigate('/team')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#124481]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                <span className="font-medium">Add New User</span>
                <span className="text-xs text-muted-foreground">Create user accounts</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2 hover:bg-primary/5"
                onClick={() => navigate('/companies')}
              >
                <Building2 className="h-8 w-8 text-[#1E7083]" />
                <span className="font-medium">Manage Companies</span>
                <span className="text-xs text-muted-foreground">View & edit organizations</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2 hover:bg-primary/5"
                onClick={() => navigate('/rag-feeder')}
              >
                <FileText className="h-8 w-8 text-[#289790]" />
                <span className="font-medium">Upload Documents</span>
                <span className="text-xs text-muted-foreground">Add to knowledge base</span>
              </Button>
            </div>
          </div>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">View Company Data</h3>
                  <p className="text-sm text-blue-700">
                    To view fleet metrics, work orders, or other company-specific data, use the User Management page to impersonate a user from that company.
                  </p>
                  <Button 
                    variant="link" 
                    className="text-blue-600 p-0 h-auto mt-2"
                    onClick={() => navigate('/team')}
                  >
                    Go to User Management →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="dashboard-page">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header - Consistent display name */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="dashboard-title">
            Welcome back, {profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground">
            {isImpersonating ? 'Viewing impersonated company dashboard' : 'Here\'s what\'s happening with your fleet today.'}
          </p>
        </div>

        {/* Hero CTA - Start Diagnostic Workflow */}
        <div className="mb-8 relative overflow-hidden rounded-xl bg-gradient-to-r from-[#124481] via-[#1E7083] to-[#289790] p-8 shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="max-w-2xl">
                <div className="inline-block mb-3">
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    ⚡ START HERE
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  AI-Guided Diagnostics
                </h2>
                <p className="text-blue-100 text-lg mb-6">
                  Scan a work order to automatically create trucks, launch diagnostics, and get expert AI guidance in seconds.
                </p>
                <Button
                  onClick={() => {
                    const scanButton = document.querySelector('[data-scan-trigger]');
                    if (scanButton) scanButton.click();
                  }}
                  className="bg-white text-[#124481] hover:bg-gray-100 font-bold text-lg px-8 py-6 rounded-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
                  data-testid="hero-scan-button"
                >
                  <Upload className="h-6 w-6 mr-3" />
                  Scan Work Order & Start Diagnostic
                </Button>
              </div>
              <div className="hidden lg:block">
                <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center">
                  <Wrench className="h-24 w-24 text-white/80" />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32"></div>
        </div>

        {/* Quick Actions Panel */}
        <div className="mb-8">
          <QuickActionsPanel />
        </div>

        {/* Live Shop Floor Status - Always render, component handles empty state */}
        <div className="mb-8">
          <LiveStatusIndicator />
        </div>

        {/* AI Warranty Auto-Detection - Always render, component handles empty state */}
        <div className="mb-8">
          <WarrantyAutoDetect />
        </div>

        {/* Stats Grid - Core Metrics */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Fleet Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            data-testid="stat-total-trucks"
            onClick={() => navigate('/trucks')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trucks</CardTitle>
              <Truck className="h-4 w-4 text-[#124481]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#124481]">{stats.totalTrucks}</div>
              <p className="text-xs text-muted-foreground mt-1">Vehicles in fleet</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            data-testid="stat-total-projects"
            onClick={() => navigate('/projects')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FileText className="h-4 w-4 text-[#1E7083]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#1E7083]">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">Work orders</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            data-testid="stat-in-progress"
            onClick={() => navigate('/projects')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#289790]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#289790]">{stats.inProgressProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">Active repairs</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            data-testid="stat-completed"
            onClick={() => navigate('/projects')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">Finished projects</p>
            </CardContent>
          </Card>
        </div>

        {/* Business Metrics */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Business Metrics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={() => navigate('/estimates')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Estimates</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.pendingEstimates}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ${(stats?.estimatesValue ?? 0).toFixed(0)} total value
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={() => navigate('/invoices')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.unpaidInvoices}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ${(stats?.unpaidValue ?? 0).toFixed(0)} outstanding
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={() => navigate('/pm/dashboard')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming PM</CardTitle>
              <Calendar className="h-4 w-4 text-[#289790]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#289790]">{stats.upcomingPM}</div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled maintenance</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer bg-red-50 border-red-200" 
            onClick={() => navigate('/pm/dashboard')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-900">Overdue PM</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overduePM}</div>
              <p className="text-xs text-red-700 mt-1">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory & Parts */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Inventory & Operations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={() => navigate('/parts')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Parts Catalog</CardTitle>
              <Package className="h-4 w-4 text-[#124481]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#124481]">{stats.totalParts}</div>
              <p className="text-xs text-muted-foreground mt-1">Total parts tracked</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer bg-yellow-50 border-yellow-200" 
            onClick={() => navigate('/parts')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-900">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.lowStockParts}</div>
              <p className="text-xs text-yellow-700 mt-1">Need reordering</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={() => navigate('/invoices')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalInvoices}</div>
              <p className="text-xs text-muted-foreground mt-1">Generated invoices</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={() => navigate('/estimates')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
              <FileText className="h-4 w-4 text-[#1E7083]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#1E7083]">{stats.totalEstimates}</div>
              <p className="text-xs text-muted-foreground mt-1">Customer quotes</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Widget */}
        <div className="mb-8">
          <AlertsWidget />
        </div>

        {/* Recent Projects */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Recent Projects</h2>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              View All
            </Button>
          </div>
          
          {recentProjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No projects yet. Create your first work order to get started.</p>
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/projects/create')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{project.title || project.description}</h3>
                        <p className="text-sm text-gray-500">
                          {project.truck?.unit_number || 'No truck assigned'}
                        </p>
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;