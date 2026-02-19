import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { estimateAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  FileText, Loader2, Clock, CheckCircle, Send, XCircle, Plus
} from 'lucide-react';

const EstimateList = () => {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchEstimates();
  }, [filter]);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const params = filter ? { status: filter } : {};
      const response = await estimateAPI.list(params);
      setEstimates(response?.data ?? []);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-600 text-white',
      declined: 'bg-red-100 text-red-700',
      expired: 'bg-orange-100 text-orange-700',
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Send className="h-3 w-3" />;
      case 'approved':
        return <CheckCircle className="h-3 w-3" />;
      case 'declined':
        return <XCircle className="h-3 w-3" />;
      case 'expired':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const calculateStats = () => {
    const safeEstimates = estimates ?? [];
    const total = safeEstimates.reduce((sum, est) => sum + (est?.estimated_total ?? 0), 0);
    const approved = safeEstimates.filter(e => e?.status === 'approved').reduce((sum, est) => sum + (est?.estimated_total ?? 0), 0);
    const pending = safeEstimates.filter(e => e?.status === 'sent').reduce((sum, est) => sum + (est?.estimated_total ?? 0), 0);
    
    return { total: total ?? 0, approved: approved ?? 0, pending: pending ?? 0, count: safeEstimates.length };
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
              <FileText className="mr-3 h-8 w-8 text-[#124481]" />
              Estimates
            </h1>
            <p className="text-gray-600 mt-1">Customer estimates and approvals</p>
          </div>
          <Button 
            onClick={() => navigate('/estimates/create')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Estimate
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Estimates</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
                </div>
                <FileText className="h-8 w-8 text-[#124481]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.total.toFixed(0)}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">$</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">${stats.approved.toFixed(0)}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-blue-600">${stats.pending.toFixed(0)}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
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
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
            size="sm"
          >
            Approved
          </Button>
        </div>

        {/* Estimate List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
          </div>
        ) : estimates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No estimates found</h3>
              <p className="text-gray-600 mb-4">Create estimates from work orders to send to customers</p>
              <Button onClick={() => navigate('/projects')} className="bg-[#124481] hover:bg-[#1E7083]">
                View Work Orders
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {estimates.map((estimate) => (
              <Card 
                key={estimate.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/estimates/${estimate.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-[#124481] bg-opacity-10 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-[#124481]" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {estimate.estimate_number}
                          </h3>
                          <Badge className={getStatusColor(estimate.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(estimate.status)}
                              {estimate.status.toUpperCase()}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {estimate.customer_name || 'No customer'} • Created {new Date(estimate.created_at).toLocaleDateString()}
                        </p>
                        {estimate.valid_until && (
                          <p className="text-sm text-gray-500 mt-1">
                            Valid until: {new Date(estimate.valid_until).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-2xl font-bold text-[#124481]">
                        ${(estimate?.estimated_total ?? 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {estimate?.labor_items?.length ?? 0} labor • {estimate?.parts?.length ?? 0} parts
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

export default EstimateList;
