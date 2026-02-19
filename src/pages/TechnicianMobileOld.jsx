import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  CheckCircle, Camera, Mic, Play, Pause, AlertCircle,
  Clock, CheckSquare, Square, Loader2, Upload, X
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const TechnicianMobile = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/tasks/my-tasks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        await fetchMyTasks();
        if (selectedTask?.id === taskId) {
          const updated = tasks.find(t => t.id === taskId);
          if (updated) {
            setSelectedTask({...updated, status});
          }
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task status');
    }
  };

  const handlePhotoCapture = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos([...photos, reader.result]);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleChecklistItem = async (index) => {
    if (!selectedTask) return;
    
    const newChecklist = [...selectedTask.completed_checklist];
    newChecklist[index] = !newChecklist[index];
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/tasks/${selectedTask.id}/update`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ completed_checklist: newChecklist })
        }
      );
      
      if (response.ok) {
        setSelectedTask({...selectedTask, completed_checklist: newChecklist});
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      assigned: <Badge className="bg-blue-500 text-lg py-2 px-4"><Clock className="h-5 w-5 mr-2" />Assigned</Badge>,
      in_progress: <Badge className="bg-yellow-500 text-lg py-2 px-4"><Play className="h-5 w-5 mr-2" />In Progress</Badge>,
      blocked: <Badge className="bg-red-500 text-lg py-2 px-4"><AlertCircle className="h-5 w-5 mr-2" />Blocked</Badge>,
      completed: <Badge className="bg-green-500 text-lg py-2 px-4"><CheckCircle className="h-5 w-5 mr-2" />Completed</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'border-red-600 bg-red-50',
      high: 'border-orange-500 bg-orange-50',
      normal: 'border-blue-500 bg-blue-50',
      low: 'border-gray-400 bg-gray-50'
    };
    return colors[priority] || 'border-gray-300';
  };

  // Task List View (My Tasks)
  if (!selectedTask) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white p-6 sticky top-0 z-10 shadow-lg">
          <h1 className="text-2xl font-bold">My Tasks</h1>
          <p className="text-sm opacity-90 mt-1">Tap a task to begin</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600">No tasks assigned</p>
                <p className="text-sm text-gray-500 mt-2">Your supervisor will assign tasks to you</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {tasks.map((task) => (
              <Card 
                key={task.id}
                className={`cursor-pointer hover:shadow-xl transition-all border-4 ${getPriorityColor(task.priority)}`}
                onClick={() => setSelectedTask(task)}
              >
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{task.title}</h3>
                      {task.description && (
                        <p className="text-gray-600 mb-3">{task.description}</p>
                      )}
                    </div>
                    {getStatusBadge(task.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-3 rounded">
                      <p className="text-gray-500 text-xs">Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{task.task_type}</p>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <p className="text-gray-500 text-xs">Est. Time</p>
                      <p className="font-semibold text-gray-900">{task.estimated_duration || '--'} min</p>
                    </div>
                  </div>

                  {task.priority === 'urgent' && (
                    <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-center">
                      <p className="text-red-800 font-bold text-sm">⚠️ URGENT PRIORITY</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Task Detail View
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white p-4 sticky top-0 z-10 shadow-lg">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedTask(null)}
          className="text-white mb-2 hover:bg-white/20 p-2 text-base"
        >
          ← Back to Tasks
        </Button>
        <h1 className="text-xl font-bold">{selectedTask.title}</h1>
        <div className="mt-2">{getStatusBadge(selectedTask.status)}</div>
      </div>

      <div className="p-4 space-y-4">
        {/* Description */}
        {selectedTask.description && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-gray-700 text-base">{selectedTask.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            {selectedTask.status === 'assigned' && (
              <Button 
                onClick={() => updateTaskStatus(selectedTask.id, 'in_progress')}
                className="w-full h-16 text-xl bg-green-600 hover:bg-green-700"
              >
                <Play className="h-6 w-6 mr-3" />
                Start Task
              </Button>
            )}

            {selectedTask.status === 'in_progress' && (
              <>
                <Button 
                  onClick={() => updateTaskStatus(selectedTask.id, 'blocked')}
                  className="w-full h-14 text-lg bg-red-600 hover:bg-red-700"
                >
                  <AlertCircle className="h-5 w-5 mr-2" />
                  I'm Blocked
                </Button>
                
                <Button 
                  onClick={() => updateTaskStatus(selectedTask.id, 'completed')}
                  className="w-full h-14 text-lg bg-[#289790] hover:bg-[#1E7083]"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Mark Complete
                </Button>
              </>
            )}

            {selectedTask.status === 'blocked' && (
              <Button 
                onClick={() => updateTaskStatus(selectedTask.id, 'in_progress')}
                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              >
                <Play className="h-5 w-5 mr-2" />
                Resume Task
              </Button>
            )}

            {selectedTask.status === 'completed' && (
              <div className="text-center py-4">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-2" />
                <p className="text-lg font-semibold text-gray-900">Task Completed!</p>
                <p className="text-sm text-gray-600">Waiting for supervisor review</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checklist */}
        {selectedTask.checklist_items && selectedTask.checklist_items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedTask.checklist_items.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => toggleChecklistItem(index)}
                    className="flex items-start p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border-2 border-gray-200"
                  >
                    {selectedTask.completed_checklist[index] ? (
                      <CheckSquare className="h-8 w-8 text-green-600 mr-3 flex-shrink-0" />
                    ) : (
                      <Square className="h-8 w-8 text-gray-400 mr-3 flex-shrink-0" />
                    )}
                    <span className={`text-base flex-1 ${
                      selectedTask.completed_checklist[index] ? 'line-through text-gray-500' : 'text-gray-900'
                    }`}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Capture */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-14 text-lg bg-[#124481] hover:bg-[#1E7083]"
            >
              <Camera className="h-6 w-6 mr-2" />
              Take Photo
            </Button>

            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={photo} 
                      alt={`Captured ${index + 1}`} 
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voice Note</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setIsRecording(!isRecording)}
              className={`w-full h-14 text-lg ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'bg-[#289790] hover:bg-[#1E7083]'
              }`}
            >
              <Mic className="h-6 w-6 mr-2" />
              {isRecording ? 'Stop Recording' : 'Record Voice Note'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TechnicianMobile;
