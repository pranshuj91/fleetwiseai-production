import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import Navigation from '../components/Navigation';
import { projectAPI, truckAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Plus, X, Loader2, FileText } from 'lucide-react';

const ProjectCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [loading, setLoading] = useState(false);
  const [trucks, setTrucks] = useState([]);
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    truck_id: '',
    work_order_number: '',
    complaint: '',
    customer_name: '',
    customer_id: '',
    status: 'draft'
  });
  
  const [faultCodes, setFaultCodes] = useState([]);
  const [faultCodeInput, setFaultCodeInput] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchTrucks();
  }, [effectiveCompanyId]);

  const fetchTrucks = async () => {
    try {
      // Use effectiveCompanyId which respects impersonation
      const response = await truckAPI.list(effectiveCompanyId);
      setTrucks(response.data || []);
    } catch (error) {
      console.error('Error fetching trucks:', error);
    } finally {
      setLoadingTrucks(false);
    }
  };

  const handleTruckChange = (truckId) => {
    const selectedTruck = trucks.find(t => t.id === truckId);
    setFormData(prev => ({
      ...prev,
      truck_id: truckId,
      customer_name: selectedTruck?.customer_name || prev.customer_name,
      customer_id: selectedTruck?.customer_id || prev.customer_id
    }));
  };

  const addFaultCode = () => {
    if (faultCodeInput.trim()) {
      // Split by comma and trim each code
      const codes = faultCodeInput.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
      const uniqueCodes = codes.filter(code => !faultCodes.includes(code));
      
      if (uniqueCodes.length > 0) {
        setFaultCodes([...faultCodes, ...uniqueCodes]);
        setFaultCodeInput('');
      }
    }
  };

  const removeFaultCode = (code) => {
    setFaultCodes(faultCodes.filter(c => c !== code));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFaultCode();
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.truck_id) {
      newErrors.truck_id = 'Please select a truck';
    }
    
    if (!formData.complaint.trim()) {
      newErrors.complaint = 'Please describe the issue';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const projectData = {
        ...formData,
        fault_codes: faultCodes
      };

      const response = await projectAPI.create(projectData);
      
      // Redirect to project detail page
      navigate(`/projects/${response.data.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create work order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/projects')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
        </Button>

        <Card>
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <CardTitle className="flex items-center text-2xl">
              <FileText className="mr-3 h-6 w-6" />
              Create New Work Order
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Truck Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Truck *
                </label>
                {loadingTrucks ? (
                  <div className="flex items-center text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading trucks...
                  </div>
                ) : trucks.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-3">
                    No trucks found. Please <a href="/trucks/create" className="text-blue-600 underline">add a truck</a> first.
                  </div>
                ) : (
                  <select
                    value={formData.truck_id}
                    onChange={(e) => handleTruckChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#124481]"
                  >
                    <option value="">-- Select Truck --</option>
                    {trucks.map(truck => (
                      <option key={truck.id} value={truck.id}>
                        {truck.identity?.truck_number || truck.identity?.unit_id || 'N/A'} | {truck.identity?.vin} | {truck.identity?.make} {truck.identity?.model}
                      </option>
                    ))}
                  </select>
                )}
                {errors.truck_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.truck_id}</p>
                )}
              </div>

              {/* Work Order Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Order Number (Optional)
                </label>
                <Input
                  type="text"
                  value={formData.work_order_number}
                  onChange={(e) => setFormData({ ...formData, work_order_number: e.target.value })}
                  placeholder="WO-12345"
                />
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <Input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Customer or fleet name"
                />
              </div>

              {/* Complaint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Complaint / Issue Description *
                </label>
                <Textarea
                  value={formData.complaint}
                  onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                  placeholder="Describe the issue: symptoms, when it occurs, severity, etc."
                  rows={4}
                  className={errors.complaint ? 'border-red-500' : ''}
                />
                {errors.complaint && (
                  <p className="text-red-500 text-sm mt-1">{errors.complaint}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Be as detailed as possible - this helps AI generate better diagnostic procedures
                </p>
              </div>

              {/* Fault Codes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fault Codes (DTC)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={faultCodeInput}
                    onChange={(e) => setFaultCodeInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., P0299, P0234"
                  />
                  <Button
                    type="button"
                    onClick={addFaultCode}
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter fault codes from diagnostic scanner (separate multiple codes with commas: P0401, P2002, P244B)
                </p>
                
                {/* Fault Code Chips */}
                {faultCodes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {faultCodes.map((code) => (
                      <div
                        key={code}
                        className="inline-flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {code}
                        <button
                          type="button"
                          onClick={() => removeFaultCode(code)}
                          className="ml-2 hover:text-red-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#124481]"
                >
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/projects')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || loadingTrucks || trucks.length === 0}
                  className="bg-[#124481] hover:bg-[#1E7083] flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Create Work Order
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectCreate;
