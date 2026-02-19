import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  DollarSign, FileText, Search, Filter, Download,
  Clock, CheckCircle, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const WarrantyClaimsList = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    approved: 0,
    totalRecovered: 0
  });
  
  useEffect(() => {
    fetchClaims();
  }, [statusFilter]);
  
  const fetchClaims = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? `?status_filter=${statusFilter}` : '';
      const response = await fetch(`${BACKEND_URL}/api/warranty/claims${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const safeData = data ?? [];
        setClaims(safeData);
        
        // Calculate stats
        setStats({
          total: safeData.length,
          submitted: safeData.filter(c => c?.status === 'submitted' || c?.status === 'under_review').length,
          approved: safeData.filter(c => c?.status === 'approved' || c?.status === 'paid').length,
          totalRecovered: safeData
            .filter(c => c?.status === 'approved' || c?.status === 'paid')
            .reduce((sum, c) => sum + (c?.approved_amount ?? c?.total_claim_amount ?? 0), 0)
        });
      } else {
        setClaims([]);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      draft: <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>,
      submitted: <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>,
      under_review: <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Under Review</Badge>,
      approved: <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>,
      denied: <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>,
      paid: <Badge className="bg-emerald-600"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
  };
  
  const downloadClaimPDF = async (claimId, claimNumber) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/warranty/claims/${claimId}/generate-pdf`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `warranty_claim_${claimNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };
  
  const filteredClaims = (claims ?? []).filter(claim =>
    (claim?.claim_number ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (claim?.claim_type ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <DollarSign className="mr-3 h-8 w-8 text-[#289790]" />
              Warranty Claims
            </h1>
            <p className="text-gray-600 mt-1">Track and manage warranty recovery</p>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Claims</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                <p className="text-3xl font-bold text-blue-600">{stats.submitted}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Approved</p>
                <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm opacity-90 mb-1">Total Recovered</p>
                <p className="text-3xl font-bold">${(stats?.totalRecovered ?? 0).toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by claim number or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#289790]"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Claims List */}
        <div className="space-y-4">
          {filteredClaims.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No warranty claims found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchTerm ? 'Try adjusting your search' : 'Create your first warranty claim to get started'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredClaims.map((claim) => (
              <Card key={claim.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {claim.claim_number}
                        </h3>
                        {getStatusBadge(claim.status)}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{claim.claim_type}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Parts</p>
                          <p className="font-semibold">
                            ${(claim?.parts_claimed ?? []).reduce((sum, p) => sum + ((p?.quantity ?? 0) * (p?.cost ?? 0)), 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Labor</p>
                          <p className="font-semibold">
                            ${((claim?.labor_hours_claimed ?? 0) * (claim?.labor_rate ?? 0)).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Claimed</p>
                          <p className="font-semibold text-[#124481]">
                            ${(claim?.total_claim_amount ?? 0).toFixed(2)}
                          </p>
                        </div>
                        {claim?.approved_amount != null && (
                          <div>
                            <p className="text-gray-500">Approved</p>
                            <p className="font-semibold text-green-600">
                              ${(claim?.approved_amount ?? 0).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {claim.denial_reason && (
                        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                          <p className="text-sm text-red-800">
                            <strong>Denial Reason:</strong> {claim.denial_reason}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/warranty/claims/${claim.id}`)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadClaimPDF(claim.id, claim.claim_number)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </div>
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

export default WarrantyClaimsList;
