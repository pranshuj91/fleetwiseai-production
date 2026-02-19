import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { truckAPI, customerAPI, estimateAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, FileText, Loader2, Package, Wrench, Plus, X, Truck, User, Mail, Phone, Search
} from 'lucide-react';

const EstimateCreateStandalone = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [trucks, setTrucks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTrucks, setFilteredTrucks] = useState([]);
  
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  
  const [parts, setParts] = useState([]);
  const [laborItems, setLaborItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');

  useEffect(() => {
    fetchTrucks();
    // Set default valid until (30 days from now)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setValidUntil(defaultDate.toISOString().split('T')[0]);
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = trucks.filter(truck => 
        truck.identity.unit_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.identity.truck_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.identity.vin?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTrucks(filtered);
    } else {
      setFilteredTrucks(trucks.slice(0, 10)); // Show first 10
    }
  }, [searchQuery, trucks]);

  const fetchTrucks = async () => {
    try {
      setLoading(true);
      // Use effectiveCompanyId which respects impersonation
      const response = await truckAPI.list(effectiveCompanyId);
      const trucksData = response.data || [];
      // Keep DB order (latest created first)
      setTrucks(trucksData);
      setFilteredTrucks(trucksData.slice(0, 10));
    } catch (error) {
      console.error('Error fetching trucks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTruckSelect = async (truck) => {
    setSelectedTruck(truck);
    setSearchQuery('');
    
    // Auto-populate customer info if available
    if (truck.customer_id) {
      try {
        const response = await customerAPI.get(truck.customer_id);
        const customer = response.data;
        setCustomerInfo({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || ''
        });
      } catch (error) {
        console.error('Error fetching customer:', error);
        // Fallback to truck's customer info if available
        setCustomerInfo({
          name: truck.customer_name || '',
          phone: '',
          email: ''
        });
      }
    } else if (truck.customer_name) {
      setCustomerInfo({
        name: truck.customer_name,
        phone: '',
        email: ''
      });
    }
  };

  const addPart = () => {
    setParts([...parts, {
      part_name: '',
      part_number: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }]);
  };

  const updatePart = (index, field, value) => {
    const updated = [...parts];
    updated[index][field] = value;
    
    // Calculate total price
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total_price = updated[index].quantity * updated[index].unit_price;
    }
    
    setParts(updated);
  };

  const removePart = (index) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const addLabor = () => {
    setLaborItems([...laborItems, {
      description: '',
      hours: 0,
      rate: 0,
      total: 0
    }]);
  };

  const updateLabor = (index, field, value) => {
    const updated = [...laborItems];
    updated[index][field] = value;
    
    // Calculate total
    if (field === 'hours' || field === 'rate') {
      updated[index].total = updated[index].hours * updated[index].rate;
    }
    
    setLaborItems(updated);
  };

  const removeLabor = (index) => {
    setLaborItems(laborItems.filter((_, i) => i !== index));
  };

  const calculateSubtotalParts = () => {
    return parts.reduce((sum, part) => sum + (part.total_price || 0), 0);
  };

  const calculateSubtotalLabor = () => {
    return laborItems.reduce((sum, labor) => sum + (labor.total || 0), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotalParts() + calculateSubtotalLabor();
  };

  const handleCreateEstimate = async () => {
    if (!selectedTruck) {
      alert('Please select a truck');
      return;
    }

    if (!customerInfo.name) {
      alert('Please provide customer name');
      return;
    }

    if (parts.length === 0 && laborItems.length === 0) {
      alert('Please add at least one part or labor item');
      return;
    }

    setCreating(true);
    try {
      const estimateData = {
        truck_id: selectedTruck.id,
        truck_number: selectedTruck.identity.unit_id || selectedTruck.identity.truck_number,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email,
        labor_items: laborItems,
        parts: parts,
        notes: notes,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null
      };

      const response = await estimateAPI.create(estimateData);
      alert('Estimate created successfully!');
      navigate(`/estimates/${response.data.id}`);
    } catch (error) {
      console.error('Error creating estimate:', error);
      alert('Failed to create estimate: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/estimates')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Estimates
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="mr-3 h-8 w-8 text-[#124481]" />
            Create New Estimate
          </h1>
          <p className="text-gray-600 mt-1">Create a standalone estimate for a customer</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Truck and Customer Selection */}
          <div className="space-y-6">
            {/* Truck Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="mr-2 h-5 w-5" />
                  Select Truck
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedTruck ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by Unit ID, Truck #, or VIN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {loading ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredTrucks.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No trucks found</p>
                        ) : (
                          filteredTrucks.map((truck) => (
                            <div
                              key={truck.id}
                              onClick={() => handleTruckSelect(truck)}
                              className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <div className="font-medium text-gray-900">
                                Unit {truck.identity.unit_id || truck.identity.truck_number}
                              </div>
                              <div className="text-sm text-gray-600">
                                {truck.identity.year} {truck.identity.make} {truck.identity.model}
                              </div>
                              <div className="text-xs text-gray-500">VIN: {truck.identity.vin}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge className="bg-blue-600 mb-2">Selected Truck</Badge>
                        <div className="font-semibold text-gray-900">
                          Unit {selectedTruck.identity.unit_id || selectedTruck.identity.truck_number}
                        </div>
                        <div className="text-sm text-gray-700">
                          {selectedTruck.identity.year} {selectedTruck.identity.make} {selectedTruck.identity.model}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          VIN: {selectedTruck.identity.vin}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTruck(null);
                          setCustomerInfo({ name: '', phone: '', email: '' });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <Input
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Phone Number
                  </label>
                  <Input
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    placeholder="customer@example.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Estimate Details */}
            <Card>
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
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 30 days from today</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes or special terms..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Parts and Labor */}
          <div className="space-y-6">
            {/* Parts */}
            <Card>
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    <Package className="mr-2 h-5 w-5" />
                    Parts ({parts.length})
                  </CardTitle>
                  <Button size="sm" onClick={addPart} variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Part
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {parts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No parts added</p>
                ) : (
                  <div className="space-y-4">
                    {parts.map((part, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Part Name"
                              value={part.part_name}
                              onChange={(e) => updatePart(idx, 'part_name', e.target.value)}
                            />
                            <Input
                              placeholder="Part Number"
                              value={part.part_number}
                              onChange={(e) => updatePart(idx, 'part_number', e.target.value)}
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                placeholder="Qty"
                                value={part.quantity}
                                onChange={(e) => updatePart(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              />
                              <Input
                                type="number"
                                placeholder="Price"
                                value={part.unit_price}
                                onChange={(e) => updatePart(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              />
                              <div className="flex items-center justify-center font-semibold text-green-600">
                                ${(part.total_price || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removePart(idx)}
                            className="ml-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Parts Subtotal:</span>
                      <span className="font-bold text-green-600">${calculateSubtotalParts().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Labor */}
            <Card>
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    <Wrench className="mr-2 h-5 w-5" />
                    Labor ({laborItems.length})
                  </CardTitle>
                  <Button size="sm" onClick={addLabor} variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Labor
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {laborItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No labor added</p>
                ) : (
                  <div className="space-y-4">
                    {laborItems.map((labor, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Labor Description"
                              value={labor.description}
                              onChange={(e) => updateLabor(idx, 'description', e.target.value)}
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                placeholder="Hours"
                                value={labor.hours}
                                onChange={(e) => updateLabor(idx, 'hours', parseFloat(e.target.value) || 0)}
                              />
                              <Input
                                type="number"
                                placeholder="Rate/hr"
                                value={labor.rate}
                                onChange={(e) => updateLabor(idx, 'rate', parseFloat(e.target.value) || 0)}
                              />
                              <div className="flex items-center justify-center font-semibold text-green-600">
                                ${(labor.total || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLabor(idx)}
                            className="ml-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Labor Subtotal:</span>
                      <span className="font-bold text-green-600">${calculateSubtotalLabor().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total */}
            <Card className="border-[#124481]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Estimated Total</h3>
                    <p className="text-sm text-gray-600">
                      {parts.length} parts • {laborItems.length} labor items
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
                onClick={() => navigate('/estimates')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateEstimate}
                disabled={creating || !selectedTruck || !customerInfo.name || (parts.length === 0 && laborItems.length === 0)}
                className="flex-1 bg-[#124481] hover:bg-[#1E7083]"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Estimate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateCreateStandalone;
