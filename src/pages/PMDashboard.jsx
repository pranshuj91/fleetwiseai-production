import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { pmAPI, truckAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Calendar, Loader2, AlertCircle, CheckCircle, Clock, 
  Wrench, TrendingUp, Plus
} from 'lucide-react';

const PMDashboard = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchSchedules();
  }, [filter]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      let response;
      
      if (filter === 'overdue') {
        response = await pmAPI.schedules.overdue();
      } else if (filter === 'upcoming') {
        response = await pmAPI.schedules.upcoming();
      } else {
        response = await pmAPI.schedules.list();
      }
      
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching PM schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      upcoming: 'bg-blue-100 text-blue-700',
      due: 'bg-yellow-100 text-yellow-700',
      overdue: 'bg-red-100 text-red-700',
      completed: 'bg-green-100 text-green-700',
    };
    return colors[status] || colors.upcoming;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'due':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const calculateStats = () => {
    const overdue = schedules.filter(s => s.status === 'overdue').length;
    const due = schedules.filter(s => s.status === 'due').length;
    const upcoming = schedules.filter(s => s.status === 'upcoming').length;
    
    return { overdue, due, upcoming, total: schedules.length };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Wrench className="mr-3 h-8 w-8 text-[#289790]" />
                Preventive Maintenance
              </h1>
              <p className="text-gray-600 mt-1">Fleet-wide PM schedule and tracking</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/pm/templates')}
                variant="outline"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Manage Templates
              </Button>
              <Button 
                onClick={() => navigate('/pm/schedules/create')}
                className="bg-[#289790] hover:bg-[#1E7083]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Schedule PM
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className={stats.overdue > 0 ? 'border-red-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stats.due > 0 ? 'border-yellow-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Due Soon</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.due}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.upcoming}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Scheduled</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === 'overdue' ? 'default' : 'outline'}
            onClick={() => setFilter('overdue')}
            size="sm"
            className={filter === 'overdue' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            Overdue
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setFilter('upcoming')}
            size="sm"
          >
            Upcoming (30 days)
          </Button>
        </div>

        {/* Schedule List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
          </div>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No PM schedules found</h3>
              <p className="text-gray-600 mb-4">Create PM templates and assign them to trucks</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/pm/templates')} variant="outline">
                  Create Template
                </Button>
                <Button onClick={() => navigate('/pm/schedules/create')} className="bg-[#289790] hover:bg-[#1E7083]">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule PM
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card 
                key={schedule.id} 
                className={`hover:shadow-lg transition-shadow cursor-pointer ${
                  schedule.status === 'overdue' ? 'border-l-4 border-red-500' :
                  schedule.status === 'due' ? 'border-l-4 border-yellow-500' : ''
                }`}
                onClick={() => navigate(`/trucks/${schedule.truck_id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {schedule.template_name}
                        </h3>
                        <Badge className={getStatusColor(schedule.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(schedule.status)}
                            {schedule.status.toUpperCase()}
                          </span>
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        Truck #{schedule.truck_number || schedule.truck_id}
                      </p>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {schedule.next_due_date && (
                          <div>
                            <span className="text-gray-600">Due Date:</span>
                            <p className="font-medium">
                              {new Date(schedule.next_due_date).toLocaleDateString()}
                              {schedule.days_until_due !== null && (
                                <span className={`ml-2 ${
                                  schedule.days_until_due < 0 ? 'text-red-600' :
                                  schedule.days_until_due <= 7 ? 'text-yellow-600' :
                                  'text-gray-600'
                                }`}>
                                  ({schedule.days_until_due < 0 ? 
                                    `${Math.abs(schedule.days_until_due)} days overdue` :
                                    `${schedule.days_until_due} days`
                                  })
                                </span>
                              )}
                            </p>
                          </div>
                        )}

                        {schedule.next_due_mileage && (
                          <div>
                            <span className="text-gray-600">Due Mileage:</span>
                            <p className="font-medium">
                              {schedule.next_due_mileage.toLocaleString()} mi
                              {schedule.miles_until_due !== null && (
                                <span className={`ml-2 ${
                                  schedule.miles_until_due < 0 ? 'text-red-600' :
                                  schedule.miles_until_due <= 500 ? 'text-yellow-600' :
                                  'text-gray-600'
                                }`}>
                                  ({schedule.miles_until_due < 0 ?
                                    `${Math.abs(schedule.miles_until_due).toLocaleString()} mi over` :
                                    `${schedule.miles_until_due.toLocaleString()} mi`
                                  })
                                </span>
                              )}
                            </p>
                          </div>
                        )}

                        {schedule.last_completed_date && (
                          <div>
                            <span className="text-gray-600">Last Completed:</span>
                            <p className="font-medium">
                              {new Date(schedule.last_completed_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/create?truck_id=${schedule.truck_id}&pm_schedule_id=${schedule.id}`);
                      }}
                      className="bg-[#289790] hover:bg-[#1E7083]"
                    >
                      Create Work Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PMDashboard;
