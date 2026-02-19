import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { projectAPI, estimateAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
  ArrowLeft, FileText, Loader2, Package, Wrench, Check, Calendar
} from 'lucide-react';

const EstimateCreate = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    notes: '',
    valid_until: ''
  });

  useEffect(() => {
    fetchProject();
    // Set default valid until (30 days from now)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setFormData(prev => ({
      ...prev,
      valid_until: defaultDate.toISOString().split('T')[0]
    }));
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await projectAPI.get(projectId);
      setProject(response.data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotalParts = () => {
    if (!project?.parts_used) return 0;
    return project.parts_used.reduce((sum, part) => sum + part.total_price, 0);
  };

  const calculateSubtotalLabor = () => {
    if (!project?.labor_items) return 0;
    return project.labor_items.reduce((sum, labor) => sum + labor.total, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotalParts() + calculateSubtotalLabor();
  };

  const handleCreateEstimate = async () => {
    setCreating(true);
    try {
      const estimateData = {
        project_id: projectId,
        labor_items: project.labor_items || [],
        parts: project.parts_used || [],
        notes: formData.notes,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
      };

      const response = await estimateAPI.create(estimateData);
      navigate(`/estimates/${response.data.id}`);
    } catch (error) {
      console.error('Error creating estimate:', error);
      alert('Failed to create estimate');
    } finally {
      setCreating(false);
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
              <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Work Order
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="mr-3 h-8 w-8 text-[#124481]" />
            Create Estimate
          </h1>
          <p className="text-gray-600 mt-1">Generate estimate for customer approval</p>
        </div>

        {/* Work Order Summary */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Work Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-800">Work Order:</span>
                <span className="font-medium text-blue-900">{project.work_order_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-800">Customer:</span>
                <span className="font-medium text-blue-900">{project.customer_name || 'N/A'}</span>
              </div>
              {project.complaint && (
                <div className="pt-2 border-t border-blue-200">
                  <span className="text-blue-800">Complaint:</span>
                  <p className="font-medium text-blue-900 mt-1">{project.complaint}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Parts */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center text-lg">
              <Package className="mr-2 h-5 w-5" />
              Parts ({project.parts_used?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {project.parts_used && project.parts_used.length > 0 ? (
              <div className="space-y-2">
                {project.parts_used.map((part, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{part.part_name}</p>
                      <p className="text-sm text-gray-600">
                        {part.part_number} • Qty: {part.quantity} × ${part.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-semibold text-green-600">
                      ${part.total_price.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">Parts Subtotal:</span>
                  <span className="font-bold text-green-600">${calculateSubtotalParts().toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No parts on this work order</p>
            )}
          </CardContent>
        </Card>

        {/* Labor */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center text-lg">
              <Wrench className="mr-2 h-5 w-5" />
              Labor ({project.labor_items?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {project.labor_items && project.labor_items.length > 0 ? (
              <div className="space-y-2">
                {project.labor_items.map((labor, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{labor.description}</p>
                      <p className="text-sm text-gray-600">
                        {labor.hours} hrs × ${labor.rate.toFixed(2)}/hr
                      </p>
                    </div>
                    <span className="font-semibold text-green-600">
                      ${labor.total.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">Labor Subtotal:</span>
                  <span className="font-bold text-green-600">${calculateSubtotalLabor().toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No labor on this work order</p>
            )}
          </CardContent>
        </Card>

        {/* Estimate Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Estimate Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until
              </label>
              <Input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Default: 30 days from today</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <Textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Add any notes or special terms for this estimate..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="mb-6 border-[#124481]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Estimated Total</h3>
                <p className="text-sm text-gray-600">
                  {(project?.parts_used?.length || 0)} parts • {(project?.labor_items?.length || 0)} labor items
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-[#124481]">
                  ${calculateTotal().toFixed(2)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Before taxes & fees
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateEstimate}
            disabled={creating || (!project.parts_used?.length && !project.labor_items?.length)}
            className="flex-1 bg-[#124481] hover:bg-[#1E7083]"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Create Estimate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EstimateCreate;
