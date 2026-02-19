import React, { useState, useEffect } from 'react';
import { partsAPI } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, Plus, Loader2, Package, X } from 'lucide-react';

const PartSelectorModal = ({ projectId, onClose, onSuccess }) => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'engine', label: 'Engine' },
    { value: 'transmission', label: 'Transmission' },
    { value: 'brakes', label: 'Brakes' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'emission', label: 'Emission' },
    { value: 'cooling', label: 'Cooling' },
    { value: 'fuel', label: 'Fuel' },
    { value: 'suspension', label: 'Suspension' },
    { value: 'drivetrain', label: 'Drivetrain' },
    { value: 'filters', label: 'Filters' },
    { value: 'fluids', label: 'Fluids' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchParts();
  }, [searchTerm, selectedCategory]);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      
      const response = await partsAPI.list(params);
      setParts(response.data);
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = async () => {
    if (!selectedPart) return;

    setAdding(true);
    try {
      await partsAPI.addToProject(projectId, selectedPart.id, quantity, notes);
      onSuccess();
    } catch (error) {
      console.error('Error adding part:', error);
      alert('Failed to add part to work order');
    } finally {
      setAdding(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      engine: 'bg-red-100 text-red-700',
      transmission: 'bg-blue-100 text-blue-700',
      brakes: 'bg-orange-100 text-orange-700',
      electrical: 'bg-yellow-100 text-yellow-700',
      emission: 'bg-green-100 text-green-700',
      cooling: 'bg-cyan-100 text-cyan-700',
      fuel: 'bg-purple-100 text-purple-700',
      filters: 'bg-pink-100 text-pink-700',
      fluids: 'bg-indigo-100 text-indigo-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center">
              <Package className="mr-2 h-6 w-6 text-[#289790]" />
              Add Parts to Work Order
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#289790]"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Parts List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
            </div>
          ) : parts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="mx-auto h-12 w-12 mb-4" />
              <p>No parts found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {parts.map((part) => (
                <div
                  key={part.id}
                  onClick={() => setSelectedPart(part)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPart?.id === part.id
                      ? 'border-[#289790] bg-[#289790] bg-opacity-5 ring-2 ring-[#289790]'
                      : 'border-gray-200 hover:border-[#289790] hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{part.name}</h3>
                        <Badge className={getCategoryColor(part.category)}>
                          {part.category}
                        </Badge>
                        {part.in_stock === 0 && (
                          <Badge variant="outline" className="border-red-500 text-red-700">
                            Out of Stock
                          </Badge>
                        )}
                        {part.reorder_point && part.in_stock <= part.reorder_point && part.in_stock > 0 && (
                          <Badge variant="outline" className="border-orange-500 text-orange-700">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-mono text-gray-600 mb-1">{part.part_number}</p>
                      {part.description && (
                        <p className="text-sm text-gray-600 mb-2">{part.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold text-green-600">
                          ${part.unit_price.toFixed(2)}
                        </span>
                        {part.manufacturer && (
                          <span className="text-gray-600">
                            {part.manufacturer}
                          </span>
                        )}
                        <span className={`font-medium ${
                          part.in_stock === 0 ? 'text-red-600' : 
                          part.reorder_point && part.in_stock <= part.reorder_point ? 'text-orange-600' : 
                          'text-green-600'
                        }`}>
                          Stock: {part.in_stock || 0}
                        </span>
                      </div>
                    </div>
                    {selectedPart?.id === part.id && (
                      <div className="ml-4 flex items-center">
                        <div className="w-6 h-6 rounded-full bg-[#289790] flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Part Details & Add Form */}
        {selectedPart && (
          <div className="p-6 border-t bg-gray-50">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Adding: {selectedPart.name}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <Input
                    type="text"
                    value={`$${selectedPart.unit_price.toFixed(2)}`}
                    disabled
                    className="w-full bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                  <Input
                    type="text"
                    value={`$${(selectedPart.unit_price * quantity).toFixed(2)}`}
                    disabled
                    className="w-full bg-gray-100 font-semibold"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <Input
                  type="text"
                  placeholder="e.g., Replace with OEM part"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={adding}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddPart}
                disabled={adding || selectedPart.in_stock < quantity}
                className="flex-1 bg-[#289790] hover:bg-[#1E7083]"
              >
                {adding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Work Order
                  </>
                )}
              </Button>
            </div>
            {selectedPart.in_stock < quantity && (
              <p className="text-sm text-red-600 mt-2 text-center">
                Insufficient stock. Only {selectedPart.in_stock} available.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartSelectorModal;
