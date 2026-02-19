import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Clock, Truck, AlertCircle, Package, CheckCircle, 
  Play, Pause, Coffee, Wrench, Plus
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const TechnicianMobile = () => {
  const navigate = useNavigate();
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState(null);
  const [showNonBillable, setShowNonBillable] = useState(false);

  useEffect(() => {
    fetchMyJobs();
    const interval = setInterval(fetchMyJobs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/my-jobs`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch jobs');

      const data = await response.json();
      setMyJobs(data);

      // Check for active timer
      const active = data.find(job => job.time_started && !job.time_ended);
      setActiveTimer(active?.id || null);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const startJob = async (jobId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/${jobId}/start-time`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to start job');

      await fetchMyJobs();
    } catch (error) {
      console.error('Error starting job:', error);
      alert('Failed to start job');
    }
  };

  const endJob = async (jobId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/${jobId}/end-time`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to end job');

      // Show between-jobs prompt
      setShowNonBillable(true);
      await fetchMyJobs();
    } catch (error) {
      console.error('Error ending job:', error);
      alert('Failed to end job');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'queued': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'waiting_for_parts': 'bg-orange-100 text-orange-800',
      'ready_pending_confirmation': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatElapsedTime = (startTime) => {
    if (!startTime) return '0:00';
    const now = new Date();
    const start = new Date(startTime);
    const diffMs = now - start;
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#124481] to-[#289790] text-white p-4 sticky top-0 z-10 shadow-lg">
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <p className="text-blue-100 text-sm">Active work orders assigned to you</p>
      </div>

      {/* Active Job Alert */}
      {activeTimer && (
        <div className="bg-blue-600 text-white p-3 text-center text-sm font-medium">
          <Clock className="inline h-4 w-4 mr-2" />
          Timer running on job {myJobs.find(j => j.id === activeTimer)?.work_order_number}
        </div>
      )}

      {/* Job Cards */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading your jobs...
          </div>
        ) : myJobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Coffee className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No active jobs</p>
              <p className="text-sm mt-1">Check back soon or contact your supervisor</p>
            </CardContent>
          </Card>
        ) : (
          myJobs.map((job) => {
            const isActive = job.time_started && !job.time_ended;
            const needsAction = job.status === 'waiting_for_parts' || job.status === 'ready_pending_confirmation';

            return (
              <Card 
                key={job.id} 
                className={`${isActive ? 'border-l-4 border-l-blue-500 shadow-lg' : ''} ${needsAction ? 'border-orange-200' : ''}`}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-900">
                          WO #{job.work_order_number || job.id.substring(0, 8)}
                        </h3>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Truck className="h-4 w-4 mr-1" />
                        {job.truck_number} • {job.truck_make_model}
                      </div>
                    </div>
                  </div>

                  {/* Complaint */}
                  {job.complaint && (
                    <div className="bg-gray-50 p-3 rounded mb-3">
                      <p className="text-sm text-gray-700">
                        <strong>Issue:</strong> {job.complaint}
                      </p>
                    </div>
                  )}

                  {/* Timer Display */}
                  {isActive && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-semibold text-blue-900">Time Working:</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {formatElapsedTime(job.time_started)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Parts Alert */}
                  {job.status === 'waiting_for_parts' && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-3 flex items-center">
                      <Package className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="text-sm text-orange-900">
                        <strong>Parts requested</strong> - Work paused until arrival
                      </span>
                    </div>
                  )}

                  {/* Ready Pending Alert */}
                  {job.status === 'ready_pending_confirmation' && (
                    <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-3 flex items-center">
                      <CheckCircle className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="text-sm text-purple-900">
                        <strong>Proposed ready</strong> - Awaiting office confirmation
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {!isActive && job.status === 'in_progress' && (
                      <Button
                        onClick={() => startJob(job.id)}
                        className="bg-green-600 hover:bg-green-700 col-span-2"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Work
                      </Button>
                    )}

                    {isActive && (
                      <Button
                        onClick={() => endJob(job.id)}
                        variant="destructive"
                        className="col-span-2"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        End Work
                      </Button>
                    )}

                    <Button
                      onClick={() => navigate(`/projects/${job.id}`)}
                      variant="outline"
                      className="col-span-2"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Open Diagnostic
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Between Jobs Modal */}
      {showNonBillable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <Coffee className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Job Complete!</h2>
                <p className="text-gray-600 text-sm">
                  Are you doing any non-billable work before your next job?
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setShowNonBillable(false);
                    navigate('/time-tracking/non-billable');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Log Non-Billable Time
                </Button>
                <Button
                  onClick={() => setShowNonBillable(false)}
                  variant="outline"
                  className="w-full"
                >
                  No, I'm Ready for Next Job
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => navigate('/time-tracking/non-billable')}
          className="rounded-full h-14 w-14 bg-[#289790] hover:bg-[#1E7083] shadow-lg"
          title="Log non-billable time"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default TechnicianMobile;
