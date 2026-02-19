import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Shield, DollarSign, TrendingUp, FileText, Download,
  Search, Filter, Calendar, Truck as TruckIcon, Loader2 
} from 'lucide-react';
import api from '../lib/api';

const WarrantyDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, opportunities, no_opportunities
  
  // Statistics
  const [stats, setStats] = useState({
    totalAnalyzed: 0,
    opportunitiesFound: 0,
    totalRecoveryPotential: 0,
    avgRecoveryPerClaim: 0
  });

  useEffect(() => {
    // Check permission
    if (!hasPermission('warranty', 'read') || !isAdmin()) {
      navigate('/');
      return;
    }
    
    fetchWarrantyAnalyses();
  }, []);

  useEffect(() => {
    filterAnalyses();
  }, [searchTerm, filterStatus, analyses]);

  const fetchWarrantyAnalyses = async () => {
    try {
      // Fetch all warranty analyses for the company
      const response = await api.get(`/warranty/list?company_id=${user.company_id}`);
      const data = response.data || [];
      
      setAnalyses(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching warranty analyses:', error);
      // For now, show empty state
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const withOpportunities = data.filter(a => a.analysis?.has_warranty_opportunity).length;
    const totalRecovery = data.reduce((sum, a) => {
      return sum + (a.analysis?.total_estimated_recovery || 0);
    }, 0);
    
    setStats({
      totalAnalyzed: total,
      opportunitiesFound: withOpportunities,
      totalRecoveryPotential: totalRecovery,
      avgRecoveryPerClaim: withOpportunities > 0 ? totalRecovery / withOpportunities : 0
    });
  };

  const filterAnalyses = () => {
    let filtered = analyses;
    
    // Apply status filter
    if (filterStatus === 'opportunities') {
      filtered = filtered.filter(a => a.analysis?.has_warranty_opportunity);
    } else if (filterStatus === 'no_opportunities') {
      filtered = filtered.filter(a => !a.analysis?.has_warranty_opportunity);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.project_id?.toLowerCase().includes(term) ||
        a.analysis?.opportunities?.some(opp => 
          opp.claim_type?.toLowerCase().includes(term)
        )
      );
    }
    
    setFilteredAnalyses(filtered);
  };

  const exportToCSV = () => {
    // Generate CSV content
    const headers = ['Project ID', 'Analyzed Date', 'Has Opportunity', 'Total Recovery', 'Claim Types'];
    const rows = filteredAnalyses.map(a => [
      a.project_id,
      new Date(a.analyzed_at).toLocaleDateString(),
      a.analysis?.has_warranty_opportunity ? 'Yes' : 'No',
      `$${(a.analysis?.total_estimated_recovery || 0).toFixed(2)}`,
      a.analysis?.opportunities?.map(o => o.claim_type).join('; ') || 'None'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warranty-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#124481]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Shield className="mr-3 h-8 w-8 text-[#124481]" />
            Warranty Recovery Dashboard
          </h1>
          <p className="text-gray-600">Track and manage warranty recovery opportunities across your fleet</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyzed</CardTitle>
              <FileText className="h-4 w-4 text-[#124481]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#124481]">{stats.totalAnalyzed}</div>
              <p className="text-xs text-gray-500 mt-1">Work orders reviewed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opportunities Found</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.opportunitiesFound}</div>
              <p className="text-xs text-gray-500 mt-1">Eligible claims identified</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recovery</CardTitle>
              <DollarSign className="h-4 w-4 text-[#289790]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#289790]">
                ${stats.totalRecoveryPotential.toFixed(0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Potential savings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Per Claim</CardTitle>
              <DollarSign className="h-4 w-4 text-[#1E7083]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#1E7083]">
                ${stats.avgRecoveryPerClaim.toFixed(0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Average recovery</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by project ID or claim type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#124481]"
              >
                <option value="all">All Analyses</option>
                <option value="opportunities">With Opportunities</option>
                <option value="no_opportunities">No Opportunities</option>
              </select>

              {/* Export Button */}
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="flex items-center gap-2"
                disabled={filteredAnalyses.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Warranty Analyses List */}
        <div className="space-y-4">
          {filteredAnalyses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {analyses.length === 0 ? 'No Warranty Analyses Yet' : 'No Results Found'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {analyses.length === 0 
                    ? 'Warranty analyses will appear here once you run them on work orders.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {analyses.length === 0 && (
                  <Button onClick={() => navigate('/projects')} className="bg-[#124481] hover:bg-[#1E7083]">
                    <FileText className="mr-2 h-4 w-4" />
                    View Projects
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredAnalyses.map((analysis) => (
              <Card 
                key={analysis.project_id}
                className={`cursor-pointer hover:shadow-lg transition-shadow ${
                  analysis.analysis?.has_warranty_opportunity ? 'border-l-4 border-green-500' : ''
                }`}
                onClick={() => navigate(`/projects/${analysis.project_id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Project: {analysis.project_id.slice(0, 8)}...
                        </h3>
                        {analysis.analysis?.has_warranty_opportunity ? (
                          <Badge className="bg-green-500">
                            Opportunity Found
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Opportunity</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        Analyzed: {new Date(analysis.analyzed_at).toLocaleDateString()} at {new Date(analysis.analyzed_at).toLocaleTimeString()}
                      </div>

                      {analysis.analysis?.opportunities && analysis.analysis.opportunities.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {analysis.analysis.opportunities.map((opp, idx) => (
                            <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-green-900">{opp.claim_type}</span>
                                <Badge variant={opp.confidence === 'High' ? 'default' : 'outline'}>
                                  {opp.confidence} Confidence
                                </Badge>
                              </div>
                              <p className="text-sm text-green-800 mb-2">{opp.reasoning}</p>
                              {opp.estimated_recovery && (
                                <p className="text-sm font-semibold text-green-700">
                                  Est. Recovery: ${opp.estimated_recovery.toFixed(2)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {analysis.analysis?.total_estimated_recovery && (
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-green-600">
                          ${analysis.analysis.total_estimated_recovery.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">Total Recovery</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WarrantyDashboard;
