import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  User, Wrench, Clock, CheckCircle, AlertCircle, Package, Truck
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const ShopDashboard = () => {
  const navigate = useNavigate();
  const [techWorkload, setTechWorkload] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopData();
    const interval = setInterval(fetchShopData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchShopData = async () => {
    try {
      setLoading(true);
      const [projectsRes, usersRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/projects`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${BACKEND_URL}/api/team`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const projects = await projectsRes.json();
      const users = await usersRes.json();

      // Group work orders by technician
      const techMap = {};
      const technicians = users.filter(u => u.role === 'technician' || u.role === 'shop_supervisor');

      technicians.forEach(tech => {
        techMap[tech.id] = {
          id: tech.id,
          name: tech.full_name || tech.email,
          role: tech.role,
          active: [],
          completed_today: [],
          total_hours: 0
        };
      });

      // Assign projects to technicians
      projects.forEach(project => {
        if (project.assigned_to && techMap[project.assigned_to]) {
          if (project.status === 'completed') {
            const completedToday = new Date(project.updated_at).toDateString() === new Date().toDateString();
            if (completedToday) {
              techMap[project.assigned_to].completed_today.push(project);
            }
          } else if (project.status === 'in_progress' || project.status === 'queued') {
            techMap[project.assigned_to].active.push(project);
          }
        }
      });

      setTechWorkload(Object.values(techMap));
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      in_progress: { color: 'bg-blue-500', text: 'In Progress' },
      queued: { color: 'bg-gray-500', text: 'Queued' },
      waiting_for_parts: { color: 'bg-orange-500', text: 'Waiting Parts' },
      delayed: { color: 'bg-red-500', text: 'Delayed' }
    };
    const style = styles[status] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${style.color} text-white`}>{style.text}</Badge>;
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="text-center py-12">Loading shop data...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shop Dashboard</h1>
          <p className="text-gray-600">Real-time view of who's working on what</p>
        </div>

        {/* Shop Summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Techs</p>
                  <p className="text-2xl font-bold">{techWorkload.filter(t => t.active.length > 0).length}</p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Jobs</p>
                  <p className="text-2xl font-bold">{techWorkload.reduce((sum, t) => sum + t.active.length, 0)}</p>
                </div>
                <Wrench className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold">{techWorkload.reduce((sum, t) => sum + t.completed_today.length, 0)}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Load</p>
                  <p className="text-2xl font-bold">
                    {techWorkload.length > 0 
                      ? (techWorkload.reduce((sum, t) => sum + t.active.length, 0) / techWorkload.length).toFixed(1)
                      : 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technician Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {techWorkload.map(tech => (
            <Card key={tech.id} className={tech.active.length > 0 ? 'border-l-4 border-l-blue-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tech.name}</CardTitle>
                      <p className="text-sm text-gray-500 capitalize">{tech.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-blue-600">
                      {tech.active.length} active
                    </Badge>
                    {tech.completed_today.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        {tech.completed_today.length} completed today
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {tech.active.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active work orders</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tech.active.map(project => (
                      <div 
                        key={project.id} 
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Truck className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-sm">
                                {project.work_order_number || `WO-${project.id.slice(0, 8)}`}
                              </span>
                              {getStatusBadge(project.status)}
                            </div>
                            <p className="text-xs text-gray-600">{project.truck_number || 'No Unit'}</p>
                          </div>
                        </div>
                        {project.complaint && (
                          <p className="text-xs text-gray-500 line-clamp-1">{project.complaint}</p>
                        )}
                        {project.promised_time && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(project.promised_time).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {techWorkload.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No technicians found. Add team members to see shop workload.</p>
              <Button className="mt-4" onClick={() => navigate('/team')}>
                Add Team Members
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default ShopDashboard;
