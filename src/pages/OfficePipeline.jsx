import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  TrendingUp, AlertCircle, Package, CheckCircle, Clock, 
  Truck, User, Calendar, MessageSquare, Filter
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const OfficePipeline = () => {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState({
    queued: [],
    in_progress: [],
    waiting_for_parts: [],
    delayed: [],
    ready_pending: [],
    completed_today: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchPipeline();
    const interval = setInterval(fetchPipeline, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/office/pipeline`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch pipeline');

      const data = await response.json();
      setPipeline(data);
    } catch (error) {
      console.error('Error fetching pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'queued': 'bg-gray-100 text-gray-800 border-gray-300',
      'in_progress': 'bg-blue-100 text-blue-800 border-blue-300',
      'waiting_for_parts': 'bg-orange-100 text-orange-800 border-orange-300',
      'delayed': 'bg-red-100 text-red-800 border-red-300',
      'ready_pending_confirmation': 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getTimeColor = (promisedTime) => {
    if (!promisedTime) return 'text-gray-600';
    
    const promised = new Date(promisedTime);
    const now = new Date();
    const hoursUntil = (promised - now) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) return 'text-red-600 font-bold'; // Overdue
    if (hoursUntil < 4) return 'text-orange-600 font-semibold'; // Due soon
    return 'text-green-600'; // On time
  };

  const getTimeStatus = (promisedTime) => {
    if (!promisedTime) return 'No ETA';
    
    const promised = new Date(promisedTime);
    const now = new Date();
    const hoursUntil = (promised - now) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) return `${Math.abs(Math.floor(hoursUntil))}h OVERDUE`;
    if (hoursUntil < 1) return `${Math.floor(hoursUntil * 60)}m remaining`;
    if (hoursUntil < 24) return `${Math.floor(hoursUntil)}h remaining`;
    return `${Math.floor(hoursUntil / 24)}d remaining`;
  };

  const allJobs = [
    ...pipeline.queued,
    ...pipeline.in_progress,
    ...pipeline.waiting_for_parts,
    ...pipeline.delayed,
    ...pipeline.ready_pending
  ];

  const filteredJobs = activeFilter === 'all' 
    ? allJobs 
    : allJobs.filter(job => job.status === activeFilter);

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Office Pipeline</h1>
          <p className="text-gray-600">Location-wide work order visibility and management</p>
        </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-gray-400 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setActiveFilter(activeFilter === 'queued' ? 'all' : 'queued')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Queued</p>
                <p className="text-3xl font-bold text-gray-900">{pipeline.queued.length}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setActiveFilter(activeFilter === 'in_progress' ? 'all' : 'in_progress')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{pipeline.in_progress.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setActiveFilter(activeFilter === 'waiting_for_parts' ? 'all' : 'waiting_for_parts')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Waiting Parts</p>
                <p className="text-3xl font-bold text-orange-600">{pipeline.waiting_for_parts.length}</p>
              </div>
              <Package className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setActiveFilter(activeFilter === 'ready_pending_confirmation' ? 'all' : 'ready_pending_confirmation')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ready Pending</p>
                <p className="text-3xl font-bold text-purple-600">{pipeline.ready_pending.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-3xl font-bold text-green-600">{pipeline.completed_today}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-3">
        <Button
          onClick={() => navigate('/vehicle-ready/queue')}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Vehicle Ready Queue ({pipeline.ready_pending.length})
        </Button>
        <Button
          onClick={() => navigate('/parts/queue')}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Package className="h-4 w-4 mr-2" />
          Parts Queue ({pipeline.waiting_for_parts.length})
        </Button>
        <Button
          onClick={() => navigate('/work-orders/completions')}
          variant="outline"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Completed Work Orders
        </Button>
      </div>

      {/* Filter Indicator */}
      {activeFilter !== 'all' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-900">
              Filtered by: <strong className="capitalize">{activeFilter.replace(/_/g, ' ')}</strong>
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setActiveFilter('all')}>
            Clear Filter
          </Button>
        </div>
      )}

      {/* Work Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Active Work Orders ({filteredJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading pipeline...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No work orders in this view</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Truck</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promise Time</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        #{job.work_order_number || job.id.substring(0, 8)}
                      </div>
                      {job.customer_name && (
                        <div className="text-xs text-gray-500">{job.customer_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{job.truck_number}</div>
                          <div className="text-xs text-gray-500">{job.truck_make_model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {job.assigned_to_name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.promised_time ? (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {new Date(job.promised_time).toLocaleString()}
                            </div>
                            <div className={`text-xs ${getTimeColor(job.promised_time)}`}>
                              {getTimeStatus(job.promised_time)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No promise time</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/projects/${job.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/projects/${job.id}/messages`)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
};

export default OfficePipeline;
