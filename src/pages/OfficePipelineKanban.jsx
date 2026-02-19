import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Clock, Package, CheckCircle, AlertCircle, Truck, User, Calendar, Plus
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const OfficePipelineKanban = () => {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState({
    new: [],
    in_progress: [],
    parts_ordered: [],
    ready_for_pickup: []
  });
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    fetchPipeline();
    const interval = setInterval(fetchPipeline, 60000);
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
      
      // Map backend statuses to kanban columns
      setPipeline({
        new: data.queued || [],
        in_progress: data.in_progress || [],
        parts_ordered: data.waiting_for_parts || [],
        ready_for_pickup: data.ready_pending || []
      });
    } catch (error) {
      console.error('Error fetching pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, item, column) => {
    setDraggedItem({ item, fromColumn: column });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, toColumn) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.fromColumn === toColumn) {
      setDraggedItem(null);
      return;
    }

    const { item, fromColumn } = draggedItem;
    
    // Optimistic update
    setPipeline(prev => ({
      ...prev,
      [fromColumn]: prev[fromColumn].filter(i => i.id !== item.id),
      [toColumn]: [...prev[toColumn], item]
    }));

    // Update backend
    try {
      const statusMap = {
        new: 'queued',
        in_progress: 'in_progress',
        parts_ordered: 'waiting_for_parts',
        ready_for_pickup: 'ready_pending_confirmation'
      };

      await fetch(
        `${BACKEND_URL}/api/projects/${item.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: statusMap[toColumn] })
        }
      );
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert on error
      fetchPipeline();
    }

    setDraggedItem(null);
  };

  const getColumnColor = (column) => {
    const colors = {
      new: 'border-gray-300 bg-gray-50',
      in_progress: 'border-blue-400 bg-blue-50',
      parts_ordered: 'border-orange-400 bg-orange-50',
      ready_for_pickup: 'border-green-400 bg-green-50'
    };
    return colors[column] || 'border-gray-300 bg-gray-50';
  };

  const getColumnIcon = (column) => {
    const icons = {
      new: Clock,
      in_progress: Truck,
      parts_ordered: Package,
      ready_for_pickup: CheckCircle
    };
    return icons[column] || Clock;
  };

  const WorkOrderCard = ({ item, column }) => {
    const Icon = getColumnIcon(column);
    
    return (
      <Card 
        className="mb-3 cursor-move hover:shadow-lg transition-shadow"
        draggable
        onDragStart={(e) => handleDragStart(e, item, column)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{item.work_order_number || `WO-${item.id?.slice(0, 8)}`}</span>
                <Badge variant="outline" className="text-xs">
                  {item.truck_number || 'No Unit'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{item.customer_name || 'Walk-in Customer'}</p>
            </div>
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
          
          {item.complaint && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.complaint}</p>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{item.assigned_to || 'Unassigned'}</span>
            </div>
            {item.promised_time && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(item.promised_time).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 text-xs"
            onClick={() => navigate(`/projects/${item.id}`)}
          >
            View Details
          </Button>
        </CardContent>
      </Card>
    );
  };

  const KanbanColumn = ({ title, column, items, count }) => {
    const Icon = getColumnIcon(column);
    
    return (
      <div className="flex-1 min-w-[280px]">
        <Card className={`h-full ${getColumnColor(column)} border-t-4`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
              </div>
              <Badge variant="secondary" className="ml-2">{count}</Badge>
            </div>
          </CardHeader>
          <CardContent 
            className="space-y-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
          >
            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No work orders</div>
            ) : (
              items.map(item => (
                <WorkOrderCard key={item.id} item={item} column={column} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const totalJobs = Object.values(pipeline).flat().length;

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Office Pipeline</h1>
            <p className="text-gray-600">Drag & drop to move work orders through your workflow</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {totalJobs} Active Jobs
            </Badge>
            <Button onClick={() => navigate('/work-orders/upload')}>
              <Plus className="h-4 w-4 mr-2" />
              New Work Order
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          <KanbanColumn 
            title="New" 
            column="new" 
            items={pipeline.new} 
            count={pipeline.new.length}
          />
          <KanbanColumn 
            title="In Progress" 
            column="in_progress" 
            items={pipeline.in_progress} 
            count={pipeline.in_progress.length}
          />
          <KanbanColumn 
            title="Parts Ordered" 
            column="parts_ordered" 
            items={pipeline.parts_ordered} 
            count={pipeline.parts_ordered.length}
          />
          <KanbanColumn 
            title="Ready for Pickup" 
            column="ready_for_pickup" 
            items={pipeline.ready_for_pickup} 
            count={pipeline.ready_for_pickup.length}
          />
        </div>
      </div>
    </>
  );
};

export default OfficePipelineKanban;
