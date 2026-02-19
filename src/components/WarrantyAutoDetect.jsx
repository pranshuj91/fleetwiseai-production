import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  DollarSign, AlertCircle, CheckCircle, TrendingUp,
  FileText, Clock, Sparkles
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const WarrantyAutoDetect = () => {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_potential: 0,
    claims_filed: 0,
    pending_review: 0
  });

  useEffect(() => {
    fetchWarrantyOpportunities();
    const interval = setInterval(fetchWarrantyOpportunities, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchWarrantyOpportunities = async () => {
    // Skip if no backend URL configured
    if (!BACKEND_URL) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/warranty/auto-detect`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setOpportunities(data.opportunities || []);
          setStats(data.stats || {});
        }
      }
    } catch (error) {
      console.error('Error fetching warranty opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fileWarrantyClaim = async (projectId) => {
    if (!confirm('File warranty claim for this repair?')) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/warranty/auto-file/${projectId}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        alert('Warranty claim filed successfully!');
        fetchWarrantyOpportunities();
      }
    } catch (error) {
      console.error('Error filing claim:', error);
      alert('Failed to file warranty claim');
    }
  };

  const dismissOpportunity = async (projectId) => {
    try {
      await fetch(
        `${BACKEND_URL}/api/warranty/dismiss/${projectId}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      fetchWarrantyOpportunities();
    } catch (error) {
      console.error('Error dismissing:', error);
    }
  };

  if (loading) {
    return null;
  }

  if (opportunities.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse" />
            💰 Warranty Recovery Opportunities
          </CardTitle>
          <Badge className="bg-white text-green-700 font-bold">
            ${stats.total_potential.toLocaleString()} Available
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-white rounded-lg border border-green-200">
            <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">
              ${stats.total_potential.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">Potential Recovery</p>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
            <CheckCircle className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{stats.claims_filed}</p>
            <p className="text-xs text-gray-600">Filed This Month</p>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border border-orange-200">
            <Clock className="h-6 w-6 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-600">{opportunities.length}</p>
            <p className="text-xs text-gray-600">Pending Review</p>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-green-600" />
            AI-Detected Warranty Claims
          </h3>
          
          {opportunities.slice(0, 5).map((opp, index) => (
            <div 
              key={index}
              className="bg-white border-l-4 border-green-500 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-green-600">
                      ${opp.potential_value?.toLocaleString() || 0}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {opp.confidence}% confidence
                    </Badge>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {opp.truck_number} - {opp.component}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    {opp.reason}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>🔧 {opp.repair_type}</span>
                    <span>📅 {new Date(opp.repair_date).toLocaleDateString()}</span>
                    <span>📍 {opp.mileage?.toLocaleString()} mi</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => fileWarrantyClaim(opp.project_id)}
                    className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    File Claim
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/projects/${opp.project_id}`)}
                    className="whitespace-nowrap"
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissOpportunity(opp.project_id)}
                    className="text-xs"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              
              {opp.warranty_info && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                  <strong>Coverage:</strong> {opp.warranty_info.coverage_type} - 
                  Valid until {new Date(opp.warranty_info.expiry_date).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>

        {opportunities.length > 5 && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => navigate('/warranty')}
          >
            View All {opportunities.length} Opportunities
          </Button>
        )}

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <strong>🤖 AI-Powered Detection:</strong> Our system automatically scans completed repairs 
          and identifies warranty-eligible work based on component failures, mileage, and warranty terms. 
          File claims with one click!
        </div>
      </CardContent>
    </Card>
  );
};

export default WarrantyAutoDetect;
