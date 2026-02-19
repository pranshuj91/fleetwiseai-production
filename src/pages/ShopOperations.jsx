import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Clock, Package, CheckSquare, Play, Pause, 
  Wrench, Loader2, Timer, Box
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const ShopOperations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('time'); // 'time', 'equipment', 'quality'
  const [timeEntries, setTimeEntries] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);

  useEffect(() => {
    fetchTimeEntries();
    fetchEquipment();
  }, []);

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/time-tracking/my-entries`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setTimeEntries(data);
        const active = data.find(e => !e.end_time);
        setActiveEntry(active);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipment = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/equipment/my-checkouts`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const startTimer = async (taskId) => {
    if (!taskId) {
      taskId = prompt('Enter task ID to start tracking:');
      if (!taskId) return;
    }
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/time-tracking/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ task_id: taskId })
        }
      );
      
      if (response.ok) {
        await fetchTimeEntries();
        alert('Timer started!');
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Failed to start timer');
    }
  };

  const stopTimer = async (entryId) => {
    const breakMinutes = parseInt(prompt('Enter break time in minutes:', '0') || '0');
    const notes = prompt('Add any notes (optional):');
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/time-tracking/stop/${entryId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ break_minutes: breakMinutes, notes: notes })
        }
      );
      
      if (response.ok) {
        await fetchTimeEntries();
        alert('Timer stopped!');
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      alert('Failed to stop timer');
    }
  };

  const checkoutEquipment = async () => {
    const equipmentName = prompt('Enter equipment name:');
    if (!equipmentName) return;
    
    const purpose = prompt('Purpose of checkout:');
    if (!purpose) return;
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/equipment/checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            equipment_name: equipmentName,
            purpose: purpose
          })
        }
      );
      
      if (response.ok) {
        await fetchEquipment();
        alert('Equipment checked out!');
      }
    } catch (error) {
      console.error('Error checking out equipment:', error);
      alert('Failed to checkout equipment');
    }
  };

  const returnEquipment = async (checkoutId) => {
    const condition = prompt('Equipment condition notes (optional):');
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/equipment/return/${checkoutId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ condition_notes: condition })
        }
      );
      
      if (response.ok) {
        await fetchEquipment();
        alert('Equipment returned!');
      }
    } catch (error) {
      console.error('Error returning equipment:', error);
      alert('Failed to return equipment');
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-8 w-8 text-[#124481]" />
            Shop Operations
          </h1>
          <p className="text-gray-600 mt-1">Track time, equipment, and quality checks</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('time')}
            variant={activeTab === 'time' ? 'default' : 'outline'}
            className={activeTab === 'time' ? 'bg-[#124481]' : ''}
          >
            <Clock className="h-4 w-4 mr-2" />
            Time Tracking
          </Button>
          <Button
            onClick={() => setActiveTab('equipment')}
            variant={activeTab === 'equipment' ? 'default' : 'outline'}
            className={activeTab === 'equipment' ? 'bg-[#124481]' : ''}
          >
            <Box className="h-4 w-4 mr-2" />
            Equipment
          </Button>
        </div>

        {/* Time Tracking Tab */}
        {activeTab === 'time' && (
          <div className="space-y-6">
            {/* Active Timer Card */}
            {activeEntry && (
              <Card className="border-2 border-green-500">
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center gap-2">
                    <Timer className="h-5 w-5 animate-pulse" />
                    Active Timer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Task:</p>
                      <p className="font-semibold">{activeEntry.task_title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Started:</p>
                      <p className="font-semibold">
                        {new Date(activeEntry.start_time).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => stopTimer(activeEntry.id)}
                      className="bg-red-600 hover:bg-red-700 w-full"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Timer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Start Timer Button */}
            {!activeEntry && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={() => startTimer()}
                    className="bg-green-600 hover:bg-green-700 w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start New Timer
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Time Entries List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Time Entries</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : timeEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No time entries yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeEntries.map(entry => (
                      <div
                        key={entry.id}
                        className="border rounded p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">{entry.task_title}</p>
                          {entry.total_minutes && (
                            <Badge className="bg-[#289790]">
                              {formatDuration(entry.total_minutes)}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <p>Started: {new Date(entry.start_time).toLocaleString()}</p>
                          </div>
                          {entry.end_time && (
                            <div>
                              <p>Ended: {new Date(entry.end_time).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-gray-600 mt-2">Notes: {entry.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={checkoutEquipment}
                  className="bg-[#289790] hover:bg-[#1E7083] w-full"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Checkout Equipment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Equipment Checkouts</CardTitle>
              </CardHeader>
              <CardContent>
                {equipment.length === 0 ? (
                  <div className="text-center py-8">
                    <Box className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No equipment checked out</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {equipment.map(item => (
                      <div
                        key={item.id}
                        className="border rounded p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">{item.equipment_name}</p>
                          <Badge className={item.status === 'checked_out' ? 'bg-yellow-500' : 'bg-green-500'}>
                            {item.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Purpose: {item.purpose}</p>
                          <p>Checked out: {new Date(item.checked_out_at).toLocaleString()}</p>
                          {item.returned_at && (
                            <p>Returned: {new Date(item.returned_at).toLocaleString()}</p>
                          )}
                        </div>
                        {item.status === 'checked_out' && (
                          <Button
                            onClick={() => returnEquipment(item.id)}
                            size="sm"
                            className="mt-3 bg-[#124481]"
                          >
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Return Equipment
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopOperations;
