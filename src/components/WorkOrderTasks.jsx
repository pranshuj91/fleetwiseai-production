import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Plus, Lock, Clock, Calendar, AlertTriangle, Pencil, Trash2, ChevronRight, FileText, Wrench, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import TaskDetailModal from './TaskDetailModal';
import PreROModePanel from './PreROModePanel';

const WorkOrderTasks = ({ workOrderId, workOrderNumber, companyId, hasRONumber = false, onStartDiagnostic, onAISummary, truck, complaint, cause, correction }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const VISIBLE_TASK_COUNT = 3;
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    complaint: '',
    cause: '',
    correction: '',
    priority: 'medium',
    task_type: 'repair',
    estimated_hours: '',
    due_date: ''
  });
  const [editTask, setEditTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    task_type: 'repair',
    estimated_hours: '',
    actual_hours: '',
    due_date: ''
  });

  const TASK_STATUSES = [
    { value: 'pending', label: 'PENDING', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { value: 'in_progress', label: 'IN PROGRESS', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'blocked', label: 'BLOCKED', color: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'completed', label: 'COMPLETED', color: 'bg-green-100 text-green-700 border-green-300' }
  ];

  useEffect(() => {
    fetchTasks();
  }, [workOrderId]);

  const fetchTasks = async () => {
    if (!workOrderId) return;
    
    try {
      const { data, error } = await supabase
        .from('work_order_tasks')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('work_order_tasks')
        .insert({
          work_order_id: workOrderId,
          company_id: companyId,
          title: newTask.title,
          description: newTask.complaint || newTask.description || null,
          complaint: newTask.complaint || null,
          cause: newTask.cause || null,
          correction: newTask.correction || null,
          priority: newTask.priority,
          task_type: newTask.task_type,
          estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
          due_date: newTask.due_date || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setTasks([...tasks, data]);
      toast.success('Task added successfully');
      setShowAddModal(false);
      // Reset with pre-populated values for next task
      setNewTask({ 
        title: '', 
        description: '', 
        complaint: complaint || '',
        cause: cause || '',
        correction: correction || '',
        priority: 'medium', 
        task_type: 'repair', 
        estimated_hours: '', 
        due_date: '' 
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  // Pre-populate 3 C's when opening the add modal
  const handleOpenAddModal = () => {
    setNewTask(prev => ({
      ...prev,
      complaint: complaint || '',
      cause: cause || '',
      correction: correction || ''
    }));
    setShowAddModal(true);
  };

  const handleUpdateTask = async () => {
    if (!editTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('work_order_tasks')
        .update({
          title: editTask.title,
          description: editTask.description || null,
          priority: editTask.priority,
          task_type: editTask.task_type,
          estimated_hours: editTask.estimated_hours ? parseFloat(editTask.estimated_hours) : null,
          actual_hours: editTask.actual_hours ? parseFloat(editTask.actual_hours) : null,
          due_date: editTask.due_date || null
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      setTasks(tasks.map(t => t.id === selectedTask.id ? { 
        ...t, 
        title: editTask.title,
        description: editTask.description || null,
        priority: editTask.priority,
        task_type: editTask.task_type,
        estimated_hours: editTask.estimated_hours ? parseFloat(editTask.estimated_hours) : null,
        actual_hours: editTask.actual_hours ? parseFloat(editTask.actual_hours) : null,
        due_date: editTask.due_date || null
      } : t));
      setIsEditing(false);
      setShowDetailModal(false);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('work_order_tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;

      setTasks(tasks.filter(t => t.id !== selectedTask.id));
      setShowDetailModal(false);
      setSelectedTask(null);
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('work_order_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast.success('Task status updated');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const openTaskDetail = (task, e) => {
    e.stopPropagation();
    setSelectedTask(task);
    setEditTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      task_type: task.task_type || 'repair',
      estimated_hours: task.estimated_hours?.toString() || '',
      actual_hours: task.actual_hours?.toString() || '',
      due_date: task.due_date || ''
    });
    setIsEditing(false);
    setShowDetailModal(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedTask && draggedTask.status !== newStatus) {
      await handleStatusChange(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
  };

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600'
    };
    return <Badge className={`text-xs ${colors[priority] || colors.medium}`}>{priority}</Badge>;
  };

  const getTaskTypeBadge = (type) => {
    const colors = {
      repair: 'bg-purple-100 text-purple-600',
      inspection: 'bg-cyan-100 text-cyan-600',
      diagnostic: 'bg-yellow-100 text-yellow-600',
      parts: 'bg-green-100 text-green-600',
      other: 'bg-gray-100 text-gray-600'
    };
    return <Badge className={`text-xs ${colors[type] || colors.other}`}>{type}</Badge>;
  };

  const getDueDateBadge = (dueDate, status) => {
    if (!dueDate || status === 'completed') return null;
    
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isPast(date) && !isToday(date)) {
      const daysOverdue = differenceInDays(today, date);
      return (
        <Badge variant="destructive" className="text-[10px] flex items-center gap-0.5">
          <AlertTriangle className="h-3 w-3" />
          {daysOverdue}d overdue
        </Badge>
      );
    }
    
    if (isToday(date)) {
      return (
        <Badge className="text-[10px] bg-orange-500 text-white flex items-center gap-0.5">
          <Clock className="h-3 w-3" />
          Due today
        </Badge>
      );
    }
    
    if (isTomorrow(date)) {
      return (
        <Badge className="text-[10px] bg-yellow-500 text-white flex items-center gap-0.5">
          <Calendar className="h-3 w-3" />
          Tomorrow
        </Badge>
      );
    }
    
    const daysUntil = differenceInDays(date, today);
    if (daysUntil <= 7) {
      return (
        <Badge variant="secondary" className="text-[10px] flex items-center gap-0.5">
          <Calendar className="h-3 w-3" />
          {daysUntil}d left
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-[10px] flex items-center gap-0.5">
        <Calendar className="h-3 w-3" />
        {format(date, 'MMM d')}
      </Badge>
    );
  };

  // Find current task (first non-completed task)
  const getCurrentTaskIndex = () => {
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const currentIndex = sortedTasks.findIndex(t => t.status !== 'completed');
    return currentIndex >= 0 ? currentIndex : 0;
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'blocked':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const currentTaskIndex = getCurrentTaskIndex();
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Calculate task counts by status
  const taskCounts = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'blocked').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { total: tasks.length, pending, inProgress, completed };
  }, [tasks]);

  // Build truck info string
  const truckInfoString = useMemo(() => {
    if (!truck) return 'Unknown · Truck Info';
    const unitId = truck.identity?.unit_id || truck.identity?.truck_number || truck.truck_number || truck.unit_id;
    const make = truck.identity?.make || truck.make;
    const model = truck.identity?.model || truck.model;
    const year = truck.identity?.year || truck.year;
    const parts = [unitId, [year, make, model].filter(Boolean).join(' ')].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Unknown · Truck Info';
  }, [truck]);

  return (
    <>
      {/* Pre-RO Mode Panel */}
      <PreROModePanel
        workOrderNumber={workOrderNumber}
        truckInfo={truckInfoString}
        totalTasks={taskCounts.total}
        pendingTasks={taskCounts.pending}
        inProgressTasks={taskCounts.inProgress}
        completedTasks={taskCounts.completed}
        onAISummary={onAISummary}
      />

      {/* Task Progress Tracker - Timeline Style */}
      <Card className="shadow-sm mb-4">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg font-semibold">Task Progress Tracker</CardTitle>
              {tasks.length > 0 && (
                <Badge className="bg-[#1E7083] text-white text-xs">
                  Currently on Task {currentTaskIndex + 1}
                </Badge>
              )}
            </div>
            {sortedTasks.length > VISIBLE_TASK_COUNT && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllTasks(!showAllTasks)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {showAllTasks ? 'Show Less' : `View All (${sortedTasks.length})`}
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${showAllTasks ? 'rotate-180' : ''}`} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          {/* Timeline Task List */}
          <div className="divide-y divide-gray-100">
            {sortedTasks.slice(0, VISIBLE_TASK_COUNT).map((task, index) => {
              const actualIndex = sortedTasks.findIndex(t => t.id === task.id);
              const isCurrent = actualIndex === currentTaskIndex && task.status !== 'completed';
              const taskDescription = task.complaint || task.description || '';
              
              return (
                <div 
                  key={task.id}
                  onClick={(e) => openTaskDetail(task, e)}
                  className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-muted/30 ${
                    isCurrent ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {/* Circle indicator */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white ${
                    task.status === 'completed'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300'
                  }`}>
                    {task.status === 'completed' && (
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    {/* Task label and current badge */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        TASK {actualIndex + 1}
                      </span>
                      {isCurrent && (
                        <Badge className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-md">
                          Current
                        </Badge>
                      )}
                    </div>
                    
                    {/* Task title */}
                    <h4 className={`font-semibold text-sm uppercase leading-tight ${
                      task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}>
                      {task.title}
                    </h4>
                    
                    {/* Task description */}
                    {taskDescription && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {taskDescription}
                      </p>
                    )}
                  </div>
                  
                  {/* Right side: Status badge and chevron */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 rounded-md">
                      {task.status?.replace('_', ' ') || 'pending'}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              );
            })}
            
            {/* Animated expandable section for remaining tasks */}
            {sortedTasks.length > VISIBLE_TASK_COUNT && (
              <div 
                className={`grid transition-all duration-300 ease-out ${
                  showAllTasks ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden divide-y divide-gray-100">
                  {sortedTasks.slice(VISIBLE_TASK_COUNT).map((task) => {
                    const actualIndex = sortedTasks.findIndex(t => t.id === task.id);
                    const isCurrent = actualIndex === currentTaskIndex && task.status !== 'completed';
                    const taskDescription = task.complaint || task.description || '';
                    
                    return (
                      <div 
                        key={task.id}
                        onClick={(e) => openTaskDetail(task, e)}
                        className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-muted/30 ${
                          isCurrent ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        {/* Circle indicator */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white ${
                          task.status === 'completed'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300'
                        }`}>
                          {task.status === 'completed' && (
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Task content */}
                        <div className="flex-1 min-w-0">
                          {/* Task label and current badge */}
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              TASK {actualIndex + 1}
                            </span>
                            {isCurrent && (
                              <Badge className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-md">
                                Current
                              </Badge>
                            )}
                          </div>
                          
                          {/* Task title */}
                          <h4 className={`font-semibold text-sm uppercase leading-tight ${
                            task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}>
                            {task.title}
                          </h4>
                          
                          {/* Task description */}
                          {taskDescription && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {taskDescription}
                            </p>
                          )}
                        </div>
                        
                        {/* Right side: Status badge and chevron */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 rounded-md">
                            {task.status?.replace('_', ' ') || 'pending'}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks yet. Add your first task below.</p>
              </div>
            )}
          </div>
          
          {/* View More button at bottom */}
          {!showAllTasks && sortedTasks.length > VISIBLE_TASK_COUNT && (
            <div className="px-6 py-3 border-t border-gray-100 bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllTasks(true)}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                View {sortedTasks.length - VISIBLE_TASK_COUNT} more tasks
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Details Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg font-semibold">Task Details</CardTitle>
            </div>
            <Button 
              onClick={handleOpenAddModal}
              className="bg-[#1E7083] hover:bg-[#1E7083]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Task List View */}
          <div className="space-y-3">
            {sortedTasks.map((task, index) => {
              const isCurrent = index === currentTaskIndex && task.status !== 'completed';
              // Use task-specific 3 C's if available, otherwise fall back to work order level
              const taskComplaint = task.complaint || task.description || '';
              const taskCause = task.cause || '';
              const taskCorrection = task.correction || '';
              
              return (
                <div 
                  key={task.id}
                  onClick={(e) => openTaskDetail(task, e)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                    isCurrent 
                      ? 'border-[#1E7083] bg-[#1E7083]/5 shadow-sm' 
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Number circle */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a365d] flex items-center justify-center text-white font-bold text-lg">
                      {index + 1}
                    </div>
                    
                    {/* Task content */}
                    <div className="flex-1 min-w-0">
                      {/* Status badge row */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isCurrent && (
                            <Badge className="bg-[#1E7083] text-white text-xs px-2 py-0.5">
                              Working on this
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      {/* Task title */}
                      <h4 className={`font-bold text-base uppercase mb-2 ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.title}
                      </h4>
                      
                      {/* 3 C's Display */}
                      <div className="space-y-1 text-sm">
                        {taskComplaint && (
                          <div className="flex gap-2">
                            <span className="text-red-500 font-semibold flex-shrink-0">Complaint:</span>
                            <span className="text-muted-foreground">{taskComplaint}</span>
                          </div>
                        )}
                        {taskCause && (
                          <div className="flex gap-2">
                            <span className="text-orange-500 font-semibold flex-shrink-0">Cause:</span>
                            <span className="text-muted-foreground">{taskCause}</span>
                          </div>
                        )}
                        {taskCorrection && (
                          <div className="flex gap-2">
                            <span className="text-green-600 font-semibold flex-shrink-0">Correction:</span>
                            <span className="text-muted-foreground">{taskCorrection}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Status badge at bottom */}
                      <div className="mt-3">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusBadgeStyle(task.status)}`}
                        >
                          {task.status?.replace('_', ' ') || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks yet. Add your first task to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Task Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task for this work order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title">Task Title *</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Replace DPF filter"
              />
            </div>
            {/* 3 C's Section - Pre-populated from Work Order */}
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task Details (3 C's)</p>
              <div>
                <Label htmlFor="task-complaint" className="text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">C</span>
                  Complaint
                </Label>
                <Textarea
                  id="task-complaint"
                  value={newTask.complaint}
                  onChange={(e) => setNewTask(prev => ({ ...prev, complaint: e.target.value }))}
                  placeholder="What issue was reported?"
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="task-cause" className="text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">C</span>
                  Cause
                </Label>
                <Textarea
                  id="task-cause"
                  value={newTask.cause}
                  onChange={(e) => setNewTask(prev => ({ ...prev, cause: e.target.value }))}
                  placeholder="What was the root cause?"
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="task-correction" className="text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">C</span>
                  Correction
                </Label>
                <Textarea
                  id="task-correction"
                  value={newTask.correction}
                  onChange={(e) => setNewTask(prev => ({ ...prev, correction: e.target.value }))}
                  placeholder="What repair was performed?"
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Task Type</Label>
                <Select
                  value={newTask.task_type}
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, task_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="diagnostic">Diagnostic</SelectItem>
                    <SelectItem value="parts">Parts</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated-hours">Estimated Hours</Label>
                <Input
                  id="estimated-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={newTask.estimated_hours}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimated_hours: e.target.value }))}
                  placeholder="e.g., 3.5"
                />
              </div>
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} className="bg-[#1E7083] hover:bg-[#1E7083]/90">
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal - New Design */}
      <TaskDetailModal
        open={showDetailModal}
        onOpenChange={(open) => {
          setShowDetailModal(open);
          if (!open) {
            setSelectedTask(null);
            setIsEditing(false);
          }
        }}
        task={selectedTask}
        workOrderId={workOrderId}
        truck={truck}
        complaint={complaint}
        onTaskUpdate={(updatedTask) => {
          setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
        }}
        onTaskDelete={(taskId) => {
          setTasks(prev => prev.filter(t => t.id !== taskId));
          setSelectedTask(null);
        }}
        onStartDiagnostic={onStartDiagnostic}
      />
    </>
  );
};

export default WorkOrderTasks;