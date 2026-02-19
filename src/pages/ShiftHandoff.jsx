import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Clock, CheckCircle, AlertCircle, Wrench, Package,
  ArrowRight, FileText, Loader2, RefreshCw
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const ShiftHandoff = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('incoming'); // 'incoming' or 'create'
  const [latestHandoff, setLatestHandoff] = useState(null);
  const [handoffHistory, setHandoffHistory] = useState([]);
  
  // Form state for creating handoff
  const [formData, setFormData] = useState({
    shift_date: new Date().toISOString().split('T')[0],
    shift_type: 'morning',
    active_projects: [],
    completed_tasks: 0,
    pending_tasks: 0,
    blocked_tasks: [],
    safety_incidents: [],
    equipment_issues: [],
    parts_needed: [],
    priority_notes: '',
    next_shift_instructions: ''
  });

  useEffect(() => {
    fetchLatestHandoff();
    fetchHandoffHistory();
  }, []);

  const fetchLatestHandoff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/shift-handoff/latest`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLatestHandoff(data);
      }
    } catch (error) {
      console.error('Error fetching handoff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHandoffHistory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/shift-handoff/history?days=7`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHandoffHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const acknowledgeHandoff = async () => {
    if (!latestHandoff) return;
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/shift-handoff/${latestHandoff.id}/acknowledge`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        alert('Shift handoff acknowledged!');
        await fetchLatestHandoff();
      }
    } catch (error) {
      console.error('Error acknowledging:', error);
      alert('Failed to acknowledge handoff');
    }
  };

  const submitHandoff = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/shift-handoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          supervisor_id: 'current_user_id' // Will be set by backend
        })
      });
      
      if (response.ok) {
        alert('Shift handoff created successfully!');
        setView('incoming');
        await fetchLatestHandoff();
        await fetchHandoffHistory();
      } else {
        alert('Failed to create shift handoff');
      }
    } catch (error) {
      console.error('Error creating handoff:', error);
      alert('Error creating shift handoff');
    }
  };

  const getShiftBadge = (type) => {
    const badges = {
      morning: <Badge className="bg-yellow-500">Morning (6AM-2PM)</Badge>,
      afternoon: <Badge className="bg-orange-500">Afternoon (2PM-10PM)</Badge>,
      night: <Badge className="bg-blue-900">Night (10PM-6AM)</Badge>
    };
    return badges[type] || <Badge>{type}</Badge>;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <RefreshCw className="mr-3 h-8 w-8 text-[#289790]" />
              Shift Handoff
            </h1>
            <p className="text-gray-600 mt-1">Seamless shift transitions & communication</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant={view === 'incoming' ? 'default' : 'outline'}
              onClick={() => setView('incoming')}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Incoming Shift
            </Button>
            <Button
              variant={view === 'create' ? 'default' : 'outline'}
              onClick={() => setView('create')}
              className="bg-[#289790] hover:bg-[#1E7083]"
            >
              <FileText className="mr-2 h-4 w-4" />
              End My Shift
            </Button>
          </div>
        </div>

        {view === 'incoming' && latestHandoff ? (
          <>
            {/* Latest Handoff */}
            <Card className="mb-6">
              <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Latest Shift Handoff</CardTitle>
                    <p className="text-sm opacity-90 mt-1">
                      From: {latestHandoff.supervisor_name} • {new Date(latestHandoff.created_at).toLocaleString()}
                    </p>
                  </div>
                  {getShiftBadge(latestHandoff.shift_type)}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{latestHandoff.active_projects.length}</p>
                    <p className="text-sm text-gray-600">Active Projects</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{latestHandoff.completed_tasks}</p>
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">{latestHandoff.pending_tasks}</p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{latestHandoff.blocked_tasks.length}</p>
                    <p className="text-sm text-gray-600">Blocked</p>
                  </div>
                </div>

                {/* Priority Notes */}
                {latestHandoff.priority_notes && (
                  <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                    <h3 className="font-bold text-orange-800 mb-2 flex items-center">
                      <AlertCircle className="mr-2 h-5 w-5" />
                      Priority Notes
                    </h3>
                    <p className="text-gray-700">{latestHandoff.priority_notes}</p>
                  </div>
                )}

                {/* Next Shift Instructions */}
                {latestHandoff.next_shift_instructions && (
                  <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <h3 className="font-bold text-blue-800 mb-2 flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Instructions for Next Shift
                    </h3>
                    <p className="text-gray-700">{latestHandoff.next_shift_instructions}</p>
                  </div>
                )}

                {/* Blocked Tasks */}
                {latestHandoff.blocked_tasks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                      <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
                      Tasks Requiring Attention
                    </h3>
                    <div className="space-y-2">
                      {latestHandoff.blocked_tasks.map((task, idx) => (
                        <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                          <p className="font-semibold text-red-900">{task.title || 'Task'}</p>
                          <p className="text-sm text-red-700">{task.reason || 'Blocked'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equipment Issues */}
                {latestHandoff.equipment_issues.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Wrench className="mr-2 h-5 w-5 text-orange-600" />
                      Equipment Issues
                    </h3>
                    <ul className="space-y-1">
                      {latestHandoff.equipment_issues.map((issue, idx) => (
                        <li key={idx} className="text-gray-700">• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Parts Needed */}
                {latestHandoff.parts_needed.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Package className="mr-2 h-5 w-5 text-blue-600" />
                      Parts Needed
                    </h3>
                    <ul className="space-y-1">
                      {latestHandoff.parts_needed.map((part, idx) => (
                        <li key={idx} className="text-gray-700">• {part}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Safety Incidents */}
                {latestHandoff.safety_incidents.length > 0 && (
                  <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 rounded">
                    <h3 className="font-bold text-red-900 mb-3 flex items-center">
                      ⚠️ Safety Incidents Reported
                    </h3>
                    {latestHandoff.safety_incidents.map((incident, idx) => (
                      <div key={idx} className="mb-2 p-2 bg-white rounded">
                        <p className="font-semibold text-red-800">{incident.type}</p>
                        <p className="text-sm text-red-700">{incident.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acknowledge Button */}
                {!latestHandoff.acknowledged_by && (
                  <Button
                    onClick={acknowledgeHandoff}
                    className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Acknowledge Handoff & Start Shift
                  </Button>
                )}

                {latestHandoff.acknowledged_by && (
                  <div className="text-center py-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-900">Handoff Acknowledged</p>
                    <p className="text-sm text-green-700">
                      {new Date(latestHandoff.acknowledged_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : view === 'incoming' ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600">No shift handoffs yet</p>
              <p className="text-sm text-gray-500 mt-2">The previous shift supervisor will create one at shift end</p>
            </CardContent>
          </Card>
        ) : null}

        {view === 'create' && (
          <Card>
            <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
              <CardTitle className="text-2xl">Create Shift Handoff</CardTitle>
              <p className="text-sm opacity-90 mt-1">Document your shift for the next supervisor</p>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Shift Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift Date</label>
                  <Input
                    type="date"
                    value={formData.shift_date}
                    onChange={(e) => setFormData({...formData, shift_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift Type</label>
                  <select
                    value={formData.shift_type}
                    onChange={(e) => setFormData({...formData, shift_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="morning">Morning (6AM-2PM)</option>
                    <option value="afternoon">Afternoon (2PM-10PM)</option>
                    <option value="night">Night (10PM-6AM)</option>
                  </select>
                </div>
              </div>

              {/* Task Counts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Completed Tasks</label>
                  <Input
                    type="number"
                    value={formData.completed_tasks}
                    onChange={(e) => setFormData({...formData, completed_tasks: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pending Tasks</label>
                  <Input
                    type="number"
                    value={formData.pending_tasks}
                    onChange={(e) => setFormData({...formData, pending_tasks: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
              </div>

              {/* Priority Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Notes (Critical Items)
                </label>
                <Textarea
                  value={formData.priority_notes}
                  onChange={(e) => setFormData({...formData, priority_notes: e.target.value})}
                  rows={3}
                  placeholder="Urgent issues, critical tasks, important updates..."
                />
              </div>

              {/* Next Shift Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions for Next Shift
                </label>
                <Textarea
                  value={formData.next_shift_instructions}
                  onChange={(e) => setFormData({...formData, next_shift_instructions: e.target.value})}
                  rows={4}
                  placeholder="What the next shift needs to know, follow-up actions, special considerations..."
                />
              </div>

              {/* Submit */}
              <Button
                onClick={submitHandoff}
                className="w-full h-14 text-lg bg-[#289790] hover:bg-[#1E7083]"
              >
                <FileText className="mr-2 h-5 w-5" />
                Submit Shift Handoff
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Handoff History */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Handoff History (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {handoffHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No handoff history available</p>
            ) : (
              <div className="space-y-3">
                {handoffHistory.map((handoff) => (
                  <div key={handoff.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{handoff.supervisor_name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(handoff.created_at).toLocaleDateString()} - {getShiftBadge(handoff.shift_type)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {handoff.completed_tasks} completed • {handoff.pending_tasks} pending
                        </p>
                        {handoff.acknowledged_by && (
                          <Badge className="bg-green-500 mt-1">Acknowledged</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShiftHandoff;
