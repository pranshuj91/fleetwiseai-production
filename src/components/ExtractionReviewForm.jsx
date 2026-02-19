import React from 'react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle2, X, HelpCircle, Clock, Package, Pencil, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Button } from './ui/button';
// Helper to extract value from either new format {value, confidence} or legacy format
const getValue = (field) => {
  if (field === null || field === undefined) return null;
  if (typeof field === 'object' && 'value' in field) return field.value;
  return field;
};

const getConfidence = (field) => {
  if (field === null || field === undefined) return null;
  if (typeof field === 'object' && 'confidence' in field) return field.confidence;
  return null;
};

// Confidence indicator component
const ConfidenceIndicator = ({ confidence }) => {
  if (!confidence) return null;
  
  const colors = {
    high: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-red-100 text-red-700 border-red-200',
  };
  
  const icons = {
    high: <CheckCircle2 className="h-3 w-3" />,
    medium: <HelpCircle className="h-3 w-3" />,
    low: <AlertCircle className="h-3 w-3" />,
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border ${colors[confidence]}`}>
            {icons[confidence]}
            {confidence}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {confidence === 'high' && 'Field clearly visible in document'}
            {confidence === 'medium' && 'Field present but may need verification'}
            {confidence === 'low' && 'Field inferred or partially visible - please verify'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ExtractionReviewForm = ({ 
  extractedData, 
  onChange, 
  validationErrors = {} 
}) => {
  const [editingLineItem, setEditingLineItem] = React.useState(null);
  const [editingPartIdx, setEditingPartIdx] = React.useState(null);
  const { truck = {}, customer = {}, work_order = {}, line_items = [], labor_summary = [], parts_summary = [], extraction_confidence } = extractedData || {};

  // Normalize field values for both new {value, confidence} format and legacy format
  const truckValues = {
    vin: getValue(truck.vin) || '',
    unit_number: getValue(truck.unit_number) || '',
    year: getValue(truck.year) || '',
    make: getValue(truck.make) || '',
    model: getValue(truck.model) || '',
    odometer: getValue(truck.odometer) || '',
    engine_hours: getValue(truck.engine_hours) || '',
  };

  const customerValues = {
    name: getValue(customer.name) || '',
    location: getValue(customer.location) || '',
  };

  // Build combined complaint from all line items if available
  const buildCombinedComplaint = () => {
    const primaryComplaint = getValue(work_order.complaint) || getValue(work_order.primary_complaint) || '';
    
    if (line_items && line_items.length > 0) {
      const lineComplaints = line_items
        .map((item, idx) => {
          const complaint = item.complaint || '';
          if (complaint) {
            return `Line ${item.line_number || idx + 1}: ${complaint}`;
          }
          return null;
        })
        .filter(Boolean);
      
      if (lineComplaints.length > 0) {
        return lineComplaints.join('\n');
      }
    }
    
    return primaryComplaint;
  };

  const workOrderValues = {
    work_order_number: getValue(work_order.work_order_number) || '',
    complaint: buildCombinedComplaint(),
    fault_codes: getValue(work_order.fault_codes) || [],
  };

  const handleFieldChange = (section, field, value) => {
    const currentSection = extractedData[section] || {};
    const currentField = currentSection[field];
    
    // Preserve confidence if it exists
    const newFieldValue = currentField && typeof currentField === 'object' && 'confidence' in currentField
      ? { value, confidence: currentField.confidence }
      : value;
    
    onChange({
      ...extractedData,
      [section]: {
        ...currentSection,
        [field]: newFieldValue,
      },
    });
  };

  const handleFaultCodeRemove = (index) => {
    const currentCodes = workOrderValues.fault_codes;
    const newCodes = [...currentCodes];
    newCodes.splice(index, 1);
    handleFieldChange('work_order', 'fault_codes', newCodes);
  };

  const handleFaultCodeAdd = (code) => {
    if (code.trim()) {
      const currentCodes = workOrderValues.fault_codes;
      const newCodes = [...currentCodes, code.trim()];
      handleFieldChange('work_order', 'fault_codes', newCodes);
    }
  };

  // Handler for updating individual line items
  const handleLineItemChange = (index, field, value) => {
    const updatedLineItems = [...line_items];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: value,
    };
    onChange({
      ...extractedData,
      line_items: updatedLineItems,
    });
  };

  // Handler for updating parts in parts_summary
  const handlePartChange = (index, field, value) => {
    const updatedParts = [...parts_summary];
    updatedParts[index] = {
      ...updatedParts[index],
      [field]: value,
    };
    onChange({
      ...extractedData,
      parts_summary: updatedParts,
    });
  };

  // Aggregate parts from all line items
  const getAllParts = () => {
    const partsMap = new Map();
    
    // Check parts_summary first
    if (parts_summary && parts_summary.length > 0) {
      parts_summary.forEach(part => {
        const key = part.part_number || part.description || 'unknown';
        if (partsMap.has(key)) {
          const existing = partsMap.get(key);
          existing.quantity = (existing.quantity || 0) + (part.quantity || 1);
        } else {
          partsMap.set(key, { ...part, quantity: part.quantity || 1 });
        }
      });
    }
    
    // Also check parts in line_items
    line_items.forEach(item => {
      if (item.parts && Array.isArray(item.parts)) {
        item.parts.forEach(part => {
          const key = part.part_number || part.description || 'unknown';
          if (partsMap.has(key)) {
            const existing = partsMap.get(key);
            existing.quantity = (existing.quantity || 0) + (part.quantity || 1);
          } else {
            partsMap.set(key, { ...part, quantity: part.quantity || 1 });
          }
        });
      }
    });
    
    return Array.from(partsMap.values());
  };

  const allParts = getAllParts();

  const vinLength = truckValues.vin?.length || 0;
  const isVinValid = vinLength === 17 || vinLength === 0;

  return (
    <div className="space-y-6">
      {/* Overall confidence header */}
      {extraction_confidence && (
        <div className="flex items-center justify-end">
          <span className="text-sm text-muted-foreground mr-2">Overall extraction:</span>
          <ConfidenceIndicator confidence={extraction_confidence} />
        </div>
      )}

      {/* Vehicle Information */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <span className="h-6 w-6 rounded bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
          Vehicle Information
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="vin" className="text-sm font-medium">
                VIN <span className="text-muted-foreground">(17 characters)</span>
              </Label>
              <ConfidenceIndicator confidence={getConfidence(truck.vin)} />
            </div>
            <div className="relative">
              <Input
                id="vin"
                value={truckValues.vin}
                onChange={(e) => handleFieldChange('truck', 'vin', e.target.value.toUpperCase())}
                placeholder="Enter VIN"
                maxLength={17}
                className={`font-mono ${!isVinValid ? 'border-destructive focus:ring-destructive' : ''}`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className={`text-xs ${vinLength === 17 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {vinLength}/17
                </span>
                {vinLength === 17 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {vinLength > 0 && vinLength !== 17 && <AlertCircle className="h-4 w-4 text-amber-500" />}
              </div>
            </div>
            {validationErrors.vin && (
              <p className="text-destructive text-xs mt-1">{validationErrors.vin}</p>
            )}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="unit_number" className="text-sm font-medium">Unit/Truck Number</Label>
              <ConfidenceIndicator confidence={getConfidence(truck.unit_number)} />
            </div>
            <Input
              id="unit_number"
              value={truckValues.unit_number}
              onChange={(e) => handleFieldChange('truck', 'unit_number', e.target.value)}
              placeholder="Unit #"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="year" className="text-sm font-medium">Year</Label>
              <ConfidenceIndicator confidence={getConfidence(truck.year)} />
            </div>
            <Input
              id="year"
              type="number"
              value={truckValues.year}
              onChange={(e) => handleFieldChange('truck', 'year', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="2024"
              min={1900}
              max={2030}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="make" className="text-sm font-medium">Make</Label>
              <ConfidenceIndicator confidence={getConfidence(truck.make)} />
            </div>
            <Input
              id="make"
              value={truckValues.make}
              onChange={(e) => handleFieldChange('truck', 'make', e.target.value)}
              placeholder="Freightliner"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="model" className="text-sm font-medium">Model</Label>
              <ConfidenceIndicator confidence={getConfidence(truck.model)} />
            </div>
            <Input
              id="model"
              value={truckValues.model}
              onChange={(e) => handleFieldChange('truck', 'model', e.target.value)}
              placeholder="Cascadia"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="odometer" className="text-sm font-medium">Odometer</Label>
              <ConfidenceIndicator confidence={getConfidence(truck.odometer)} />
            </div>
            <Input
              id="odometer"
              type="number"
              value={truckValues.odometer}
              onChange={(e) => handleFieldChange('truck', 'odometer', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Miles"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="engine_hours" className="text-sm font-medium">Engine Hours</Label>
              <ConfidenceIndicator confidence={getConfidence(truck.engine_hours)} />
            </div>
            <Input
              id="engine_hours"
              type="number"
              value={truckValues.engine_hours}
              onChange={(e) => handleFieldChange('truck', 'engine_hours', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Hours"
            />
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <span className="h-6 w-6 rounded bg-[#124481] text-white text-xs flex items-center justify-center">2</span>
          Customer Information
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="customer_name" className="text-sm font-medium">Customer Name</Label>
              <ConfidenceIndicator confidence={getConfidence(customer.name)} />
            </div>
            <Input
              id="customer_name"
              value={customerValues.name}
              onChange={(e) => handleFieldChange('customer', 'name', e.target.value)}
              placeholder="Company or customer name"
            />
          </div>
          
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="location" className="text-sm font-medium">Location</Label>
              <ConfidenceIndicator confidence={getConfidence(customer.location)} />
            </div>
            <Input
              id="location"
              value={customerValues.location}
              onChange={(e) => handleFieldChange('customer', 'location', e.target.value)}
              placeholder="City, State"
            />
          </div>
        </div>
      </div>

      {/* Work Order Details */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <span className="h-6 w-6 rounded bg-amber-500 text-white text-xs flex items-center justify-center">3</span>
          Work Order Details
        </h4>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="ro_number" className="text-sm font-medium">
                RO/Work Order Number <span className="text-muted-foreground">(optional)</span>
              </Label>
              <ConfidenceIndicator confidence={getConfidence(work_order.work_order_number)} />
            </div>
            <Input
              id="ro_number"
              value={workOrderValues.work_order_number}
              onChange={(e) => handleFieldChange('work_order', 'work_order_number', e.target.value)}
              placeholder="RO-12345"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="complaint" className="text-sm font-medium">
                Complaint / Issue Description <span className="text-destructive">*</span>
              </Label>
              <ConfidenceIndicator confidence={getConfidence(work_order.complaint)} />
            </div>
            <Textarea
              id="complaint"
              value={workOrderValues.complaint}
              onChange={(e) => handleFieldChange('work_order', 'complaint', e.target.value)}
              placeholder="Describe the issue or customer complaint"
              rows={3}
              className={validationErrors.complaint ? 'border-destructive focus:ring-destructive' : ''}
            />
            {validationErrors.complaint && (
              <p className="text-destructive text-xs mt-1">{validationErrors.complaint}</p>
            )}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm font-medium">Fault Codes</Label>
              <ConfidenceIndicator confidence={getConfidence(work_order.fault_codes)} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {workOrderValues.fault_codes.map((code, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="flex items-center gap-1 bg-red-100 text-red-800 hover:bg-red-200"
                >
                  {code}
                  <button
                    type="button"
                    onClick={() => handleFaultCodeRemove(index)}
                    className="ml-1 hover:text-red-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                placeholder="Add fault code..."
                className="w-32 h-7 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFaultCodeAdd(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Press Enter to add a fault code</p>
          </div>
        </div>
      </div>

      {/* Line Items with Inline Editing */}
      {line_items && line_items.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-blue-500 text-white text-xs flex items-center justify-center">4</span>
            Line Items ({line_items.length} found)
            <span className="text-xs text-muted-foreground font-normal ml-2">Click pencil to edit</span>
          </h4>
          
          <div className="max-h-96 overflow-y-auto space-y-3 border rounded-lg p-3 bg-muted/30">
            {line_items.map((item, idx) => {
              // Build formatted header like: "1 B (08) PREVENTIVE (PM 005-50) PERFORM PM TRAILER SERVICE"
              const lineNum = item.line_number || idx + 1;
              const billableCode = item.billable || '';
              const reasonCode = item.reason || '';
              const activityCode = item.activity || '';
              const repairDesc = item.description || '';
              
              return (
                <div key={idx} className="border rounded-lg p-3 bg-background">
                  {/* Formatted Line Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono font-bold">
                          {lineNum}
                        </Badge>
                        {billableCode && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              billableCode === 'B' ? 'bg-green-100 text-green-700' :
                              billableCode === 'W' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {billableCode === 'B' ? 'Billable' : billableCode === 'W' ? 'Warranty' : 'Non-Bill'}
                          </Badge>
                        )}
                        {editingLineItem === idx ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-auto"
                            onClick={() => setEditingLineItem(null)}
                          >
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-auto"
                            onClick={() => setEditingLineItem(idx)}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Reason and Activity codes */}
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {reasonCode && (
                          <span className="text-blue-600 font-medium">{reasonCode}</span>
                        )}
                        {activityCode && (
                          <span className="text-gray-600 font-mono">{activityCode}</span>
                        )}
                      </div>
                      
                      {/* Repair Description */}
                      {repairDesc && (
                        <p className="mt-1 font-semibold text-foreground uppercase text-sm">
                          {repairDesc}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Complaint */}
                  <div className="mb-2">
                    <span className="text-xs font-medium text-red-500">Complaint:</span>
                    {editingLineItem === idx ? (
                      <Textarea
                        value={item.complaint || ''}
                        onChange={(e) => handleLineItemChange(idx, 'complaint', e.target.value)}
                        className="mt-1 text-sm"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm">{item.complaint || <span className="text-muted-foreground italic">No complaint</span>}</p>
                    )}
                  </div>
                  
                  {/* Cause */}
                  <div className="mb-2">
                    <span className="text-xs font-medium text-orange-500">Cause:</span>
                    {editingLineItem === idx ? (
                      <Textarea
                        value={item.cause || ''}
                        onChange={(e) => handleLineItemChange(idx, 'cause', e.target.value)}
                        className="mt-1 text-sm"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm text-amber-700">{item.cause || <span className="text-muted-foreground italic">No cause</span>}</p>
                    )}
                  </div>
                  
                  {/* Correction */}
                  <div className="mb-2">
                    <span className="text-xs font-medium text-green-600">Correction:</span>
                    {editingLineItem === idx ? (
                      <Textarea
                        value={item.correction || ''}
                        onChange={(e) => handleLineItemChange(idx, 'correction', e.target.value)}
                        className="mt-1 text-sm"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm text-green-700">{item.correction || <span className="text-muted-foreground italic">No correction</span>}</p>
                    )}
                  </div>
                  
                  {item.labor && item.labor.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
                      {item.labor.map((tech, techIdx) => (
                        <Badge key={techIdx} variant="secondary" className="text-xs">
                          {tech.technician_name || tech.technician_id}: {tech.hours}hrs
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Parts Summary */}
      {allParts.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-orange-500 text-white text-xs flex items-center justify-center">5</span>
            Parts Summary ({allParts.length} items)
            <span className="text-xs text-muted-foreground font-normal ml-2">Click quantity to edit</span>
          </h4>
          
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Part Number</th>
                  <th className="text-left px-3 py-2 font-medium">Description</th>
                  <th className="text-center px-3 py-2 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 font-medium">Unit Price</th>
                  <th className="text-center px-3 py-2 font-medium w-16">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allParts.map((part, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">
                      {part.part_number || '-'}
                    </td>
                    <td className="px-3 py-2">
                      {part.description || part.name || '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingPartIdx === idx ? (
                        <Input
                          type="number"
                          min="1"
                          value={part.quantity || 1}
                          onChange={(e) => handlePartChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-16 h-7 text-center text-xs mx-auto"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingPartIdx(null);
                            }
                          }}
                        />
                      ) : (
                        <Badge 
                          variant="secondary" 
                          className="text-xs cursor-pointer hover:bg-primary/20"
                          onClick={() => setEditingPartIdx(idx)}
                        >
                          {part.quantity || 1}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {part.unit_price ? `$${parseFloat(part.unit_price).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingPartIdx === idx ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setEditingPartIdx(null)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setEditingPartIdx(idx)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Parts Total */}
            <div className="bg-muted/30 px-3 py-2 flex items-center justify-between border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>Total Parts</span>
              </div>
              <Badge variant="secondary" className="text-sm font-semibold">
                {allParts.reduce((sum, part) => sum + (part.quantity || 1), 0)} items
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Labor Summary with Bar Chart */}
      {labor_summary && labor_summary.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-purple-500 text-white text-xs flex items-center justify-center">6</span>
            Labor Hours by Technician
          </h4>
          
          {/* Bar Chart */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={labor_summary.map((tech, idx) => ({
                    name: tech.technician_name || tech.technician_id || `Tech ${idx + 1}`,
                    hours: parseFloat(tech.total_hours) || 0,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <XAxis type="number" tickFormatter={(val) => `${val}h`} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={75}
                    tick={{ fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    formatter={(value) => [`${value} hours`, 'Labor']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                    {labor_summary.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(${260 + index * 20}, 70%, 60%)`} 
                      />
                    ))}
                    <LabelList 
                      dataKey="hours" 
                      position="right" 
                      formatter={(val) => `${val}h`}
                      style={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Total Hours */}
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Total Labor</span>
              </div>
              <Badge variant="secondary" className="text-sm font-semibold">
                {labor_summary.reduce((sum, tech) => sum + (parseFloat(tech.total_hours) || 0), 0).toFixed(1)} hours
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractionReviewForm;
