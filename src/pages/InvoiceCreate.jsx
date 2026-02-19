import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { projectAPI, invoiceAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
  ArrowLeft, FileText, Loader2, DollarSign, Package, Wrench, Check
} from 'lucide-react';

const InvoiceCreate = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    shop_supplies_fee: 50.00,
    environmental_fee: 25.00,
    tax_rate: 0.0825, // 8.25% default
    notes: ''
  });

  useEffect(() => {
    fetchProject();
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

  const calculateSubtotal = () => {
    return calculateSubtotalParts() + calculateSubtotalLabor() + 
           formData.shop_supplies_fee + formData.environmental_fee;
  };

  const calculateTax = () => {
    return calculateSubtotal() * formData.tax_rate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCreateInvoice = async () => {
    setCreating(true);
    try {
      const invoiceData = {
        project_id: projectId,
        labor_items: project.labor_items || [],
        parts: project.parts_used || [],
        shop_supplies_fee: parseFloat(formData.shop_supplies_fee),
        environmental_fee: parseFloat(formData.environmental_fee),
        tax_rate: parseFloat(formData.tax_rate),
        notes: formData.notes
      };

      const response = await invoiceAPI.create(invoiceData);
      navigate(`/invoices/${response.data.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
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
            <FileText className="mr-3 h-8 w-8 text-[#289790]" />
            Create Invoice
          </h1>
          <p className="text-gray-600 mt-1">Generate invoice from work order</p>
        </div>

        {/* Work Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Work Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Work Order:</span>
                <span className="font-medium">{project.work_order_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{project.customer_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium capitalize">{project.status}</span>
              </div>
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
                        {labor.technician && ` • ${labor.technician}`}
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

        {/* Fees and Tax */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fees & Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Supplies Fee
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.shop_supplies_fee}
                onChange={(e) => setFormData({...formData, shop_supplies_fee: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Environmental Fee
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.environmental_fee}
                onChange={(e) => setFormData({...formData, environmental_fee: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Rate (e.g., 0.0825 for 8.25%)
              </label>
              <Input
                type="number"
                step="0.0001"
                value={formData.tax_rate}
                onChange={(e) => setFormData({...formData, tax_rate: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <Textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Payment terms, special instructions, etc."
              />
            </div>
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="mb-6 border-[#289790]">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-700">Tax ({(formData.tax_rate * 100).toFixed(2)}%):</span>
                <span className="font-semibold">${calculateTax().toFixed(2)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">Total:</span>
                  <span className="text-3xl font-bold text-[#289790]">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
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
            onClick={handleCreateInvoice}
            disabled={creating || (!project.parts_used?.length && !project.labor_items?.length)}
            className="flex-1 bg-[#289790] hover:bg-[#1E7083]"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Create Invoice
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreate;
