import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { projectAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  LayoutGrid, Loader2, ChevronRight, Clock, Wrench, CheckCircle, AlertCircle
} from 'lucide-react';

const WorkOrderBoard = () => {
  const navigate = useNavigate();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [effectiveCompanyId]);

  const fetchProjects = async () => {
    try {
      // Use effectiveCompanyId which respects impersonation
      const response = await projectAPI.list(effectiveCompanyId);
      setProjects(response?.data ?? []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      id: 'draft', 
      title: 'Draft', 
      icon: AlertCircle, 
      color: 'gray',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300'
    },
    { 
      id: 'in_progress', 
      title: 'In Progress', 
      icon: Wrench, 
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300'
    },
    { 
      id: 'completed', 
      title: 'Completed', 
      icon: CheckCircle, 
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300'
    }
  ];

  const getProjectsByStatus = (status) => {
    return (projects ?? []).filter(p => p?.status === status);
  };

  const getStatusBadgeColor = (status) => {
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
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <LayoutGrid className="mr-3 h-8 w-8 text-[#124481]" />
                Work Order Board
              </h1>
              <p className="text-gray-600 mt-1">Kanban-style view of all work orders</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate('/projects')}
              >
                List View
              </Button>
              <Button 
                onClick={() => navigate('/projects/new')}
                className="bg-[#124481] hover:bg-[#1E7083]"
              >
                New Work Order
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {columns.map(column => {
            const count = getProjectsByStatus(column.id).length;
            const Icon = column.icon;
            return (
              <Card key={column.id} className={column.bgColor}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{column.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{count}</p>
                    </div>
                    <Icon className={`h-10 w-10 text-${column.color}-600`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(column => {
            const columnProjects = getProjectsByStatus(column.id);
            const Icon = column.icon;
            
            return (
              <div key={column.id} className="flex flex-col">
                {/* Column Header */}
                <div className={`${column.bgColor} border-2 ${column.borderColor} rounded-t-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 text-${column.color}-600`} />
                      <h3 className="font-semibold text-gray-900">{column.title}</h3>
                    </div>
                    <Badge className={getStatusBadgeColor(column.id)}>
                      {columnProjects.length}
                    </Badge>
                  </div>
                </div>

                {/* Column Content */}
                <div className={`flex-1 ${column.bgColor} border-2 border-t-0 ${column.borderColor} rounded-b-lg p-4 min-h-[400px]`}>
                  <div className="space-y-3">
                    {columnProjects.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Icon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-sm">No work orders</p>
                      </div>
                    ) : (
                      columnProjects.map(project => (
                        <Card 
                          key={project.id}
                          className="hover:shadow-lg transition-shadow cursor-pointer bg-white"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">
                                {project.work_order_number || 'N/A'}
                              </h4>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>

                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {project.complaint || 'No description'}
                            </p>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(project.created_at).toLocaleDateString()}
                                </span>
                              </div>

                              {project.truck_number && (
                                <div className="text-xs font-medium text-[#124481]">
                                  Truck: {project.truck_number}
                                </div>
                              )}

                              {project.customer_name && (
                                <div className="text-xs text-gray-600">
                                  {project.customer_name}
                                </div>
                              )}

                              {project?.fault_codes && project.fault_codes.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {(project.fault_codes ?? []).slice(0, 2).map(code => (
                                    <Badge key={code} variant="outline" className="text-xs">
                                      {code}
                                    </Badge>
                                  ))}
                                  {(project.fault_codes ?? []).length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{(project.fault_codes ?? []).length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkOrderBoard;
