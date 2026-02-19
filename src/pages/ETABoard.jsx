import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  AlertCircle, Clock, Calendar, Truck, User, 
  MessageSquare, Edit2, Save
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const ETABoard = () => {
  const navigate = useNavigate();
  const [delays, setDelays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDelay, setEditingDelay] = useState(null);
  const [newETA, setNewETA] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [notes, setNotes] = useState('');

  const delayReasons = [
    'Parts delay',
    'Additional fault found',
    'Capacity/scheduling',
    'Customer hold',
    'Waiting for approval',
    'Other'
  ];

  useEffect(() => {
    fetchDelays();
    const interval = setInterval(fetchDelays, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDelays = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/office/eta-board`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch delays');

      const data = await response.json();
      setDelays(data);
    } catch (error) {
      console.error('Error fetching delays:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateETA = async (projectId) => {
    if (!newETA || !delayReason) {
      alert('Please provide new ETA and reason');
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/${projectId}/update-eta`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            new_promised_time: newETA,
            delay_reason: delayReason,
            notes
          })
        }
      );

      if (!response.ok) throw new Error('Failed to update ETA');

      alert('ETA updated successfully');
      setEditingDelay(null);
      setNewETA('');
      setDelayReason('');
      setNotes('');
      await fetchDelays();
    } catch (error) {
      console.error('Error updating ETA:', error);
      alert('Failed to update ETA');
    }
  };

  const markDelayed = async (projectId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/${projectId}/mark-delayed`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to mark delayed');

      await fetchDelays();
    } catch (error) {
      console.error('Error marking delayed:', error);
      alert('Failed to mark as delayed');
    }
  };

  const getOverdueHours = (promisedTime) => {
    if (!promisedTime) return 0;
    const promised = new Date(promisedTime);
    const now = new Date();
    const diffMs = now - promised;
    return Math.floor(diffMs / (1000 * 60 * 60));
  };

  const getSeverityColor = (hours) => {
    if (hours < 4) return 'border-yellow-400 bg-yellow-50';
    if (hours < 12) return 'border-orange-400 bg-orange-50';
    return 'border-red-400 bg-red-50';
  };

  return (
    <>
      <Navigation />
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ETA Board</h1>
        <p className="text-gray-600">Manage delays and update customer promise times</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due Soon</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {delays.filter(d => getOverdueHours(d.promised_time) < 4).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue (4-12h)</p>
                <p className="text-3xl font-bold text-orange-600">
                  {delays.filter(d => {
                    const h = getOverdueHours(d.promised_time);
                    return h >= 4 && h < 12;
                  }).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical (12h+)</p>
                <p className="text-3xl font-bold text-red-600">
                  {delays.filter(d => getOverdueHours(d.promised_time) >= 12).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-3 mt-0.5" />
            <div className="text-sm text-orange-900">
              <p className="font-semibold mb-1">Delay Management</p>
              <p>All delays must have a reason code and new promise time. This ensures accurate customer communication and tracking.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delays List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Loading delays...
            </CardContent>
          </Card>
        ) : delays.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No overdue or at-risk work orders</p>
            </CardContent>
          </Card>
        ) : (
          delays.map((delay) => {
            const overdueHours = getOverdueHours(delay.promised_time);
            const isEditing = editingDelay === delay.id;

            return (
              <Card 
                key={delay.id} 
                className={`border-l-4 ${getSeverityColor(overdueHours)}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          WO #{delay.work_order_number || delay.id.substring(0, 8)}
                        </h3>
                        {overdueHours > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {overdueHours}h OVERDUE
                          </Badge>
                        )}
                        {delay.status === 'delayed' && (
                          <Badge className="bg-orange-100 text-orange-800">
                            Marked Delayed
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Truck className="h-4 w-4 mr-2" />
                          <div>
                            <div className="font-medium text-gray-900">{delay.truck_number}</div>
                            <div className="text-xs">{delay.truck_make_model}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          <span>{delay.assigned_to_name || 'Unassigned'}</span>
                        </div>
                      </div>

                      {delay.promised_time && (
                        <div className="flex items-center text-sm mb-3">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">Original Promise: </span>
                          <span className="ml-2 text-gray-700">
                            {new Date(delay.promised_time).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {delay.complaint && (
                        <div className="bg-white p-3 rounded border mb-3">
                          <p className="text-sm text-gray-700">
                            <strong>Issue:</strong> {delay.complaint}
                          </p>
                        </div>
                      )}

                      {delay.delay_history && delay.delay_history.length > 0 && (
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Delay History:</p>
                          {delay.delay_history.map((hist, idx) => (
                            <div key={idx} className="text-xs text-gray-600 mb-1">
                              {new Date(hist.updated_at).toLocaleString()} - {hist.reason} - {hist.updated_by}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="border-t pt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Promise Time *
                        </label>
                        <Input
                          type="datetime-local"
                          value={newETA}
                          onChange={(e) => setNewETA(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delay Reason *
                        </label>
                        <select
                          value={delayReason}
                          onChange={(e) => setDelayReason(e.target.value)}
                          className="w-full border rounded-md p-2"
                        >
                          <option value="">Select reason...</option>
                          {delayReasons.map(reason => (
                            <option key={reason} value={reason}>{reason}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes (optional)
                        </label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          placeholder="Additional details..."
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => updateETA(delay.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save New ETA
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingDelay(null);
                            setNewETA('');
                            setDelayReason('');
                            setNotes('');
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center pt-4 border-t">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/projects/${delay.id}`)}
                      >
                        View Work Order
                      </Button>
                      <div className="flex space-x-2">
                        {delay.status !== 'delayed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markDelayed(delay.id)}
                            className="border-orange-500 text-orange-600"
                          >
                            Mark as Delayed
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => setEditingDelay(delay.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Update ETA
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
    </>
  );
};

export default ETABoard;
