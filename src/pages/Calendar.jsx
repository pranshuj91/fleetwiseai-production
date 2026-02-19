import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Calendar as CalendarIcon, Clock, Truck, User,
  ChevronLeft, ChevronRight, Plus, Loader2
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const Calendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'week' or 'day'

  useEffect(() => {
    fetchAppointments();
  }, [currentDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const startDate = getWeekStart(currentDate).toISOString().split('T')[0];
      const endDate = getWeekEnd(currentDate).toISOString().split('T')[0];
      
      const response = await fetch(
        `${BACKEND_URL}/api/appointments/calendar?start_date=${startDate}&end_date=${endDate}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (date) => {
    const start = getWeekStart(date);
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  };

  const getWeekDays = () => {
    const days = [];
    const start = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.scheduled_date === dateStr);
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: <Badge className="bg-blue-500">Scheduled</Badge>,
      confirmed: <Badge className="bg-green-500">Confirmed</Badge>,
      in_progress: <Badge className="bg-yellow-500">In Progress</Badge>,
      completed: <Badge className="bg-gray-500">Completed</Badge>,
      cancelled: <Badge className="bg-red-500">Cancelled</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'border-l-gray-400',
      normal: 'border-l-blue-500',
      high: 'border-l-orange-500',
      urgent: 'border-l-red-600'
    };
    return colors[priority] || 'border-l-gray-400';
  };

  const weekDays = getWeekDays();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="h-8 w-8 text-[#124481]" />
              Appointment Calendar
            </h1>
            <p className="text-gray-600 mt-1">Schedule and manage appointments</p>
          </div>
          
          <Button
            onClick={() => navigate('/appointments/new')}
            className="bg-[#289790] hover:bg-[#1E7083]"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>

        {/* Calendar Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToPreviousWeek}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToNextWeek}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={goToToday}
                  className="bg-[#124481]"
                >
                  Today
                </Button>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900">{monthName}</h2>
              
              <div className="flex gap-2">
                <span className="text-sm text-gray-600">
                  {appointments.length} appointments this week
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week View */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <Card key={index} className={isToday ? 'border-2 border-[#289790]' : ''}>
                  <CardHeader className="pb-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">
                        {day.toLocaleDateString('default', { weekday: 'short' })}
                      </p>
                      <p className={`text-2xl font-bold ${isToday ? 'text-[#289790]' : 'text-gray-900'}`}>
                        {day.getDate()}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dayAppointments.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-xs text-gray-400">No appointments</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayAppointments.map(apt => (
                          <div
                            key={apt.id}
                            className={`p-2 bg-white border-l-4 ${getPriorityColor(apt.priority)} rounded text-xs cursor-pointer hover:shadow-md transition-shadow`}
                            onClick={() => navigate(`/appointments/${apt.id}`)}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3" />
                              <span className="font-semibold">{apt.scheduled_time}</span>
                            </div>
                            <p className="font-medium truncate">{apt.appointment_type}</p>
                            <div className="flex items-center gap-1 mt-1 text-gray-600">
                              <Truck className="h-3 w-3" />
                              <span className="truncate">
                                {apt.truck_info.year} {apt.truck_info.make}
                              </span>
                            </div>
                            {apt.assigned_to_name && (
                              <div className="flex items-center gap-1 mt-1 text-gray-600">
                                <User className="h-3 w-3" />
                                <span className="truncate">{apt.assigned_to_name}</span>
                              </div>
                            )}
                            <div className="mt-1">
                              {getStatusBadge(apt.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {appointments.filter(a => a.status === 'scheduled').length}
                </p>
                <p className="text-sm text-gray-600">Scheduled</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {appointments.filter(a => a.status === 'confirmed').length}
                </p>
                <p className="text-sm text-gray-600">Confirmed</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {appointments.filter(a => a.status === 'in_progress').length}
                </p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {appointments.filter(a => a.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
