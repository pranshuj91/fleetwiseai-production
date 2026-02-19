import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Users, CheckCircle, Clock, AlertCircle, Plus,
  Eye, ThumbsUp, ThumbsDown, Loader2, Activity
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shopStatus, setShopStatus] = useState({ technicians: [], summary: {} });
  const [selectedTech, setSelectedTech] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showCreateTask, setShowCreateTask] = useState(false);

  useEffect(() => {
    fetchShopFloorStatus();
    fetchSupervisedTasks();
    
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(() => {
      fetchShopFloorStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchShopFloorStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/shop-floor/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setShopStatus(data);
      }
    } catch (error) {
      console.error('Error fetching shop status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisedTasks = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/supervised`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const reviewTask = async (taskId, approved, feedback = null) => {
    try {
      const params = new URLSearchParams({ approved: approved.toString() });
      if (feedback) params.append('feedback', feedback);
      
      const response = await fetch(
        `${BACKEND_URL}/api/tasks/${taskId}/review?${params}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        await fetchSupervisedTasks();
        await fetchShopFloorStatus();
        alert(approved ? 'Task approved!' : 'Task sent back for rework');
      }
    } catch (error) {
      console.error('Error reviewing task:', error);
      alert('Failed to review task');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      assigned: <Badge className="bg-blue-500">Assigned</Badge>,
      in_progress: <Badge className="bg-yellow-500">In Progress</Badge>,
      blocked: <Badge className="bg-red-500">Blocked</Badge>,
      completed: <Badge className="bg-green-500">Completed</Badge>,
      reviewed: <Badge className="bg-purple-500">Reviewed</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
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
              <Activity className="mr-3 h-8 w-8 text-[#289790]" />
              Shop Floor Supervisor
            </h1>
            <p className="text-gray-600 mt-1">Real-time technician monitoring & task management</p>
          </div>
          
          <Button
            onClick={() => navigate('/projects')}
            className="bg-[#289790] hover:bg-[#1E7083]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Assign New Task
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{shopStatus.summary.total_tasks || 0}</p>
                </div>
                <Users className="h-10 w-10 text-[#124481] opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-yellow-600">{shopStatus.summary.in_progress || 0}</p>
                </div>
                <Clock className="h-10 w-10 text-yellow-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed Today</p>
                  <p className="text-3xl font-bold text-green-600">{shopStatus.summary.completed_today || 0}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#124481] to-[#1E7083] text-white">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm opacity-90 mb-1">Active Technicians</p>
                <p className="text-3xl font-bold">{shopStatus.technicians.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technician Status Board */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Live Technician Board
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {shopStatus.technicians.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600">No technicians assigned yet</p>
                <p className="text-sm text-gray-500 mt-2">Start assigning tasks to technicians to see them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopStatus.technicians.map((tech) => (
                  <Card 
                    key={tech.technician_id}
                    className={`cursor-pointer hover:shadow-lg transition-shadow ${
                      tech.blocked > 0 ? 'border-2 border-red-500' : ''
                    }`}
                    onClick={() => setSelectedTech(tech)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{tech.technician_name}</h3>
                          {tech.current_task && (
                            <p className="text-sm text-gray-600 mt-1">
                              Working on: {tech.current_task.title}
                            </p>
                          )}
                        </div>
                        {tech.blocked > 0 && (
                          <AlertCircle className="h-8 w-8 text-red-600" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <p className="font-semibold text-blue-600">{tech.assigned || 0}</p>
                          <p className="text-xs text-gray-600">Assigned</p>
                        </div>
                        <div className="bg-yellow-50 p-2 rounded text-center">
                          <p className="font-semibold text-yellow-600">{tech.in_progress || 0}</p>
                          <p className="text-xs text-gray-600">Working</p>
                        </div>
                        <div className="bg-red-50 p-2 rounded text-center">
                          <p className="font-semibold text-red-600">{tech.blocked || 0}</p>
                          <p className="text-xs text-gray-600">Blocked</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded text-center">
                          <p className="font-semibold text-green-600">{tech.completed || 0}</p>
                          <p className="text-xs text-gray-600">Done</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Requiring Review */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="mr-2 h-5 w-5 text-[#289790]" />
              Tasks Requiring Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.filter(t => t.status === 'completed').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tasks waiting for review
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.filter(t => t.status === 'completed').map((task) => (
                  <Card key={task.id} className="border-2 border-yellow-300">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg mb-2">{task.title}</h4>
                          <p className="text-sm text-gray-600 mb-3">
                            <strong>Technician:</strong> {task.technician_name}
                          </p>
                          
                          {task.notes && (
                            <div className="bg-gray-50 p-3 rounded mb-3">
                              <p className="text-sm font-semibold text-gray-700 mb-1">Notes:</p>
                              <p className="text-sm text-gray-600">{task.notes}</p>
                            </div>
                          )}

                          {task.photos && task.photos.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Photos: {task.photos.length}</p>
                              <div className="flex gap-2">
                                {task.photos.slice(0, 3).map((photo, idx) => (
                                  <div key={idx} className="w-20 h-20 bg-gray-200 rounded"></div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <Button
                              onClick={() => reviewTask(task.id, true)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <ThumbsUp className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            
                            <Button
                              onClick={() => {
                                const feedback = prompt('Feedback for technician:');
                                if (feedback) reviewTask(task.id, false, feedback);
                              }}
                              variant="outline"
                              className="border-red-600 text-red-600 hover:bg-red-50"
                            >
                              <ThumbsDown className="mr-2 h-4 w-4" />
                              Send Back
                            </Button>
                          </div>
                        </div>

                        <div className="ml-4">
                          {getStatusBadge(task.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Tasks List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All My Assigned Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{task.technician_name}</td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(task.status)}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge className={
                          task.priority === 'urgent' ? 'bg-red-600' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'normal' ? 'bg-blue-500' : 'bg-gray-500'
                        }>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(task.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
