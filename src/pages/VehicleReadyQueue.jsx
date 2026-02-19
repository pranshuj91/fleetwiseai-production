import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Truck, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Navigation from '../components/Navigation';
import { BACKEND_URL } from '../lib/config';

const VehicleReadyQueue = () => {
  const navigate = useNavigate();
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingConfirmations();
  }, []);

  const fetchPendingConfirmations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/pending-confirmation`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch pending confirmations');

      const data = await response.json();
      setPendingConfirmations(data);
    } catch (error) {
      console.error('Error fetching pending confirmations:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmReady = async (projectId) => {
    if (!window.confirm('Confirm this vehicle is ready and notify customer?')) {
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/${projectId}/confirm-ready`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to confirm');

      alert('Vehicle confirmed ready! Customer notified.');
      await fetchPendingConfirmations();
    } catch (error) {
      console.error('Error confirming:', error);
      alert('Failed to confirm vehicle ready');
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hrs ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  return (
    <>
      <Navigation />
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Ready Queue</h1>
          <p className="text-gray-600">Confirm vehicles ready for customer pickup</p>
        </div>
        <Badge className="bg-purple-500 text-white px-4 py-2 text-lg">
          {pendingConfirmations.length} Pending Confirmation
        </Badge>
      </div>

      {pendingConfirmations.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
              <div className="text-sm text-purple-900">
                <p className="font-semibold mb-1">Action Required</p>
                <p>These vehicles have been proposed as ready by shop floor. Review and confirm to notify customers.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Loading pending confirmations...
            </CardContent>
          </Card>
        ) : pendingConfirmations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No vehicles pending confirmation</p>
            </CardContent>
          </Card>
        ) : (
          pendingConfirmations.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        WO #{project.work_order_number || project.id.substring(0, 8)}
                      </h3>
                      <Badge className="bg-purple-100 text-purple-800">
                        Pending Confirmation
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {project.truck_info?.truck_number || 'Unknown'}
                          </div>
                          <div className="text-xs">{project.truck_info?.make_model}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium text-gray-900">
                            Proposed {getTimeAgo(project.proposed_ready_at)}
                          </div>
                          <div className="text-xs">
                            {new Date(project.proposed_ready_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {project.complaint && (
                      <div className="bg-gray-50 p-3 rounded mb-3">
                        <p className="text-sm text-gray-700">
                          <strong>Complaint:</strong> {project.complaint}
                        </p>
                      </div>
                    )}

                    {project.diagnostic_notes && (
                      <div className="bg-gray-50 p-3 rounded mb-3">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          <strong>Diagnostic Notes:</strong> {project.diagnostic_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-1" />
                    Proposed by: {project.proposed_ready_by || 'Unknown'}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => confirmReady(project.id)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm Ready & Notify Customer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
    </>
  );
};

export default VehicleReadyQueue;
