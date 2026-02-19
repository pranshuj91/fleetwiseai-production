import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { truckAPI, vinAPI, customerAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Sparkles, Search } from 'lucide-react';
import VINScanner from '../components/VINScanner';
import { toast } from 'sonner';

const TruckCreate = () => {
  const { user } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [decodingVIN, setDecodingVIN] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [formData, setFormData] = useState({
    vin: '',
    truck_number: '',
    year: '',
    make: '',
    model: '',
    trim: '',
    vehicle_class: '',
    body_type: '',
    odometer_mi: '',
    engine_hours: '',
    customer_name: '',
    customer_id: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (customerSearch) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers.slice(0, 10));
    }
  }, [customerSearch, customers]);

  const fetchCustomers = async () => {
    try {
      // Use effectiveCompanyId which respects impersonation
      const response = await customerAPI.list(effectiveCompanyId);
      setCustomers(response.data || []);
      setFilteredCustomers((response.data || []).slice(0, 10));
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name
    }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleVINScan = (scanResult) => {
    // Auto-populate form with scanned VIN data
    setFormData(prev => ({
      ...prev,
      vin: scanResult.vin || prev.vin,
      year: scanResult.year || prev.year,
      make: scanResult.make || prev.make,
      model: scanResult.model || prev.model
    }));
    
    // Auto-decode VIN if available
    if (scanResult.vin && scanResult.vin.length === 17) {
      // Will trigger VIN decode
      setTimeout(() => handleVINDecode(), 500);
    }
  };

  const handleVINDecode = async () => {
    if (!formData.vin || formData.vin.length !== 17) {
      setError('Please enter a valid 17-character VIN');
      return;
    }

    setDecodingVIN(true);
    setError('');

    try {
      const response = await vinAPI.decode(formData.vin);
      const decoded = response.data;

      setFormData(prev => ({
        ...prev,
        year: decoded.year || '',
        make: decoded.make || '',
        model: decoded.model || '',
        vehicle_class: decoded.vehicle_class || '',
        body_type: decoded.body_type || '',
      }));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Failed to decode VIN. Please enter details manually.');
    } finally {
      setDecodingVIN(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate VIN
    if (!formData.vin || formData.vin.length !== 17) {
      setError('VIN must be exactly 17 characters');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const truckData = {
        company_id: user.company_id,
        identity: {
          vin: formData.vin.toUpperCase(),
          unit_id: formData.unit_id || null,
          truck_number: formData.truck_number || null,
          year: formData.year ? parseInt(formData.year) : null,
          make: formData.make || null,
          model: formData.model || null,
          vehicle_class: formData.vehicle_class || null,
          body_type: formData.body_type || null,
          odometer_mi: formData.odometer_mi ? parseInt(formData.odometer_mi) : null,
          engine_hours: formData.engine_hours ? parseInt(formData.engine_hours) : null,
        },
        customer_id: formData.customer_id || null,
      };

      const response = await truckAPI.create(truckData);
      toast.success('Truck created successfully!');
      navigate(`/trucks/${response.data.id}`);
    } catch (error) {
      const message = error.message || 'Failed to create truck';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="truck-create-page">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="create-truck-title">Add New Truck</h1>
          <p className="text-gray-600">Add a new truck to your fleet. Start with the VIN for auto-population.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Vehicle Identification</CardTitle>
              <CardDescription>Enter the VIN to automatically populate vehicle details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="error-alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-green-50 text-green-900 border-green-200" data-testid="success-alert">
                  <AlertDescription>VIN decoded successfully!</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="vin" className="text-sm font-medium">VIN *</label>
                <div className="flex gap-2">
                  <Input
                    id="vin"
                    name="vin"
                    value={formData.vin}
                    onChange={handleChange}
                    placeholder="Enter 17-character VIN"
                    maxLength={17}
                    required
                    className="flex-1"
                    data-testid="vin-input"
                  />
                  <VINScanner 
                    onScanComplete={handleVINScan}
                    buttonText="Scan"
                    buttonSize="default"
                  />
                  <Button
                    type="button"
                    onClick={handleVINDecode}
                    disabled={decodingVIN || formData.vin.length !== 17}
                    className="bg-[#289790] hover:bg-[#1E7083]"
                    data-testid="decode-vin-button"
                  >
                    {decodingVIN ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="unit_id" className="text-sm font-medium">Unit ID</label>
                  <Input
                    id="unit_id"
                    name="unit_id"
                    value={formData.unit_id}
                    onChange={handleChange}
                    placeholder="e.g., UNIT-001"
                    data-testid="unit-id-input"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="truck_number" className="text-sm font-medium">Truck Number</label>
                  <Input
                    id="truck_number"
                    name="truck_number"
                    value={formData.truck_number}
                    onChange={handleChange}
                    placeholder="e.g., TRK-001"
                    data-testid="truck-number-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="year" className="text-sm font-medium">Year</label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    value={formData.year}
                    onChange={handleChange}
                    placeholder="2023"
                    data-testid="year-input"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="make" className="text-sm font-medium">Make</label>
                  <Input
                    id="make"
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    placeholder="Ford, Freightliner, etc."
                    data-testid="make-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">

                <div className="space-y-2">
                  <label htmlFor="model" className="text-sm font-medium">Model</label>
                  <Input
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="F-150, Cascadia, etc."
                    data-testid="model-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="vehicle_class" className="text-sm font-medium">Vehicle Class</label>
                  <Input
                    id="vehicle_class"
                    name="vehicle_class"
                    value={formData.vehicle_class}
                    onChange={handleChange}
                    placeholder="Class 5, 6, 7, 8"
                    data-testid="vehicle-class-input"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="body_type" className="text-sm font-medium">Body Type</label>
                  <Input
                    id="body_type"
                    name="body_type"
                    value={formData.body_type}
                    onChange={handleChange}
                    placeholder="Pickup, Box Truck, etc."
                    data-testid="body-type-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="odometer_mi" className="text-sm font-medium">Odometer (miles)</label>
                  <Input
                    id="odometer_mi"
                    name="odometer_mi"
                    type="number"
                    value={formData.odometer_mi}
                    onChange={handleChange}
                    placeholder="125000"
                    data-testid="odometer-input"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="engine_hours" className="text-sm font-medium">Engine Hours</label>
                  <Input
                    id="engine_hours"
                    name="engine_hours"
                    type="number"
                    value={formData.engine_hours}
                    onChange={handleChange}
                    placeholder="5000"
                    data-testid="engine-hours-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Link this truck to a customer (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Customer</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search customers by name or email..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="pl-10"
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="p-3 hover:bg-blue-50 cursor-pointer transition-colors border-b last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          {customer.email && (
                            <div className="text-sm text-gray-600">{customer.email}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {formData.customer_id && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-green-900">✓ Customer Linked</div>
                      <div className="text-sm text-green-700">{formData.customer_name}</div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFormData(prev => ({...prev, customer_id: '', customer_name: ''}));
                        setCustomerSearch('');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Link this truck to an existing customer to track their fleet
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/trucks')}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#124481] hover:bg-[#1E7083]"
              data-testid="submit-button"
            >
              {loading ? 'Creating...' : 'Create Truck'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TruckCreate;
