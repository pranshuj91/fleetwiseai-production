import React, { useState } from 'react';
import { laborAPI } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Loader2, Wrench, X } from 'lucide-react';

const LaborEntryModal = ({ projectId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    hours: '',
    rate: '125.00', // Default shop rate
    technician: ''
  });
  const [adding, setAdding] = useState(false);

  const commonLabor = [
    { description: 'Diagnostic Time', hours: 1.0, rate: 125.00 },
    { description: 'Engine Repair', hours: 8.0, rate: 125.00 },
    { description: 'Transmission Service', hours: 4.0, rate: 125.00 },
    { description: 'Brake Service', hours: 3.0, rate: 125.00 },
    { description: 'DPF Cleaning', hours: 2.0, rate: 125.00 },
    { description: 'EGR Service', hours: 6.0, rate: 125.00 },
    { description: 'Oil Change & PM Service', hours: 1.5, rate: 125.00 },
    { description: 'Electrical Troubleshooting', hours: 2.0, rate: 135.00 },
  ];

  const handleQuickSelect = (labor) => {
    setFormData({
      ...formData,
      description: labor.description,
      hours: labor.hours.toString(),
      rate: labor.rate.toString()
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAdding(true);

    try {
      const hours = parseFloat(formData.hours);
      const rate = parseFloat(formData.rate);

      if (isNaN(hours) || isNaN(rate)) {
        alert('Please enter valid numbers for hours and rate');
        return;
      }

      await laborAPI.addToProject(
        projectId,
        formData.description,
        hours,
        rate,
        formData.technician || null
      );
      onSuccess();
    } catch (error) {
      console.error('Error adding labor:', error);
      alert('Failed to add labor to work order');
    } finally {
      setAdding(false);
    }
  };

  const calculateTotal = () => {
    const hours = parseFloat(formData.hours) || 0;
    const rate = parseFloat(formData.rate) || 0;
    return (hours * rate).toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Wrench className="mr-2 h-6 w-6 text-[#289790]" />
              Add Labor to Work Order
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Quick Select Common Labor */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Select:</h3>
            <div className="grid grid-cols-2 gap-2">
              {commonLabor.map((labor, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickSelect(labor)}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:border-[#289790] hover:bg-[#289790] hover:bg-opacity-5 transition-all"
                >
                  <div className="font-medium text-sm text-gray-900">{labor.description}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {labor.hours} hrs × ${labor.rate}/hr = ${(labor.hours * labor.rate).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Or Enter Custom Labor:</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <Textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="e.g., Engine repair - replaced EGR cooler and cleaned intake"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hours <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.25"
                    min="0"
                    value={formData.hours}
                    onChange={(e) => setFormData({...formData, hours: e.target.value})}
                    placeholder="8.0"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate ($/hr) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.rate}
                    onChange={(e) => setFormData({...formData, rate: e.target.value})}
                    placeholder="125.00"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <div className="h-10 flex items-center px-3 bg-gray-100 border border-gray-300 rounded-md font-semibold text-green-600">
                    ${calculateTotal()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technician (optional)
                </label>
                <Input
                  value={formData.technician}
                  onChange={(e) => setFormData({...formData, technician: e.target.value})}
                  placeholder="Technician name"
                  className="w-full"
                />
              </div>

              {/* Labor Rate Reference */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <h4 className="font-semibold text-blue-900 mb-2">Standard Labor Rates:</h4>
                <div className="grid grid-cols-2 gap-2 text-blue-800">
                  <div>• Standard Repair: $125/hr</div>
                  <div>• Diagnostic: $125/hr</div>
                  <div>• Electrical: $135/hr</div>
                  <div>• Emergency: $175/hr</div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={onClose}
                  disabled={adding}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={adding || !formData.description || !formData.hours || !formData.rate}
                  className="flex-1 bg-[#289790] hover:bg-[#1E7083]"
                >
                  {adding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Labor'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaborEntryModal;
