import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Edit2, Save, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { projectAPI, truckAPI } from '../lib/api';
import Navigation from '../components/Navigation';
import { BACKEND_URL } from '../lib/config';

const WorkOrderReview = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [project, setProject] = useState(null);
  const [truck, setTruck] = useState(null);
  const [editableData, setEditableData] = useState({
    customer_complaint: '',
    diagnostic_findings: '',
    root_cause: '',
    corrections_made: '',
    parts_used: [],
    labor_entries: [],
    technician_notes: '',
    recommendations: ''
  });

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const projectRes = await projectAPI.get(projectId);
      const projectData = projectRes.data;
      setProject(projectData);

      // Fetch truck data
      if (projectData.truck_id) {
        const truckRes = await truckAPI.get(projectData.truck_id);
        const truckData = truckRes.data;
        setTruck(truckData);
      }

      // Initialize editable data from project
      setEditableData({
        customer_complaint: projectData.complaint || '',
        diagnostic_findings: projectData.diagnostic_notes || '',
        root_cause: projectData.root_cause || '',
        corrections_made: projectData.corrections || '',
        parts_used: projectData.parts || [],
        labor_entries: projectData.labor || [],
        technician_notes: projectData.technician_notes || '',
        recommendations: projectData.recommendations || ''
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      alert('Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const handlePartChange = (index, field, value) => {
    const newParts = [...editableData.parts_used];
    newParts[index] = { ...newParts[index], [field]: value };
    setEditableData(prev => ({ ...prev, parts_used: newParts }));
  };

  const addPart = () => {
    setEditableData(prev => ({
      ...prev,
      parts_used: [...prev.parts_used, { part_number: '', description: '', quantity: 1, price: 0 }]
    }));
  };

  const removePart = (index) => {
    setEditableData(prev => ({
      ...prev,
      parts_used: prev.parts_used.filter((_, i) => i !== index)
    }));
  };

  const handleLaborChange = (index, field, value) => {
    const newLabor = [...editableData.labor_entries];
    newLabor[index] = { ...newLabor[index], [field]: value };
    setEditableData(prev => ({ ...prev, labor_entries: newLabor }));
  };

  const addLaborEntry = () => {
    setEditableData(prev => ({
      ...prev,
      labor_entries: [...prev.labor_entries, { description: '', hours: 0, rate: 0 }]
    }));
  };

  const removeLaborEntry = (index) => {
    setEditableData(prev => ({
      ...prev,
      labor_entries: prev.labor_entries.filter((_, i) => i !== index)
    }));
  };

  const saveDraft = async () => {
    try {
      setSaving(true);
      await api.updateProject(projectId, editableData);
      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const finalizeAndGeneratePDF = async () => {
    try {
      setFinalizing(true);
      // Call backend to finalize and generate PDF
      const response = await fetch(`${BACKEND_URL}/api/work-orders/${projectId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...editableData,
          technician_name: localStorage.getItem('userName') || 'Technician'
        })
      });

      if (!response.ok) throw new Error('Failed to finalize work order');

      const result = await response.json();
      alert('Work order completed! PDF generated successfully.');
      navigate(`/work-orders/completions/${result.completion_id}`);
    } catch (error) {
      console.error('Error finalizing:', error);
      alert('Failed to finalize work order');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
    <>
      <Navigation />
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    </>
    );
  }

  return (
    <>
      <Navigation />
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Order
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review Work Order</h1>
            <p className="text-gray-600">Review and edit before finalizing</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={finalizeAndGeneratePDF}
            disabled={finalizing}
            className="bg-green-600 hover:bg-green-700"
          >
            {finalizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Finalize & Generate PDF
          </Button>
        </div>
      </div>

      {/* Truck Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold">Truck:</span> {truck?.identity?.year} {truck?.identity?.make} {truck?.identity?.model}
            </div>
            <div>
              <span className="font-semibold">VIN:</span> {truck?.identity?.vin}
            </div>
            <div>
              <span className="font-semibold">Unit #:</span> {truck?.identity?.truck_number}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Complaint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
            Customer Complaint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editableData.customer_complaint}
            onChange={(e) => handleFieldChange('customer_complaint', e.target.value)}
            rows={3}
            className="w-full"
            placeholder="Describe the customer's complaint..."
          />
        </CardContent>
      </Card>

      {/* Diagnostic Findings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
            Diagnostic Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editableData.diagnostic_findings}
            onChange={(e) => handleFieldChange('diagnostic_findings', e.target.value)}
            rows={5}
            className="w-full"
            placeholder="Document your diagnostic findings..."
          />
        </CardContent>
      </Card>

      {/* Root Cause */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
            Root Cause
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editableData.root_cause}
            onChange={(e) => handleFieldChange('root_cause', e.target.value)}
            rows={3}
            className="w-full"
            placeholder="What caused the issue?"
          />
        </CardContent>
      </Card>

      {/* Corrections Made */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
            Corrections Made
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editableData.corrections_made}
            onChange={(e) => handleFieldChange('corrections_made', e.target.value)}
            rows={4}
            className="w-full"
            placeholder="What repairs/corrections were performed?"
          />
        </CardContent>
      </Card>

      {/* Parts Used */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
              Parts Used
            </div>
            <Button size="sm" onClick={addPart}>Add Part</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editableData.parts_used.length === 0 ? (
            <p className="text-gray-500">No parts added yet</p>
          ) : (
            <div className="space-y-3">
              {editableData.parts_used.map((part, index) => (
                <div key={index} className="flex space-x-2 items-start p-3 bg-gray-50 rounded">
                  <Input
                    placeholder="Part Number"
                    value={part.part_number}
                    onChange={(e) => handlePartChange(index, 'part_number', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Description"
                    value={part.description}
                    onChange={(e) => handlePartChange(index, 'description', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={part.quantity}
                    onChange={(e) => handlePartChange(index, 'quantity', parseInt(e.target.value))}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={part.price}
                    onChange={(e) => handlePartChange(index, 'price', parseFloat(e.target.value))}
                    className="w-24"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removePart(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labor Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
              Labor Entries
            </div>
            <Button size="sm" onClick={addLaborEntry}>Add Labor</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editableData.labor_entries.length === 0 ? (
            <p className="text-gray-500">No labor entries added yet</p>
          ) : (
            <div className="space-y-3">
              {editableData.labor_entries.map((labor, index) => (
                <div key={index} className="flex space-x-2 items-start p-3 bg-gray-50 rounded">
                  <Input
                    placeholder="Description"
                    value={labor.description}
                    onChange={(e) => handleLaborChange(index, 'description', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Hours"
                    value={labor.hours}
                    onChange={(e) => handleLaborChange(index, 'hours', parseFloat(e.target.value))}
                    className="w-24"
                  />
                  <Input
                    type="number"
                    placeholder="Rate"
                    value={labor.rate}
                    onChange={(e) => handleLaborChange(index, 'rate', parseFloat(e.target.value))}
                    className="w-24"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeLaborEntry(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technician Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
            Technician Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editableData.technician_notes}
            onChange={(e) => handleFieldChange('technician_notes', e.target.value)}
            rows={3}
            className="w-full"
            placeholder="Any additional notes..."
          />
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editableData.recommendations}
            onChange={(e) => handleFieldChange('recommendations', e.target.value)}
            rows={3}
            className="w-full"
            placeholder="Future recommendations..."
          />
        </CardContent>
      </Card>

      {/* Action Buttons (Bottom) */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          variant="outline"
          onClick={saveDraft}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Draft
        </Button>
        <Button
          onClick={finalizeAndGeneratePDF}
          disabled={finalizing}
          className="bg-green-600 hover:bg-green-700"
        >
          {finalizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Finalize & Generate PDF
        </Button>
      </div>
    </div>
    </>
  );
};

export default WorkOrderReview;
