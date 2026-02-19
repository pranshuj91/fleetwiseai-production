import React, { useState } from 'react';
import { X, Package, Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { BACKEND_URL } from '../lib/config';

const PartsRequestModal = ({ isOpen, onClose, projectId, onSubmit }) => {
  const [parts, setParts] = useState([
    { part_number: '', description: '', quantity: 1, urgency: 'normal' }
  ]);
  const [notes, setNotes] = useState('');
  const [estimatedETA, setEstimatedETA] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const addPart = () => {
    setParts([...parts, { part_number: '', description: '', quantity: 1, urgency: 'normal' }]);
  };

  const removePart = (index) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePart = (index, field, value) => {
    const newParts = [...parts];
    newParts[index][field] = value;
    setParts(newParts);
  };

  const handleSubmit = async () => {
    // Validate at least one part with part number
    const validParts = parts.filter(p => p.part_number.trim());
    if (validParts.length === 0) {
      alert('Please add at least one part number');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/work-orders/${projectId}/parts-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          parts: validParts,
          notes,
          estimated_eta: estimatedETA || null
        })
      });

      if (!response.ok) throw new Error('Failed to submit parts request');

      alert('Parts request submitted successfully!');
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Error submitting parts request:', error);
      alert('Failed to submit parts request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-white mr-3" />
            <h2 className="text-xl font-bold text-white">Request Parts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Parts List */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Parts Needed *
              </label>
              <div className="space-y-3">
                {parts.map((part, index) => (
                  <div key={index} className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <Input
                        placeholder="Part Number"
                        value={part.part_number}
                        onChange={(e) => updatePart(index, 'part_number', e.target.value)}
                        className="col-span-3"
                      />
                      <Input
                        placeholder="Description"
                        value={part.description}
                        onChange={(e) => updatePart(index, 'description', e.target.value)}
                        className="col-span-5"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={part.quantity}
                        onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="col-span-2"
                        min="1"
                      />
                      <select
                        value={part.urgency}
                        onChange={(e) => updatePart(index, 'urgency', e.target.value)}
                        className="col-span-2 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    {parts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePart(index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPart}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another Part
              </Button>
            </div>

            {/* Estimated ETA */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Estimated ETA (optional)
              </label>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <Input
                  type="date"
                  value={estimatedETA}
                  onChange={(e) => setEstimatedETA(e.target.value)}
                  className="flex-1"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Additional Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any additional information about the parts request..."
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Submitting this request will:
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                <li>Alert the office to order these parts</li>
                <li>Move work order to "Waiting for Parts" status</li>
                <li>Track parts arrival for scheduling</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? 'Submitting...' : 'Submit Parts Request'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PartsRequestModal;
