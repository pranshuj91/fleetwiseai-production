import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Truck, User, Wrench, Save, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

const SERVICE_CATEGORIES = [
  { key: 'pm', label: 'Preventive Maintenance' },
  { key: 'brakes', label: 'Brakes' },
  { key: 'tires', label: 'Tires' },
  { key: 'emissions', label: 'Emissions/Aftertreatment' },
  { key: 'engine', label: 'Engine' },
  { key: 'transmission', label: 'Transmission' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'hvac', label: 'HVAC/Climate' },
  { key: 'suspension', label: 'Suspension' },
];

const EditableExtraction = ({ extractedData, onSave, onCancel, saving = false }) => {
  const [truckData, setTruckData] = useState(extractedData.truck || {});
  const [customerData, setCustomerData] = useState(extractedData.customer || {});
  const [workOrderData, setWorkOrderData] = useState(extractedData.work_order || {});
  const [serviceCategories, setServiceCategories] = useState(extractedData.service_categories || {});
  const [partsListed, setPartsListed] = useState(extractedData.parts_listed || []);
  const [laborHours, setLaborHours] = useState(extractedData.labor_hours || null);

  const confidence = extractedData.extraction_confidence || 'medium';

  const handleTruckChange = (field, value) => {
    setTruckData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerChange = (field, value) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  const handleWorkOrderChange = (field, value) => {
    setWorkOrderData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (category) => {
    setServiceCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSaveAll = () => {
    onSave({
      truck: truckData,
      customer: customerData,
      work_order: workOrderData,
      service_categories: serviceCategories,
      parts_listed: partsListed,
      labor_hours: laborHours,
      source_file_name: extractedData.source_file_name,
    });
  };

  const getConfidenceBadge = () => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> High Confidence</Badge>;
      case 'low':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" /> Low Confidence</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-blue-900">
            <strong>Review extracted data.</strong> Edit any field before saving.
          </p>
          {extractedData.source_file_name && (
            <p className="text-xs text-blue-700 mt-1">Source: {extractedData.source_file_name}</p>
          )}
        </div>
        {getConfidenceBadge()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Truck Information */}
        <Card data-testid="editable-truck-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Truck className="mr-2 h-5 w-5 text-[#124481]" />
              Truck Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-600">VIN *</Label>
              <Input
                value={truckData.vin || ''}
                onChange={(e) => handleTruckChange('vin', e.target.value.toUpperCase())}
                placeholder="17-character VIN"
                maxLength={17}
                className={truckData.vin?.length === 17 ? 'border-green-500' : ''}
                data-testid="edit-vin"
              />
              {truckData.vin && truckData.vin.length !== 17 && (
                <p className="text-xs text-red-500 mt-1">VIN must be exactly 17 characters</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Unit / Truck Number</Label>
              <Input
                value={truckData.unit_number || ''}
                onChange={(e) => handleTruckChange('unit_number', e.target.value)}
                placeholder="Unit/Truck #"
                data-testid="edit-truck-number"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-medium text-gray-600">Year</Label>
                <Input
                  type="number"
                  value={truckData.year || ''}
                  onChange={(e) => handleTruckChange('year', parseInt(e.target.value) || null)}
                  placeholder="2020"
                  data-testid="edit-year"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Make</Label>
                <Input
                  value={truckData.make || ''}
                  onChange={(e) => handleTruckChange('make', e.target.value)}
                  placeholder="Freightliner"
                  data-testid="edit-make"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Model</Label>
                <Input
                  value={truckData.model || ''}
                  onChange={(e) => handleTruckChange('model', e.target.value)}
                  placeholder="Cascadia"
                  data-testid="edit-model"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium text-gray-600">Odometer (miles)</Label>
                <Input
                  type="number"
                  value={truckData.odometer || ''}
                  onChange={(e) => handleTruckChange('odometer', parseInt(e.target.value) || null)}
                  placeholder="125000"
                  data-testid="edit-odometer"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Engine Hours</Label>
                <Input
                  type="number"
                  value={truckData.engine_hours || ''}
                  onChange={(e) => handleTruckChange('engine_hours', parseInt(e.target.value) || null)}
                  placeholder="5000"
                  data-testid="edit-engine-hours"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card data-testid="editable-customer-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <User className="mr-2 h-5 w-5 text-[#1E7083]" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-600">Customer Name</Label>
              <Input
                value={customerData.name || ''}
                onChange={(e) => handleCustomerChange('name', e.target.value)}
                placeholder="Company or Customer Name"
                data-testid="edit-customer-name"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Customer ID / Reference</Label>
              <Input
                value={customerData.id_ref || ''}
                onChange={(e) => handleCustomerChange('id_ref', e.target.value)}
                placeholder="Customer Reference #"
                data-testid="edit-customer-id"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Location</Label>
              <Input
                value={customerData.location || ''}
                onChange={(e) => handleCustomerChange('location', e.target.value)}
                placeholder="City, State"
                data-testid="edit-location"
              />
            </div>

            {/* Labor Hours */}
            <div className="pt-4 border-t">
              <Label className="text-xs font-medium text-gray-600">Total Labor Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={laborHours || ''}
                onChange={(e) => setLaborHours(parseFloat(e.target.value) || null)}
                placeholder="2.5"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Order Details - Full Width */}
      <Card data-testid="editable-work-order-card">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Wrench className="mr-2 h-5 w-5 text-[#289790]" />
            Work Order Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-600">Work Order #</Label>
              <Input
                value={workOrderData.work_order_number || ''}
                onChange={(e) => handleWorkOrderChange('work_order_number', e.target.value)}
                placeholder="WO Number"
                data-testid="edit-wo-number"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Date</Label>
              <Input
                type="date"
                value={workOrderData.date || ''}
                onChange={(e) => handleWorkOrderChange('date', e.target.value)}
                data-testid="edit-wo-date"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600">Complaint / Symptoms</Label>
            <Textarea
              value={workOrderData.complaint || ''}
              onChange={(e) => handleWorkOrderChange('complaint', e.target.value)}
              placeholder="Describe the customer complaint or symptoms..."
              rows={3}
              data-testid="edit-complaint"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600">Cause (Diagnosis)</Label>
            <Textarea
              value={workOrderData.cause || ''}
              onChange={(e) => handleWorkOrderChange('cause', e.target.value)}
              placeholder="Root cause identified..."
              rows={2}
              data-testid="edit-cause"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600">Correction (Repair Performed)</Label>
            <Textarea
              value={workOrderData.correction || ''}
              onChange={(e) => handleWorkOrderChange('correction', e.target.value)}
              placeholder="Repair actions taken..."
              rows={3}
              data-testid="edit-correction"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600">Fault Codes (comma-separated)</Label>
            <Input
              value={Array.isArray(workOrderData.fault_codes) ? workOrderData.fault_codes.join(', ') : workOrderData.fault_codes || ''}
              onChange={(e) => handleWorkOrderChange('fault_codes', e.target.value.split(',').map(c => c.trim()).filter(Boolean))}
              placeholder="SPN 524, FMI 2, P0420, etc."
              data-testid="edit-fault-codes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Service Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Categories</CardTitle>
          <p className="text-sm text-gray-500">Select all that apply - this helps track maintenance history</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SERVICE_CATEGORIES.map(({ key, label }) => (
              <label 
                key={key} 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  serviceCategories[key] ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                }`}
              >
                <Checkbox
                  checked={serviceCategories[key] || false}
                  onCheckedChange={() => handleCategoryToggle(key)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          data-testid="cancel-edit-button"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveAll}
          disabled={saving || !truckData.vin || truckData.vin.length !== 17}
          className="bg-[#124481] hover:bg-[#1E7083]"
          data-testid="save-extraction-button"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Work Order & Update Truck
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default EditableExtraction;