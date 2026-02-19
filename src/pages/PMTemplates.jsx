import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { pmAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Calendar, Loader2, Plus, Edit, Trash2, Clock, Gauge, X
} from 'lucide-react';

const PMTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await pmAPI.templates.list();
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this PM template?')) return;
    
    try {
      await pmAPI.templates.delete(id);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const commonTemplates = [
    {
      name: 'Oil Change & PM Service',
      description: 'Standard preventive maintenance with oil and filter change',
      interval_miles: 10000,
      interval_days: 90,
      task_list: [
        'Change engine oil and filter',
        'Inspect air filter',
        'Check coolant level',
        'Inspect belts and hoses',
        'Check tire pressure',
        'Lubricate chassis',
        'Inspect brake system'
      ],
      estimated_labor_hours: 1.5,
      estimated_parts_cost: 150
    },
    {
      name: 'DPF Cleaning Service',
      description: 'Diesel Particulate Filter cleaning and inspection',
      interval_miles: 150000,
      interval_days: 365,
      task_list: [
        'Remove DPF from vehicle',
        'Pressure clean DPF',
        'Inspect DPF for damage',
        'Test DPF back pressure',
        'Reinstall DPF',
        'Clear fault codes',
        'Test drive'
      ],
      estimated_labor_hours: 4.0,
      estimated_parts_cost: 0
    },
    {
      name: 'Annual DOT Inspection',
      description: 'Complete DOT safety inspection',
      interval_days: 365,
      task_list: [
        'Brake system inspection',
        'Steering system check',
        'Lighting inspection',
        'Tire inspection',
        'Wheel and rim inspection',
        'Emergency equipment check',
        'Complete DOT inspection form'
      ],
      estimated_labor_hours: 2.0,
      estimated_parts_cost: 0
    },
    {
      name: 'Transmission Service',
      description: 'Transmission fluid and filter service',
      interval_miles: 50000,
      interval_days: 180,
      task_list: [
        'Drain transmission fluid',
        'Replace transmission filter',
        'Clean transmission pan',
        'Refill with new fluid',
        'Check for leaks',
        'Test drive'
      ],
      estimated_labor_hours: 3.0,
      estimated_parts_cost: 300
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Calendar className="mr-3 h-8 w-8 text-[#289790]" />
                PM Templates
              </h1>
              <p className="text-gray-600 mt-1">Create and manage preventive maintenance templates</p>
            </div>
            <Button 
              onClick={() => setShowModal(true)}
              className="bg-[#289790] hover:bg-[#1E7083]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        </div>

        {/* Common Templates */}
        {templates.length === 0 && !loading && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Quick Start: Common PM Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-800 mb-4">
                Get started quickly with these common maintenance templates. Click to add to your templates.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {commonTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowModal(true);
                    }}
                    className="text-left p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <div className="flex gap-3 text-xs text-gray-500">
                      {template.interval_miles && (
                        <span>📏 {template.interval_miles.toLocaleString()} mi</span>
                      )}
                      {template.interval_days && (
                        <span>📅 {template.interval_days} days</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No PM templates yet</h3>
              <p className="text-gray-600 mb-4">Create templates to standardize your maintenance procedures</p>
              <Button onClick={() => setShowModal(true)} className="bg-[#289790] hover:bg-[#1E7083]">
                <Plus className="mr-2 h-4 w-4" />
                Create First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{template.name}</CardTitle>
                      <p className="text-sm text-gray-600">{template.description || 'No description'}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Intervals */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.interval_miles && (
                      <Badge variant="outline" className="bg-blue-50 border-blue-200">
                        <Gauge className="h-3 w-3 mr-1" />
                        {template.interval_miles.toLocaleString()} miles
                      </Badge>
                    )}
                    {template.interval_days && (
                      <Badge variant="outline" className="bg-green-50 border-green-200">
                        <Calendar className="h-3 w-3 mr-1" />
                        {template.interval_days} days
                      </Badge>
                    )}
                    {template.interval_hours && (
                      <Badge variant="outline" className="bg-purple-50 border-purple-200">
                        <Clock className="h-3 w-3 mr-1" />
                        {template.interval_hours} hours
                      </Badge>
                    )}
                  </div>

                  {/* Task List */}
                  {template.task_list && template.task_list.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Tasks ({template.task_list.length}):</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {template.task_list.slice(0, 3).map((task, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{task}</span>
                          </li>
                        ))}
                        {template.task_list.length > 3 && (
                          <li className="text-gray-500 italic">+ {template.task_list.length - 3} more tasks...</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Estimates */}
                  {(template.estimated_labor_hours || template.estimated_parts_cost) && (
                    <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                      <p className="font-semibold text-gray-700 mb-1">Estimates:</p>
                      <div className="flex gap-4">
                        {template.estimated_labor_hours && (
                          <span className="text-gray-600">Labor: {template.estimated_labor_hours} hrs</span>
                        )}
                        {template.estimated_parts_cost > 0 && (
                          <span className="text-gray-600">Parts: ${template.estimated_parts_cost}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowModal(true);
                      }}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <TemplateFormModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingTemplate(null);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
};

// Template Form Modal Component
const TemplateFormModal = ({ template, onClose, onSuccess }) => {
  const [formData, setFormData] = useState(template || {
    name: '',
    description: '',
    interval_miles: '',
    interval_hours: '',
    interval_days: '',
    task_list: [],
    estimated_labor_hours: '',
    estimated_parts_cost: ''
  });
  const [taskInput, setTaskInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    setFormData({
      ...formData,
      task_list: [...(formData.task_list || []), taskInput.trim()]
    });
    setTaskInput('');
  };

  const handleRemoveTask = (index) => {
    setFormData({
      ...formData,
      task_list: formData.task_list.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...formData,
        interval_miles: formData.interval_miles ? parseInt(formData.interval_miles) : null,
        interval_hours: formData.interval_hours ? parseInt(formData.interval_hours) : null,
        interval_days: formData.interval_days ? parseInt(formData.interval_days) : null,
        estimated_labor_hours: formData.estimated_labor_hours ? parseFloat(formData.estimated_labor_hours) : null,
        estimated_parts_cost: formData.estimated_parts_cost ? parseFloat(formData.estimated_parts_cost) : null
      };

      if (template?.id) {
        await pmAPI.templates.update(template.id, data);
      } else {
        await pmAPI.templates.create(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{template?.id ? 'Edit Template' : 'Create PM Template'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Oil Change & PM Service"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of this maintenance"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Maintenance Intervals</h3>
              <p className="text-sm text-gray-600 mb-3">Set at least one interval (miles, hours, or days)</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miles</label>
                  <Input
                    type="number"
                    value={formData.interval_miles}
                    onChange={(e) => setFormData({...formData, interval_miles: e.target.value})}
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                  <Input
                    type="number"
                    value={formData.interval_hours}
                    onChange={(e) => setFormData({...formData, interval_hours: e.target.value})}
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                  <Input
                    type="number"
                    value={formData.interval_days}
                    onChange={(e) => setFormData({...formData, interval_days: e.target.value})}
                    placeholder="90"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Task Checklist</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                  placeholder="Add a task..."
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddTask} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.task_list && formData.task_list.length > 0 && (
                <ul className="space-y-2">
                  {formData.task_list.map((task, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{task}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Estimates (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Labor Hours</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.estimated_labor_hours}
                    onChange={(e) => setFormData({...formData, estimated_labor_hours: e.target.value})}
                    placeholder="1.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parts Cost</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.estimated_parts_cost}
                    onChange={(e) => setFormData({...formData, estimated_parts_cost: e.target.value})}
                    placeholder="150.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="flex-1 bg-[#289790] hover:bg-[#1E7083]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  template?.id ? 'Update Template' : 'Create Template'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PMTemplates;
