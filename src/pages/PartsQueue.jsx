import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, AlertCircle, CheckCircle, Truck, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import Navigation from '../components/Navigation';
import { BACKEND_URL } from '../lib/config';

const PartsQueue = () => {
  const navigate = useNavigate();
  const [partsRequests, setPartsRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchPartsRequests();
  }, [filter]);

  const fetchPartsRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/parts-requests?status=${filter}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch parts requests');

      const data = await response.json();
      setPartsRequests(data ?? []);
    } catch (error) {
      console.error('Error fetching parts requests:', error);
      setPartsRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, status, eta = null) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/parts-requests/${requestId}/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ status, eta })
        }
      );

      if (!response.ok) throw new Error('Failed to update status');

      await fetchPartsRequests();
      alert('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const urgencyColors = {
    normal: 'bg-gray-100 text-gray-800',
    urgent: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    ordered: 'bg-blue-100 text-blue-800',
    received: 'bg-green-100 text-green-800'
  };

  return (
    <>
      <Navigation />
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parts Request Queue</h1>
          <p className="text-gray-600">Manage parts orders for work orders</p>
        </div>
        <Badge className="bg-yellow-500 text-white px-4 py-2 text-lg">
          {(partsRequests ?? []).filter(r => r?.status === 'pending').length} Pending
        </Badge>
      </div>

      <div className="flex space-x-2">
        {['pending', 'ordered', 'received', 'all'].map(status => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Loading parts requests...
            </CardContent>
          </Card>
        ) : (partsRequests ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No parts requests in this category</p>
            </CardContent>
          </Card>
        ) : (
          (partsRequests ?? []).map((request) => (
            <Card key={request.request_id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        WO #{request.work_order_number || request.project_id.substring(0, 8)}
                      </h3>
                      <Badge className={statusColors[request.status]}>
                        {request.status}
                      </Badge>
                      {request.has_urgent_parts && (
                        <Badge className="bg-red-500 text-white">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 mr-1" />
                        {request.truck_number}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        Requested by {request.requested_by_email}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(request.requested_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/projects/${request.project_id}`)}
                  >
                    View Work Order
                  </Button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Parts Needed:</h4>
                  <div className="space-y-2">
                    {(request?.parts ?? []).map((part, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{part.part_number}</div>
                          <div className="text-sm text-gray-600">{part.description}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">Qty: {part.quantity}</span>
                          <Badge className={urgencyColors[part.urgency]}>
                            {part.urgency}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {request.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700">
                      <strong>Notes:</strong> {request.notes}
                    </p>
                  </div>
                )}

                {request.estimated_eta && (
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <Calendar className="h-4 w-4 mr-2" />
                    Estimated arrival: {new Date(request.estimated_eta).toLocaleDateString()}
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex space-x-2 pt-4 border-t">
                    <Button
                      size="sm"
                      onClick={() => {
                        const eta = prompt('Enter estimated arrival date (YYYY-MM-DD):');
                        if (eta) updateRequestStatus(request.request_id, 'ordered', eta);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Mark as Ordered
                    </Button>
                  </div>
                )}

                {request.status === 'ordered' && (
                  <div className="flex space-x-2 pt-4 border-t">
                    <Button
                      size="sm"
                      onClick={() => updateRequestStatus(request.request_id, 'received')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark as Received
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
    </>
  );
};

export default PartsQueue;
