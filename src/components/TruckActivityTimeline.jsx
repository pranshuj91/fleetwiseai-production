import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Clock, Wrench, FileText, DollarSign, Calendar, CheckCircle, 
  AlertCircle, Loader2
} from 'lucide-react';

const TruckActivityTimeline = ({ truckId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (truckId) {
      fetchActivities();
    }
  }, [truckId]);

  const fetchActivities = async () => {
    try {
      const response = await projectAPI.list();
      const truckProjects = response.data
        .filter(p => p.truck_id === truckId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const timeline = truckProjects.map(project => ({
        id: project.id,
        type: 'work_order',
        date: new Date(project.created_at),
        title: project.work_order_number || 'Work Order',
        status: project.status,
        description: project.complaint || 'No description',
        parts: project.parts_used?.length || 0,
        labor: project.labor_items?.length || 0,
        services: project.services_performed?.length || 0
      }));

      setActivities(timeline);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Wrench className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#289790]" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Service History</h3>
          <p className="text-gray-600">This truck has no recorded work orders yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Service History & Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-6">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className="absolute left-4 -translate-x-1/2 top-1">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(activity.status)} border-4 border-white`} />
                </div>

                {/* Activity card */}
                <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(activity.status)}
                      <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {activity.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">{activity.description}</p>

                  <div className="flex gap-4 text-xs text-gray-600">
                    {activity.services > 0 && (
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {activity.services} service{activity.services !== 1 ? 's' : ''}
                      </span>
                    )}
                    {activity.parts > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {activity.parts} part{activity.parts !== 1 ? 's' : ''}
                      </span>
                    )}
                    {activity.labor > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.labor} labor item{activity.labor !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TruckActivityTimeline;
