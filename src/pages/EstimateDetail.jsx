import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { estimateAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, FileText, Loader2, Send, CheckCircle, Calendar
} from 'lucide-react';

const EstimateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEstimate();
  }, [id]);

  const fetchEstimate = async () => {
    try {
      const response = await estimateAPI.get(id);
      setEstimate(response.data);
    } catch (error) {
      console.error('Error fetching estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setActionLoading(true);
    try {
      await estimateAPI.send(id);
      fetchEstimate();
    } catch (error) {
      console.error('Error sending estimate:', error);
      alert('Failed to send estimate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this estimate?')) return;
    
    setActionLoading(true);
    try {
      await estimateAPI.approve(id);
      fetchEstimate();
    } catch (error) {
      console.error('Error approving estimate:', error);
      alert('Failed to approve estimate');
    } finally {
      setActionLoading(false);
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

  const isExpired = () => {
    if (!estimate?.valid_until) return false;
    return new Date(estimate.valid_until) < new Date();
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

  if (!estimate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Estimate not found</h3>
              <Button onClick={() => navigate('/estimates')}>Back to Estimates</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/estimates')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Estimates
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="mr-3 h-8 w-8 text-[#124481]" />
                Estimate {estimate.estimate_number}
              </h1>
              <p className="text-gray-600 mt-1">
                Created {new Date(estimate.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge className={getStatusColor(estimate.status)}>
              {estimate.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          {estimate.status === 'draft' && (
            <Button
              onClick={handleSend}
              disabled={actionLoading}
              className="bg-[#124481] hover:bg-[#1E7083]"
            >
              <Send className="mr-2 h-4 w-4" />
              Send to Customer
            </Button>
          )}
          {(estimate.status === 'sent') && !isExpired() && (
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Estimate
            </Button>
          )}
        </div>

        {/* Expired Warning */}
        {isExpired() && estimate.status !== 'approved' && (
          <Card className="mb-6 border-orange-500 bg-orange-50">
            <CardContent className="py-4">
              <p className="text-orange-800 flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                This estimate expired on {new Date(estimate.valid_until).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Estimate Document */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">ESTIMATE</CardTitle>
                <p className="text-sm opacity-90">Fleetwise AI</p>
                <p className="text-sm opacity-90">Fleet Maintenance Solutions</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{estimate.estimate_number}</div>
                <div className="text-sm opacity-90 mt-1">
                  {new Date(estimate.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Customer Info */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-semibold text-gray-900 mb-2">Estimate For:</h3>
              <p className="text-lg font-medium">{estimate.customer_name || 'N/A'}</p>
              {estimate.customer_email && (
                <p className="text-sm text-gray-600">{estimate.customer_email}</p>
              )}
              {estimate.truck_info && (
                <p className="text-sm text-gray-600 mt-1">
                  {estimate.truck_info.year} {estimate.truck_info.make} {estimate.truck_info.model}
                  {estimate.truck_info.truck_number && ` • Truck #${estimate.truck_info.truck_number}`}
                  {estimate.truck_info.vin && (
                    <span className="block mt-1">VIN: {estimate.truck_info.vin}</span>
                  )}
                </p>
              )}
            </div>

            {/* Valid Until */}
            {estimate.valid_until && (
              <div className="mb-6 pb-6 border-b">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                  <span className="text-gray-600">Valid Until: </span>
                  <span className={`ml-2 font-medium ${isExpired() ? 'text-red-600' : 'text-gray-900'}`}>
                    {new Date(estimate.valid_until).toLocaleDateString()}
                    {isExpired() && ' (Expired)'}
                  </span>
                </div>
              </div>
            )}

            {/* Labor Items */}
            {estimate.labor_items && estimate.labor_items.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Labor</h3>
                <div className="space-y-2">
                  {estimate.labor_items.map((labor, idx) => (
                    <div key={idx} className="flex justify-between items-start py-2 border-b border-gray-100">
                      <div className="flex-1">
                        <p className="font-medium">{labor.description}</p>
                        <p className="text-sm text-gray-600">
                          {labor.hours} hours × ${labor.rate.toFixed(2)}/hr
                        </p>
                      </div>
                      <span className="font-semibold">${labor.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <span className="font-semibold">Labor Subtotal:</span>
                  <span className="font-bold text-green-600">${estimate.subtotal_labor.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Parts */}
            {estimate.parts && estimate.parts.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Parts</h3>
                <div className="space-y-2">
                  {estimate.parts.map((part, idx) => (
                    <div key={idx} className="flex justify-between items-start py-2 border-b border-gray-100">
                      <div className="flex-1">
                        <p className="font-medium">{part.part_name}</p>
                        <p className="text-sm text-gray-600">
                          {part.part_number} • Qty: {part.quantity} × ${part.unit_price.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-semibold">${part.total_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <span className="font-semibold">Parts Subtotal:</span>
                  <span className="font-bold text-green-600">${estimate.subtotal_parts.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t-2 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">Estimated Total:</span>
                <span className="text-3xl font-bold text-[#124481]">
                  ${estimate.estimated_total.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2 text-right">
                Plus applicable taxes and fees
              </p>
            </div>

            {/* Notes */}
            {estimate.notes && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-2">Notes:</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{estimate.notes}</p>
              </div>
            )}

            {/* Status Info */}
            <div className="mt-6 pt-6 border-t bg-gray-50 -mx-6 px-6 py-4 text-sm text-gray-600">
              {estimate.status === 'approved' && estimate.approved_at && (
                <div className="flex items-center text-green-600 font-semibold mb-2">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approved on {new Date(estimate.approved_at).toLocaleDateString()}
                </div>
              )}
              {estimate.status === 'sent' && estimate.sent_at && (
                <p className="mb-2">
                  Sent to customer on {new Date(estimate.sent_at).toLocaleDateString()}
                </p>
              )}
              <p>This estimate is valid for the work described above.</p>
              <p className="mt-1">Actual costs may vary based on additional diagnostics.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EstimateDetail;
