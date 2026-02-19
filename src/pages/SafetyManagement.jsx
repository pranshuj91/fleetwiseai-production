import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, FileText,
  Users, MapPin, Camera, X, Plus, Loader2
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const SafetyManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Report form state
  const [reportForm, setReportForm] = useState({
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    location: '',
    severity: 'minor',
    description: '',
    personnel_involved: '',
    witnesses: '',
    immediate_action_taken: '',
    photos: []
  });

  useEffect(() => {
    fetchIncidents();
  }, [filterSeverity, filterStatus]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      let url = `${BACKEND_URL}/api/safety/incidents?`;
      
      if (filterSeverity) url += `severity=${filterSeverity}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const reportIncident = async () => {
    try {
      const payload = {
        ...reportForm,
        personnel_involved: reportForm.personnel_involved.split(',').map(s => s.trim()).filter(Boolean),
        witnesses: reportForm.witnesses.split(',').map(s => s.trim()).filter(Boolean)
      };
      
      const response = await fetch(
        `${BACKEND_URL}/api/safety/incidents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        }
      );
      
      if (response.ok) {
        setShowReportForm(false);
        setReportForm({
          incident_date: new Date().toISOString().split('T')[0],
          incident_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          location: '',
          severity: 'minor',
          description: '',
          personnel_involved: '',
          witnesses: '',
          immediate_action_taken: '',
          photos: []
        });
        await fetchIncidents();
        alert('Safety incident reported successfully!');
      }
    } catch (error) {
      console.error('Error reporting incident:', error);
      alert('Failed to report incident');
    }
  };

  const resolveIncident = async (incidentId) => {
    const notes = prompt('Enter resolution notes:');
    if (!notes) return;
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/safety/incidents/${incidentId}/resolve`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ resolution_notes: notes })
        }
      );
      
      if (response.ok) {
        await fetchIncidents();
        alert('Incident resolved successfully!');
      }
    } catch (error) {
      console.error('Error resolving incident:', error);
      alert('Failed to resolve incident');
    }
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      minor: <Badge className="bg-blue-500"><AlertTriangle className="h-3 w-3 mr-1" />Minor</Badge>,
      moderate: <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Moderate</Badge>,
      serious: <Badge className="bg-orange-600"><AlertTriangle className="h-3 w-3 mr-1" />Serious</Badge>,
      critical: <Badge className="bg-red-600"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>
    };
    return badges[severity] || <Badge>{severity}</Badge>;
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: <Badge className="bg-red-500">Open</Badge>,
      investigating: <Badge className="bg-yellow-500">Investigating</Badge>,
      resolved: <Badge className="bg-green-500">Resolved</Badge>,
      closed: <Badge className="bg-gray-500">Closed</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-[#124481]" />
              Safety Management
            </h1>
            <p className="text-gray-600 mt-1">Report and track safety incidents</p>
          </div>
          
          <Button
            onClick={() => setShowReportForm(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Incidents</p>
                  <p className="text-2xl font-bold">{incidents.length}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Incidents</p>
                  <p className="text-2xl font-bold text-red-600">
                    {incidents.filter(i => i.status === 'open').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Investigating</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {incidents.filter(i => i.status === 'investigating').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {incidents.filter(i => i.status === 'resolved').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Form Modal */}
        {showReportForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <Card className="w-full max-w-2xl mx-4 my-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Report Safety Incident</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReportForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <Input
                      type="date"
                      value={reportForm.incident_date}
                      onChange={(e) => setReportForm({...reportForm, incident_date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Time</label>
                    <Input
                      type="time"
                      value={reportForm.incident_time}
                      onChange={(e) => setReportForm({...reportForm, incident_time: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <Input
                    value={reportForm.location}
                    onChange={(e) => setReportForm({...reportForm, location: e.target.value})}
                    placeholder="Shop floor, Bay 3, etc..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <select
                    value={reportForm.severity}
                    onChange={(e) => setReportForm({...reportForm, severity: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="serious">Serious</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea
                    value={reportForm.description}
                    onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                    placeholder="Describe what happened..."
                    rows={4}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Personnel Involved (comma separated)</label>
                  <Input
                    value={reportForm.personnel_involved}
                    onChange={(e) => setReportForm({...reportForm, personnel_involved: e.target.value})}
                    placeholder="John Doe, Jane Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Witnesses (comma separated)</label>
                  <Input
                    value={reportForm.witnesses}
                    onChange={(e) => setReportForm({...reportForm, witnesses: e.target.value})}
                    placeholder="Mike Johnson, Sarah Williams"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Immediate Action Taken</label>
                  <Textarea
                    value={reportForm.immediate_action_taken}
                    onChange={(e) => setReportForm({...reportForm, immediate_action_taken: e.target.value})}
                    placeholder="First aid administered, area secured, etc..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowReportForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={reportIncident}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={!reportForm.location || !reportForm.description || !reportForm.immediate_action_taken}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Submit Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Severities</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="serious">Serious</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incidents List */}
        <Card>
          <CardHeader>
            <CardTitle>Safety Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-gray-400" />
              </div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No safety incidents reported</p>
                <p className="text-sm text-gray-400 mt-2">All clear!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incidents.map(incident => (
                  <div
                    key={incident.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSeverityBadge(incident.severity)}
                          {getStatusBadge(incident.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(incident.incident_date).toLocaleDateString()} at {incident.incident_time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{incident.location}</span>
                          </div>
                        </div>
                      </div>
                      
                      {incident.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={() => resolveIncident(incident.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-gray-900 font-medium">Description:</p>
                      <p className="text-gray-700 text-sm">{incident.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 font-medium flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Personnel Involved:
                        </p>
                        <p className="text-gray-700">{incident.personnel_involved.join(', ') || 'None'}</p>
                      </div>
                      
                      <div>
                        <p className="text-gray-600 font-medium">Immediate Action:</p>
                        <p className="text-gray-700">{incident.immediate_action_taken}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                      Reported by: {incident.reporter_name} on {new Date(incident.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SafetyManagement;
